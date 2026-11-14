"""
Normy referencyjne parametrow na podstawie specyfikacji Monitorowanie Zdrowia Astronautow v2
oraz danych stacyjnych HMS-of-A.

Kazdy parametr ma przedzialy [od, do] ze statusem: "norma", "uwaga", "alarm".
Moduly wizyjne i glosowe zostaly celowo pominiete w aktywnym zestawie cech.
Uwaga: brak emotek, brak nawiasow w opisach tekstowych, brak dlugich myslnikow.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

INF = math.inf
STATUSY = ("norma", "uwaga", "alarm")
RYZYKO = {"norma": 0.0, "uwaga": 50.0, "alarm": 100.0}


@dataclass
class Parametr:
    klucz: str
    nazwa: str
    jednostka: str
    obszar: str
    przedzialy: list
    format: str = "{:.1f}"
    zrodlo_progu: str = "arkusz specyfikacji"
    opis_norm: str = ""
    kierunek: str = ""

    @property
    def heurystyczny(self) -> bool:
        return "heurystyka" in self.zrodlo_progu

    def status(self, v: float) -> str | None:
        if v is None or not math.isfinite(v):
            return None
        for od, do, st in self.przedzialy:
            if od <= v < do:
                return st
        return "alarm"

    def fmt(self, v: float) -> str:
        return "--" if v is None or not math.isfinite(v) else self.format.format(v)


OBSZARY = {
    "srodowisko": "Srodowisko kabiny ECLSS",
    "kardio": "Uklad krazenia i oddech",
    "sen": "Sen i regeneracja",
    "stres": "Stres i obciazenie",
    "aktywnosc": "Aktywnosc i wydolnosc",
    "biochemia": "Biochemia potu",
    "poznawcze": "Funkcje poznawcze EEG",
}

_P = [
    # 1. Srodowisko kabiny ECLSS na bazie NASA OSDR EDA i limitow ISS
    Parametr(
        "temperatura_kabiny", "Temperatura w kabinie", "st. C", "srodowisko",
        [(-INF, 18.0, "alarm"), (18.0, 21.0, "uwaga"), (21.0, 25.5, "norma"), (25.5, 27.0, "uwaga"), (27.0, INF, "alarm")],
        opis_norm="21.0 - 25.5 st. C",
        zrodlo_progu="arkusz 22 - 24 st. C oraz dopuszczalny zakres ISS 18 - 27 st. C",
    ),
    Parametr(
        "wilgotnosc_kabiny", "Wilgotnosc wzgledna", "%", "srodowisko",
        [(-INF, 25.0, "alarm"), (25.0, 30.0, "uwaga"), (30.0, 60.0, "norma"), (60.0, 75.0, "uwaga"), (75.0, INF, "alarm")],
        format="{:.0f}", opis_norm="30 - 60 %",
        zrodlo_progu="zakres ISS 25 - 75 % z kontroli ECLSS",
    ),
    Parametr(
        "co2_kabiny", "Stezenie CO2 w kabinie", "ppm", "srodowisko",
        [(-INF, 3000.0, "norma"), (3000.0, 5300.0, "uwaga"), (5300.0, INF, "alarm")],
        format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="ponizej 3000 ppm",
        zrodlo_progu="typowe ISS 2000 - 3000 ppm, limit NASA 5300 ppm",
    ),
    Parametr(
        "cisnienie_kabiny", "Cisnienie powietrza", "kPa", "srodowisko",
        [(-INF, 95.0, "alarm"), (95.0, 99.0, "uwaga"), (99.0, 103.0, "norma"), (103.0, 105.0, "uwaga"), (105.0, INF, "alarm")],
        opis_norm="ok. 101 kPa",
    ),
    Parametr(
        "o2_kabiny", "Stezenie tlenu O2", "%", "srodowisko",
        [(-INF, 19.5, "alarm"), (19.5, 20.5, "uwaga"), (20.5, 22.0, "norma"), (22.0, 23.5, "uwaga"), (23.5, INF, "alarm")],
        opis_norm="20.5 - 22.0 %",
    ),
    Parametr(
        "promieniowanie_dobowe", "Dawka promieniowania dobowa", "mGy/d", "srodowisko",
        [(-INF, 1.0, "norma"), (1.0, 2.0, "uwaga"), (2.0, INF, "alarm")],
        format="{:.3f}", kierunek="wyzej_gorzej", opis_norm="ponizej 1.0 mGy/d",
        zrodlo_progu="typowe ISS 0.2 - 0.8 mGy/d, wyzej przy burzy slonecznej: heurystyka",
    ),

    # 2. Uklad krazenia, oddech i termoregulacja z czujnikow biometrycznych
    Parametr(
        "tetno", "Tetno spoczynkowe", "bpm", "kardio",
        [(-INF, 40.0, "alarm"), (40.0, 50.0, "uwaga"), (50.0, 80.5, "norma"), (80.5, 100.0, "uwaga"), (100.0, INF, "alarm")],
        format="{:.0f}", opis_norm="50 - 80 bpm",
    ),
    Parametr(
        "hrv_rmssd", "HRV RMSSD", "ms", "kardio",
        [(-INF, 25.0, "alarm"), (25.0, 45.0, "uwaga"), (45.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="45 - 80 ms",
    ),
    Parametr(
        "spo2", "Saturacja SpO2", "%", "kardio",
        [(-INF, 90.0, "alarm"), (90.0, 96.0, "uwaga"), (96.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="96 - 100 %",
    ),
    Parametr(
        "oddech", "Czestosc oddechu", "odd./min", "kardio",
        [(-INF, 8.0, "alarm"), (8.0, 12.0, "uwaga"), (12.0, 18.5, "norma"), (18.5, 24.0, "uwaga"), (24.0, INF, "alarm")],
        format="{:.0f}", opis_norm="12 - 18 odd./min",
    ),
    Parametr(
        "cisnienie_skurczowe", "Cisnienie skurczowe", "mmHg", "kardio",
        [(-INF, 90.0, "alarm"), (90.0, 100.0, "uwaga"), (100.0, 131.0, "norma"), (131.0, 145.0, "uwaga"), (145.0, INF, "alarm")],
        format="{:.0f}", opis_norm="100 - 130 mmHg",
    ),
    Parametr(
        "cisnienie_rozkurczowe", "Cisnienie rozkurczowe", "mmHg", "kardio",
        [(-INF, 55.0, "alarm"), (55.0, 65.0, "uwaga"), (65.0, 85.0, "norma"), (85.0, 93.0, "uwaga"), (93.0, INF, "alarm")],
        format="{:.0f}", opis_norm="65 - 84 mmHg",
    ),
    Parametr(
        "temperatura_ciala", "Temperatura powloki ciala", "st. C", "kardio",
        [(-INF, 35.5, "alarm"), (35.5, 36.2, "uwaga"), (36.2, 37.35, "norma"), (37.35, 37.8, "uwaga"), (37.8, INF, "alarm")],
        opis_norm="36.2 - 37.3 st. C",
    ),

    # 3. Sen, stres, aktywnosc, biochemia potu i funkcje poznawcze
    Parametr(
        "sen_godziny", "Czas snu", "godz.", "sen",
        [(-INF, 5.0, "alarm"), (5.0, 7.0, "uwaga"), (7.0, 10.0, "norma"), (10.0, INF, "uwaga")],
        kierunek="nizej_gorzej", opis_norm="7.0 - 9.0 godz.",
    ),
    Parametr(
        "sleep_score", "Ocena snu Sleep Score", "pkt", "sen",
        [(-INF, 60.0, "alarm"), (60.0, 80.0, "uwaga"), (80.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="powyzej 80 pkt",
    ),
    Parametr(
        "stres_opaska", "Poziom stresu", "pkt", "stres",
        [(-INF, 51.0, "norma"), (51.0, 76.0, "uwaga"), (76.0, INF, "alarm")],
        format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="0 - 50 pkt",
    ),
    Parametr(
        "body_battery", "Rezerwa Body Battery", "pkt", "aktywnosc",
        [(-INF, 25.0, "alarm"), (25.0, 50.0, "uwaga"), (50.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="powyzej 50 pkt",
    ),
    Parametr(
        "kortyzol_pot", "Kortyzol w pocie", "ng/ml", "biochemia",
        [(-INF, 6.5, "norma"), (6.5, 12.0, "uwaga"), (12.0, INF, "alarm")],
        opis_norm="ponizej 6.5 ng/ml",
        zrodlo_progu="kalibracja Bio-Patch oraz arkusz: heurystyka",
        kierunek="wyzej_gorzej",
    ),
    Parametr(
        "mleczany_pot", "Mleczany w pocie", "mmol/l", "biochemia",
        [(-INF, 2.5, "norma"), (2.5, 3.8, "uwaga"), (3.8, INF, "alarm")],
        opis_norm="ponizej 2.5 mmol/l",
        zrodlo_progu="heurystyka Bio-Patch",
        kierunek="wyzej_gorzej",
    ),
    Parametr(
        "gotowosc_poznawcza", "Gotowosc poznawcza EEG", "%", "poznawcze",
        [(-INF, 50.0, "alarm"), (50.0, 75.0, "uwaga"), (75.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="75 - 100 %",
    ),
]

PARAMETRY: dict[str, Parametr] = {p.klucz: p for p in _P}

Z_KAMERY: set[str] = set()

# Wspolny wektor 11 aktywnych cech telemetrycznych i srodowiskowych dla sieci anomalii
CECHY_ANOMALII = [
    "tetno",
    "hrv_rmssd",
    "spo2",
    "oddech",
    "cisnienie_skurczowe",
    "temperatura_ciala",
    "stres_opaska",
    "body_battery",
    "co2_kabiny",
    "temperatura_kabiny",
    "wilgotnosc_kabiny",
]


def ocen(klucz: str, wartosc: float) -> dict:
    p = PARAMETRY.get(klucz)
    st = p.status(wartosc) if p else None
    return {"status": st, "ryzyko": RYZYKO.get(st)}
