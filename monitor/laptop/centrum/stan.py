"""
Centrum danych: przyjmuje pomiary z dowolnych źródeł, ocenia je normami, liczy indeksy obszarów,
pilnuje alertów, uruchamia sieć anomalii i składa "migawkę" stanu dla panelu i raportu.

Format pomiaru (JSON):  {"parametr": "co2_kabiny", "wartosc": 2650, "zrodlo": "ECLSS/OSDR RR-1",
                         "czas": 1731590000.0 (opcjonalnie, epoka), "czas_danych": "2014-09-20T03:59:00Z" (opcjonalnie)}
"""
from __future__ import annotations

import collections
import csv
import math
import pathlib
import threading
import time

import numpy as np

from . import anomalie as A
from . import odchylenia as O
from .baza_osobista import BazaOsobista
from . import normy as N
from . import raport as R

SWIEZOSC_S = 120          # pomiar starszy niż tyle sekund nie liczy się do bieżącego stanu
PROG_ANOMALII = 90
UTRZYMANIE_S = 20         # nowy status musi trwać tyle sekund, zanim powstanie alert (powrót do normy: 2x)
PROG_PEWNOSCI = 0.4       # parametry z pewnością poniżej progu są pokazywane, ale nie wchodzą do oceny
TAU_OGOLNY = 120.0        # stała czasowa wygładzania stanu ogólnego [s]
HISTEREZA = 4.0           # o ile punktów trzeba przekroczyć próg, żeby zmienić status ogólny


def _status_z_histereza(i, poprz):
    """Status z histerezą: zmiana dopiero po przekroczeniu progu (75 / 45) o HISTEREZA punktów."""
    nowy = _status_indeksu(i)
    if poprz is None or nowy == poprz:
        return nowy
    progi = {("norma", "uwaga"): 75, ("uwaga", "norma"): 75, ("uwaga", "alarm"): 45, ("alarm", "uwaga"): 45,
             ("norma", "alarm"): 45, ("alarm", "norma"): 75}
    prog = progi[(poprz, nowy)]
    return nowy if abs(i - prog) >= HISTEREZA else poprz


def _status_indeksu(i):
    if i is None:
        return None
    return "norma" if i >= 75 else "uwaga" if i >= 45 else "alarm"


class Centrum:
    def __init__(self, katalog: pathlib.Path, plik_sieci: pathlib.Path):
        self.katalog = pathlib.Path(katalog)
        self.katalog.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.ostatnie: dict[str, dict] = {}
        self.historia: dict[str, collections.deque] = collections.defaultdict(lambda: collections.deque(maxlen=3600))
        self.alerty: collections.deque = collections.deque(maxlen=50)
        self.anomalia_hist: collections.deque = collections.deque(maxlen=3600)
        self.plik_sieci = pathlib.Path(plik_sieci)
        self.anom = A.wczytaj_lub_baza(self.plik_sieci, N.CECHY_ANOMALII)
        self.anomalia = {"wynik": None, "metoda": "kalibracja", "wklady": {}}
        self._ostatni_status: dict[str, str] = {}
        self._kandydat: dict[str, tuple] = {}
        self.ogolny_gl: float | None = None
        self.status_gl: str | None = None
        self._t_gl: float | None = None
        self.ogolny_hist: collections.deque = collections.deque(maxlen=3600)
        self.baza = BazaOsobista(self.katalog / "baza_osobista.json")
        sciezka_logu = self.katalog / "historia_pomiarow.csv"
        nowy = not sciezka_logu.exists()
        self._flog = open(sciezka_logu, "a", newline="", encoding="utf-8")
        self._log = csv.writer(self._flog)
        if nowy:
            self._log.writerow(["czas", "zrodlo", "parametr", "wartosc"])

    # ------------------------------------------------------------------ wejście
    def dodaj(self, pomiary: list[dict]) -> int:
        ok = 0
        with self.lock:
            for p in pomiary:
                try:
                    k = str(p["parametr"])
                    v = float(p["wartosc"])
                except (KeyError, TypeError, ValueError):
                    continue
                if not math.isfinite(v):
                    continue
                t = float(p.get("czas") or time.time())
                zr = str(p.get("zrodlo", "?"))[:60]
                self.ostatnie[k] = {"t": t, "v": v, "zrodlo": zr, "czas_danych": p.get("czas_danych")}
                self.historia[k].append((t, v))
                self._log.writerow([f"{t:.1f}", zr, k, f"{v:.6g}"])
                self._sprawdz_alert(k, v, t)
                ok += 1
            self._flog.flush()
        return ok

    def _sprawdz_alert(self, k, v, t):
        """Alert tylko po utrzymaniu się nowego statusu przez UTRZYMANIE_S (bez migania wokół progu)."""
        par = N.PARAMETRY.get(k)
        if not par:
            return
        st = par.status(v)
        potw = self._ostatni_status.get(k)                 # ostatni potwierdzony status
        if potw is None:                                   # pierwszy pomiar: od razu stan wyjściowy
            self._ostatni_status[k] = st
            if st in ("uwaga", "alarm"):
                self.alerty.appendleft({"t": t, "poziom": st, "tekst":
                                        f"{par.nazwa}: {par.fmt(v)} {par.jednostka} (norma: {par.opis_norm or '—'})"})
            return
        kand, od = self._kandydat.get(k, (None, t))
        if st == potw:
            self._kandydat.pop(k, None)
            return
        if st != kand:
            self._kandydat[k] = (st, t)
            return
        wymagane = UTRZYMANIE_S * (2 if st == "norma" else 1)
        if t - od < wymagane:
            return
        self._ostatni_status[k] = st
        self._kandydat.pop(k, None)
        if st in ("uwaga", "alarm"):
            self.alerty.appendleft({"t": t, "poziom": st, "tekst":
                                    f"{par.nazwa}: {par.fmt(v)} {par.jednostka} (norma: {par.opis_norm or '—'})"})
        elif potw in ("uwaga", "alarm") and st == "norma":
            self.alerty.appendleft({"t": t, "poziom": "info", "tekst": f"{par.nazwa} wrócił(a) do normy"})

    # ------------------------------------------------------------------ bieżący stan
    def wartosci(self, teraz=None) -> dict:
        teraz = teraz or time.time()
        with self.lock:
            return {k: o["v"] for k, o in self.ostatnie.items() if teraz - o["t"] <= SWIEZOSC_S}

    def _trend(self, k, teraz):
        h = self.historia.get(k)
        if not h or len(h) < 10:
            return None
        a = np.array(h)
        now = a[a[:, 0] > teraz - 300, 1]
        przed = a[(a[:, 0] <= teraz - 300) & (a[:, 0] > teraz - 900), 1]
        if len(now) < 3 or len(przed) < 3:
            return None
        sd = max(np.std(a[:, 1]), 1e-6)
        d = (now.mean() - przed.mean()) / sd
        return "rośnie" if d > 0.5 else "spada" if d < -0.5 else "stabilnie"

    # ------------------------------------------------------------------ pewność danych
    def _pewnosc(self, k: str, st: dict) -> float:
        """0-1: na ile można ufać parametrowi. Kamera zależy od jakości obrazu z ostatnich 10 s."""
        if k in N.Z_KAMERY:
            q = st.get("jakosc_kamery")
            return 1.0 if q is None else float(np.clip(q / 100.0, 0.0, 1.0))
        return 1.0

    def _ocena(self, teraz: float) -> dict:
        st = self.wartosci(teraz)
        parametry = []
        for k, v in st.items():
            par = N.PARAMETRY.get(k)
            if not par:
                continue
            pw = self._pewnosc(k, st)
            h = list(self.historia[k])[-240:]
            parametry.append({
                "klucz": k, "nazwa": par.nazwa, "obszar": par.obszar, "wartosc": v, "tekst": par.fmt(v),
                "jednostka": par.jednostka, "status": par.status(v), "norma": par.opis_norm,
                "pewnosc": pw, "niepewny": pw < PROG_PEWNOSCI,
                "zrodlo": self.ostatnie[k]["zrodlo"], "czas_danych": self.ostatnie[k].get("czas_danych"),
                "trend": self._trend(k, teraz), "historia": [[round(t - teraz, 1), x] for t, x in h],
            })
        obszary = {}
        for ob, nazwa in N.OBSZARY.items():
            ps = [p for p in parametry if p["obszar"] == ob and not p["niepewny"]]
            if ps:
                # waga = pewność danych x (0,5 dla progów heurystycznych, 1 dla norm z arkusza)
                wagi = [p["pewnosc"] * (0.5 if N.PARAMETRY[p["klucz"]].heurystyczny else 1.0) for p in ps]
                r = [N.RYZYKO[p["status"]] * (0.5 if N.PARAMETRY[p["klucz"]].heurystyczny else 1.0) for p in ps]
                ind = 100 - (0.6 * float(np.dot(r, wagi) / np.sum(wagi)) + 0.4 * max(r))
                pw = float(np.mean([p["pewnosc"] for p in ps]))
            else:
                ind, pw = None, 0.0
            n_niep = sum(1 for p in parametry if p["obszar"] == ob and p["niepewny"])
            obszary[ob] = {"nazwa": nazwa, "indeks": ind, "status": _status_indeksu(ind), "liczba": len(ps),
                           "pewnosc": pw, "niepewne": n_niep}
        odchylenia = O.analizuj(parametry, self.baza, self.anomalia.get("reszty", {}) or {})
        for od in odchylenia:
            ob = obszary[od["obszar"]]
            ob["odchylenie"] = od["wynik"]
            ob["odchylony"] = od["odchylony"]
            if ob["indeks"] is not None:
                # norma referencyjna ma pierwszeństwo; odchylenie od normy osobistej obniża indeks łagodniej
                ob["indeks"] = min(ob["indeks"], 100 - 0.6 * od["wynik"])
                ob["status"] = _status_indeksu(ob["indeks"])
        ind_ob = [o["indeks"] for o in obszary.values() if o["indeks"] is not None]
        ogolny = 0.75 * float(np.mean(ind_ob)) + 0.25 * min(ind_ob) if ind_ob else None
        # twardy alarm: norma z arkusza mierzona czujnikiem (nie kamerą/głosem, nie heurystyka)
        twardy_alarm = any(p["status"] == "alarm" and not p["niepewny"] and not N.PARAMETRY[p["klucz"]].heurystyczny
                           and p["klucz"] not in N.Z_KAMERY for p in parametry)
        if ogolny is not None and twardy_alarm:
            ogolny = min(ogolny, 44.0)    # twardy ALARM z normy arkusza zawsze widoczny w stanie ogólnym
        # pewność oceny ogólnej: jakość danych x pokrycie (ile z 3 dziś możliwych obszarów ma dane)
        z_danymi = [o for o in obszary.values() if o["indeks"] is not None]
        pokrycie = min(1.0, len(z_danymi) / 3.0)
        pewnosc = float(np.mean([o["pewnosc"] for o in z_danymi])) * pokrycie if z_danymi else 0.0
        jakosc = {k: st.get(k) for k in ("jakosc_kamery", "obecnosc_twarzy", "jasnosc_twarzy")}
        return {"st": st, "parametry": parametry, "obszary": obszary, "ogolny": ogolny, "odchylenia": odchylenia,
                "twardy_alarm": twardy_alarm, "pewnosc": pewnosc, "pokrycie": pokrycie, "jakosc": jakosc}

    # ------------------------------------------------------------------ co 2 s
    def krok(self):
        """Aktualizuje wygładzony stan ogólny (z histerezą) i ocenę anomalii."""
        teraz = time.time()
        o = self._ocena(teraz)
        do_anomalii = {k: v for k, v in o["st"].items() if self._pewnosc(k, o["st"]) >= PROG_PEWNOSCI}
        with self.lock:
            for p in o["parametry"]:
                if p["status"] == "norma" and not p["niepewny"]:
                    self.baza.aktualizuj(p["klucz"], p["wartosc"])
            # wygładzanie wykładnicze (stała czasowa TAU_OGOLNY), szybciej przy twardym alarmie
            if o["ogolny"] is None:
                self.ogolny_gl = None
            else:
                dt = teraz - (self._t_gl or teraz)
                tau = 10.0 if o["twardy_alarm"] else TAU_OGOLNY
                a = 1.0 if self.ogolny_gl is None else 1 - np.exp(-max(dt, 0) / tau)
                self.ogolny_gl = o["ogolny"] if self.ogolny_gl is None else self.ogolny_gl + a * (o["ogolny"] - self.ogolny_gl)
                self.status_gl = _status_z_histereza(self.ogolny_gl, self.status_gl)
                self.ogolny_hist.append((teraz, self.ogolny_gl))
            self._t_gl = teraz

            if isinstance(self.anom, A.BazaOnline):
                self.anom.dodaj(do_anomalii)
            self.anomalia = self.anom.ocen(do_anomalii)
            w = self.anomalia.get("wynik")
            if w is not None:
                self.anomalia_hist.append((teraz, w))
                if w >= PROG_ANOMALII and not any(a.get("anomalia") and teraz - a["t"] < 300 for a in self.alerty):
                    top = sorted(self.anomalia["wklady"].items(), key=lambda x: -x[1])[:3]
                    nazwy = ", ".join(N.PARAMETRY[c].nazwa for c, _ in top if c in N.PARAMETRY)
                    self.alerty.appendleft({"t": teraz, "poziom": "uwaga", "anomalia": True,
                                            "tekst": f"Nietypowy stan (anomalia {w:.0f}/100): {nazwy}"})

    def migawka(self) -> dict:
        teraz = time.time()
        o = self._ocena(teraz)
        with self.lock:
            an = dict(self.anomalia)
            an["top"] = [{"nazwa": N.PARAMETRY[c].nazwa, "udzial": w}
                         for c, w in sorted(an.get("wklady", {}).items(), key=lambda x: -x[1])[:4] if c in N.PARAMETRY]
            an.pop("wklady", None)
            an["historia"] = [[round(t - teraz, 1), w] for t, w in list(self.anomalia_hist)[-240:]]
            status_og = self.status_gl if self.ogolny_gl is not None else None
            if status_og == "norma" and (an.get("wynik") or 0) >= 95:
                status_og = "uwaga"
            m = {
                "czas": teraz,
                "ogolny": {"indeks": self.ogolny_gl, "status": status_og, "chwilowy": o["ogolny"],
                           "pewnosc": o["pewnosc"], "pokrycie": o["pokrycie"],
                           "historia": [[round(t - teraz, 1), v] for t, v in list(self.ogolny_hist)[-450:]]},
                "jakosc": o["jakosc"],
                "obszary": o["obszary"], "parametry": sorted(o["parametry"], key=lambda p: (p["obszar"], p["nazwa"])),
                "odchylenia": o["odchylenia"],
                "baza_postep": self.baza.postep([p["klucz"] for p in o["parametry"]]),
                "anomalia": an, "alerty": list(self.alerty)[:15],
            }
        m["raport"] = R.generuj(m)
        return m

    def zamknij(self):
        self.baza.zapisz()
        self._flog.close()
