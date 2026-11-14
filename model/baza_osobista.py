"""
Osobista norma kazdego parametru: typowa wartosc i zmiennosc u danej osoby oraz w kabinie.

Statystyki sa wykladniczo wazone, aktualizowane tylko wtedy,
gdy parametr miesci sie w normie referencyjnej i dane sa pewne,
zeby baza nie przyzwyczaila sie do stanu alarmowego.
"""
from __future__ import annotations

import json
import math
import pathlib
import time

OKNO_PROBEK = 1800
MIN_PROBEK = 60
MIN_SD = {
    "co2_kabiny": 80.0,
    "temperatura_kabiny": 0.3,
    "wilgotnosc_kabiny": 2.0,
    "cisnienie_kabiny": 0.3,
    "o2_kabiny": 0.2,
    "promieniowanie_dobowe": 0.03,
    "tetno": 3.0,
    "hrv_rmssd": 5.0,
    "spo2": 0.7,
    "oddech": 1.0,
    "cisnienie_skurczowe": 5.0,
    "cisnienie_rozkurczowe": 4.0,
    "temperatura_ciala": 0.2,
    "sen_godziny": 0.4,
    "sleep_score": 4.0,
    "stres_opaska": 5.0,
    "body_battery": 5.0,
    "kortyzol_pot": 0.8,
    "mleczany_pot": 0.35,
    "gotowosc_poznawcza": 4.0,
}


class BazaOsobista:
    def __init__(self, sciezka: pathlib.Path):
        self.sciezka = pathlib.Path(sciezka)
        self.sciezka.parent.mkdir(parents=True, exist_ok=True)
        self.st: dict[str, dict] = {}
        self._zapis = 0.0
        if self.sciezka.exists():
            try:
                self.st = json.loads(self.sciezka.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                self.st = {}

    def aktualizuj(self, k: str, v: float):
        s = self.st.setdefault(k, {"n": 0, "sr": float(v), "war": 0.0})
        s["n"] += 1
        a = max(1.0 / s["n"], 1.0 / OKNO_PROBEK)
        d = v - s["sr"]
        s["sr"] += a * d
        s["war"] = (1.0 - a) * (s["war"] + a * d * d)
        if time.time() - self._zapis > 60:
            self.zapisz()

    def zasiej_jezeli_puste(self, k: str, sr: float, war: float = 0.0, n: int = MIN_PROBEK):
        if k not in self.st or self.st[k].get("n", 0) < MIN_PROBEK:
            self.st[k] = {"n": int(n), "sr": float(sr), "war": float(war)}

    def gotowa(self, k: str) -> bool:
        return self.st.get(k, {}).get("n", 0) >= MIN_PROBEK

    def z(self, k: str, v: float) -> float | None:
        if not self.gotowa(k):
            return None
        s = self.st[k]
        sd = max(math.sqrt(max(s["war"], 0.0)), MIN_SD.get(k, 1e-3 + 0.05 * abs(s["sr"])))
        return (v - s["sr"]) / sd

    def typowa(self, k: str) -> float | None:
        return self.st[k]["sr"] if self.gotowa(k) else None

    def postep(self, klucze) -> float:
        ks = [k for k in klucze]
        if not ks:
            return 0.0
        return sum(min(1.0, self.st.get(k, {}).get("n", 0) / MIN_PROBEK) for k in ks) / len(ks)

    def zapisz(self):
        self._zapis = time.time()
        try:
            self.sciezka.parent.mkdir(parents=True, exist_ok=True)
            self.sciezka.write_text(json.dumps(self.st), encoding="utf-8")
        except OSError:
            pass
