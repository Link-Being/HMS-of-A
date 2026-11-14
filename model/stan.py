"""
Centrum modelu podsumowujacego: przyjmuje pomiary z sensorow i ECLSS,
ocenia je normami referencyjnymi oraz osobistymi, liczy indeksy obszarow,
uruchamia autoenkoder anomalii, pilnuje alertow bez migania oraz generuje raport.
"""
from __future__ import annotations

import collections
import csv
import math
import pathlib
import threading
import time

from . import anomalie as A
from . import normy as N
from . import odchylenia as O
from . import raport as R
from .baza_osobista import BazaOsobista

SWIEZOSC_S = 180
PROG_ANOMALII = 90.0
UTRZYMANIE_S = 10.0
PROG_PEWNOSCI = 0.4
TAU_OGOLNY = 25.0
HISTEREZA = 3.0


def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _std(vals: list[float]) -> float:
    if len(vals) < 2:
        return 0.0
    m = _mean(vals)
    return math.sqrt(sum((x - m) ** 2 for x in vals) / len(vals))


def _status_indeksu(i: float | None) -> str | None:
    if i is None:
        return None
    return "norma" if i >= 75.0 else "uwaga" if i >= 45.0 else "alarm"


def _status_z_histereza(i: float | None, poprz: str | None) -> str | None:
    nowy = _status_indeksu(i)
    if poprz is None or nowy == poprz:
        return nowy
    progi = {
        ("norma", "uwaga"): 75.0,
        ("uwaga", "norma"): 75.0,
        ("uwaga", "alarm"): 45.0,
        ("alarm", "uwaga"): 45.0,
        ("norma", "alarm"): 45.0,
        ("alarm", "norma"): 75.0,
    }
    prog = progi[(poprz, nowy)]
    return nowy if abs(i - prog) >= HISTEREZA else poprz


def status_na_ui(status_modelu: str | None) -> str:
    if status_modelu == "alarm":
        return "critical"
    if status_modelu == "uwaga":
        return "warning"
    return "normal"


def status_z_ui(status_ui: str | None) -> str:
    if status_ui == "critical":
        return "alarm"
    if status_ui == "warning":
        return "uwaga"
    return "norma"


class Centrum:
    def __init__(self, katalog: pathlib.Path, plik_sieci: pathlib.Path,
                 sciezka_logu: pathlib.Path | None = None, loguj_csv: bool = True):
        self.katalog = pathlib.Path(katalog)
        self.katalog.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.ostatnie: dict[str, dict] = {}
        self.historia: dict[str, collections.deque] = collections.defaultdict(lambda: collections.deque(maxlen=3600))
        self.alerty: collections.deque = collections.deque(maxlen=50)
        self.anomalia_hist: collections.deque = collections.deque(maxlen=3600)
        self.plik_sieci = pathlib.Path(plik_sieci)
        self.anom = A.wczytaj_lub_baza(self.plik_sieci, N.CECHY_ANOMALII)
        self.anomalia = {"wynik": None, "metoda": "kalibracja", "wklady": {}, "reszty": {}}
        self._ostatni_status: dict[str, str] = {}
        self._kandydat: dict[str, tuple] = {}
        self.ogolny_gl: float | None = None
        self.status_gl: str | None = None
        self._t_gl: float | None = None
        self.ogolny_hist: collections.deque = collections.deque(maxlen=3600)
        self.baza = BazaOsobista(self.katalog / "baza_osobista.json")
        self._loguj_csv = bool(loguj_csv)
        self._flog = None
        self._log = None
        if self._loguj_csv:
            log_path = pathlib.Path(sciezka_logu) if sciezka_logu else (self.katalog / "historia_pomiarow.csv")
            log_path.parent.mkdir(parents=True, exist_ok=True)
            nowy = not log_path.exists()
            self._flog = open(log_path, "a", newline="", encoding="utf-8")
            self._log = csv.writer(self._flog)
            if nowy:
                self._log.writerow(["czas", "zrodlo", "parametr", "wartosc"])

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
                zr = str(p.get("zrodlo", "HMS-of-A"))[:60]
                self.ostatnie[k] = {"t": t, "v": v, "zrodlo": zr, "czas_danych": p.get("czas_danych")}
                self.historia[k].append((t, v))
                if self._log is not None:
                    self._log.writerow([f"{t:.1f}", zr, k, f"{v:.6g}"])
                self._sprawdz_alert(k, v, t)
                ok += 1
            if self._flog is not None:
                self._flog.flush()
        return ok

    def _sprawdz_alert(self, k: str, v: float, t: float):
        par = N.PARAMETRY.get(k)
        if not par:
            return
        st = par.status(v)
        potw = self._ostatni_status.get(k)
        if potw is None:
            self._ostatni_status[k] = st
            if st in ("uwaga", "alarm"):
                norma_txt = par.opis_norm or "brak"
                self.alerty.appendleft({
                    "t": t,
                    "poziom": st,
                    "tekst": f"{par.nazwa}: {par.fmt(v)} {par.jednostka}, norma: {norma_txt}",
                })
            return
        kand, od = self._kandydat.get(k, (None, t))
        if st == potw:
            self._kandydat.pop(k, None)
            return
        if st != kand:
            self._kandydat[k] = (st, t)
            return
        wymagane = UTRZYMANIE_S * (2.0 if st == "norma" else 1.0)
        if t - od < wymagane:
            return
        self._ostatni_status[k] = st
        self._kandydat.pop(k, None)
        if st in ("uwaga", "alarm"):
            norma_txt = par.opis_norm or "brak"
            self.alerty.appendleft({
                "t": t,
                "poziom": st,
                "tekst": f"{par.nazwa}: {par.fmt(v)} {par.jednostka}, norma: {norma_txt}",
            })
        elif potw in ("uwaga", "alarm") and st == "norma":
            self.alerty.appendleft({
                "t": t,
                "poziom": "info",
                "tekst": f"{par.nazwa} powrot do normy",
            })

    def wartosci(self, teraz: float | None = None) -> dict[str, float]:
        teraz = teraz or time.time()
        with self.lock:
            return {k: o["v"] for k, o in self.ostatnie.items() if teraz - o["t"] <= SWIEZOSC_S}

    def _trend(self, k: str, teraz: float) -> str | None:
        h = self.historia.get(k)
        if not h or len(h) < 6:
            return None
        items = list(h)
        now = [val for ts, val in items if ts > teraz - 300.0]
        przed = [val for ts, val in items if teraz - 900.0 < ts <= teraz - 300.0]
        if len(now) < 3 or len(przed) < 3:
            mid = len(items) // 2
            przed = [val for _, val in items[:mid]]
            now = [val for _, val in items[mid:]]
        if len(now) < 3 or len(przed) < 3:
            return None
        sd = max(_std([val for _, val in items]), 1e-6)
        d = (_mean(now) - _mean(przed)) / sd
        return "rosnie" if d > 0.5 else "spada" if d < -0.5 else "stabilnie"

    def _pewnosc(self, k: str, st: dict) -> float:
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
                "klucz": k,
                "nazwa": par.nazwa,
                "obszar": par.obszar,
                "wartosc": float(v),
                "tekst": par.fmt(v),
                "jednostka": par.jednostka,
                "status": par.status(v),
                "norma": par.opis_norm,
                "pewnosc": pw,
                "niepewny": pw < PROG_PEWNOSCI,
                "zrodlo": self.ostatnie[k]["zrodlo"],
                "czas_danych": self.ostatnie[k].get("czas_danych"),
                "trend": self._trend(k, teraz),
                "historia": [[round(ts - teraz, 1), float(val)] for ts, val in h],
            })

        obszary = {}
        for ob, nazwa in N.OBSZARY.items():
            ps = [p for p in parametry if p["obszar"] == ob and not p["niepewny"]]
            if ps:
                wagi = [p["pewnosc"] * (0.5 if N.PARAMETRY[p["klucz"]].heurystyczny else 1.0) for p in ps]
                r = [N.RYZYKO[p["status"]] * (0.5 if N.PARAMETRY[p["klucz"]].heurystyczny else 1.0) for p in ps]
                suma_wagi = sum(wagi)
                w_avg = sum(rv * wv for rv, wv in zip(r, wagi)) / suma_wagi if suma_wagi > 0 else 0.0
                ind = 100.0 - (0.6 * w_avg + 0.4 * max(r))
                pw = _mean([p["pewnosc"] for p in ps])
            else:
                ind, pw = None, 0.0
            n_niep = sum(1 for p in parametry if p["obszar"] == ob and p["niepewny"])
            obszary[ob] = {
                "nazwa": nazwa,
                "indeks": round(float(ind), 1) if ind is not None else None,
                "status": _status_indeksu(ind),
                "liczba": len(ps),
                "pewnosc": pw,
                "niepewne": n_niep,
            }

        odchylenia = O.analizuj(parametry, self.baza, self.anomalia.get("reszty", {}) or {})
        for od in odchylenia:
            ob = obszary[od["obszar"]]
            ob["odchylenie"] = od["wynik"]
            ob["odchylony"] = od["odchylony"]
            if ob["indeks"] is not None:
                ob["indeks"] = round(min(ob["indeks"], 100.0 - 0.6 * od["wynik"]), 1)
                ob["status"] = _status_indeksu(ob["indeks"])

        ind_ob = [o["indeks"] for o in obszary.values() if o["indeks"] is not None]
        ogolny = (0.75 * _mean(ind_ob) + 0.25 * min(ind_ob)) if ind_ob else None

        twardy_alarm = any(
            p["status"] == "alarm" and not p["niepewny"] and not N.PARAMETRY[p["klucz"]].heurystyczny
            for p in parametry
        )
        twarda_uwaga = any(
            p["status"] in ("uwaga", "alarm") and not p["niepewny"] and not N.PARAMETRY[p["klucz"]].heurystyczny
            for p in parametry
        )
        if ogolny is not None and twardy_alarm:
            ogolny = min(ogolny, 44.0)
        elif ogolny is not None and twarda_uwaga:
            ogolny = min(ogolny, 74.0)

        z_danymi = [o for o in obszary.values() if o["indeks"] is not None]
        pokrycie = min(1.0, len(z_danymi) / max(len(N.OBSZARY), 1))
        pewnosc = _mean([o["pewnosc"] for o in z_danymi]) * pokrycie if z_danymi else 0.0
        return {
            "st": st,
            "parametry": parametry,
            "obszary": obszary,
            "ogolny": round(float(ogolny), 1) if ogolny is not None else None,
            "odchylenia": odchylenia,
            "twardy_alarm": twardy_alarm,
            "twarda_uwaga": twarda_uwaga,
            "pewnosc": pewnosc,
            "pokrycie": pokrycie,
        }

    def krok(self, natychmiast: bool = False):
        teraz = time.time()
        o = self._ocena(teraz)
        do_anomalii = {k: v for k, v in o["st"].items() if self._pewnosc(k, o["st"]) >= PROG_PEWNOSCI}
        with self.lock:
            for p in o["parametry"]:
                if p["status"] == "norma" and not p["niepewny"]:
                    self.baza.aktualizuj(p["klucz"], p["wartosc"])

            if o["ogolny"] is None:
                self.ogolny_gl = None
            else:
                if natychmiast or self.ogolny_gl is None:
                    self.ogolny_gl = float(o["ogolny"])
                    self.status_gl = _status_indeksu(self.ogolny_gl)
                else:
                    dt = max(teraz - (self._t_gl or teraz), 0.0)
                    tau = 6.0 if o["twardy_alarm"] else TAU_OGOLNY
                    a = 1.0 - math.exp(-dt / tau)
                    self.ogolny_gl = self.ogolny_gl + a * (o["ogolny"] - self.ogolny_gl)
                    self.status_gl = _status_z_histereza(self.ogolny_gl, self.status_gl)
                self.ogolny_hist.append((teraz, round(float(self.ogolny_gl), 1)))
            self._t_gl = teraz

            if isinstance(self.anom, A.BazaOnline):
                self.anom.dodaj(do_anomalii)
            self.anomalia = self.anom.ocen(do_anomalii)
            w = self.anomalia.get("wynik")
            if w is not None:
                self.anomalia_hist.append((teraz, float(w)))
                if w >= PROG_ANOMALII and not any(a.get("anomalia") and teraz - a["t"] < 300.0 for a in self.alerty):
                    top = sorted(self.anomalia["wklady"].items(), key=lambda x: -x[1])[:3]
                    nazwy = ", ".join(N.PARAMETRY[c].nazwa for c, _ in top if c in N.PARAMETRY)
                    self.alerty.appendleft({
                        "t": teraz,
                        "poziom": "uwaga",
                        "anomalia": True,
                        "tekst": f"Nietypowy stan : anomalia {w:.0f}/100 : {nazwy}",
                    })

    def migawka(self) -> dict:
        teraz = time.time()
        o = self._ocena(teraz)
        with self.lock:
            an = {
                "wynik": self.anomalia.get("wynik"),
                "blad": self.anomalia.get("blad"),
                "metoda": self.anomalia.get("metoda"),
                "postep": self.anomalia.get("postep"),
            }
            an["top"] = [
                {"klucz": c, "nazwa": N.PARAMETRY[c].nazwa, "udzial": round(float(w), 3)}
                for c, w in sorted(self.anomalia.get("wklady", {}).items(), key=lambda x: -x[1])[:4]
                if c in N.PARAMETRY
            ]
            an["historia"] = [[round(ts - teraz, 1), val] for ts, val in list(self.anomalia_hist)[-60:]]
            status_og = self.status_gl if self.ogolny_gl is not None else None
            if status_og == "norma" and (an.get("wynik") or 0.0) >= 95.0:
                status_og = "uwaga"
            indeks_val = round(float(self.ogolny_gl), 1) if self.ogolny_gl is not None else None
            m = {
                "czas": teraz,
                "ogolny": {
                    "indeks": indeks_val,
                    "status": status_og,
                    "chwilowy": o["ogolny"],
                    "pewnosc": round(float(o["pewnosc"]), 3),
                    "pokrycie": round(float(o["pokrycie"]), 3),
                    "historia": [[round(ts - teraz, 1), val] for ts, val in list(self.ogolny_hist)[-60:]],
                },
                "obszary": o["obszary"],
                "parametry": sorted(o["parametry"], key=lambda p: (p["obszar"], p["nazwa"])),
                "odchylenia": o["odchylenia"],
                "baza_postep": round(float(self.baza.postep([p["klucz"] for p in o["parametry"]])), 3),
                "anomalia": an,
                "alerty": list(self.alerty)[:15],
            }
        m["raport"] = R.generuj(m)
        return m

    def zamknij(self):
        self.baza.zapisz()
        if self._flog is not None:
            self._flog.close()
