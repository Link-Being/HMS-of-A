"""
Osobista norma każdego parametru: typowa wartość i zmienność u TEJ osoby / w TEJ kabinie.

Statystyki są wykładniczo ważone (efektywne okno ok. OKNO_PROBEK pomiarów), aktualizowane tylko
wtedy, gdy parametr mieści się w normie referencyjnej i dane są pewne, żeby baza nie "przyzwyczaiła się"
do złego stanu. Zapis na dysk co minutę (same liczby), więc baza przetrwa restart.
"""
from __future__ import annotations

import json
import math
import pathlib
import time

OKNO_PROBEK = 1800        # ~1 h przy pomiarze co 2 s
MIN_PROBEK = 150          # ~5 min, zanim baza danego parametru zacznie działać
MIN_SD = {                # dolne ograniczenie zmienności, żeby szum pomiaru nie dawał ogromnych z-score
    "co2_kabiny": 80.0, "temperatura_kabiny": 0.3, "wilgotnosc_kabiny": 2.0, "promieniowanie_dobowe": 0.03,
    "zmeczenie": 5.0, "perclos": 1.0, "mrugniecia_min": 2.0, "ziewniecia_min": 0.3, "zmeczenie_glos": 5.0,
    "negatywne_twarz": 6.0, "negatywne_glos": 6.0, "napiecie_glos": 5.0, "tetno": 3.0, "hrv_rmssd": 5.0,
    "spo2": 0.7, "oddech": 1.0,
}


class BazaOsobista:
    def __init__(self, sciezka: pathlib.Path):
        self.sciezka = pathlib.Path(sciezka)
        self.st: dict[str, dict] = {}
        self._zapis = 0.0
        if self.sciezka.exists():
            try:
                self.st = json.loads(self.sciezka.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                self.st = {}

    def aktualizuj(self, k: str, v: float):
        s = self.st.setdefault(k, {"n": 0, "sr": v, "war": 0.0})
        s["n"] += 1
        a = max(1.0 / s["n"], 1.0 / OKNO_PROBEK)
        d = v - s["sr"]
        s["sr"] += a * d
        s["war"] = (1 - a) * (s["war"] + a * d * d)
        if time.time() - self._zapis > 60:
            self.zapisz()

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
            self.sciezka.write_text(json.dumps(self.st), encoding="utf-8")
        except OSError:
            pass
