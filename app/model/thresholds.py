"""
Reference parameter thresholds based on Astronaut Health Monitoring v2 specification
and HMS-of-A station telemetry baselines.

Each parameter defines [low, high, status] intervals using statuses: "norma", "uwaga", "alarm".
Vision and voice modules are intentionally excluded from the active feature set.
Note: no emojis, no parentheses in descriptive strings, and no long dashes.
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
    zrodlo_progu: str = "specification sheet"
    opis_norm: str = ""
    kierunek: str = ""

    @property
    def heurystyczny(self) -> bool:
        return "heuristic" in self.zrodlo_progu

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
    "srodowisko": "ECLSS Cabin Environment",
    "kardio": "Cardiovascular and Respiratory",
    "sen": "Sleep and Recovery",
    "stres": "Stress and Workload",
    "aktywnosc": "Activity and Endurance",
    "biochemia": "Sweat Biochemistry",
    "poznawcze": "EEG Cognitive Readiness",
}

_P = [
    # 1. ECLSS cabin environment based on NASA OSDR EDA and ISS limits
    Parametr(
        "temperatura_kabiny", "Cabin Temperature", "deg C", "srodowisko",
        [(-INF, 18.0, "alarm"), (18.0, 21.0, "uwaga"), (21.0, 25.5, "norma"), (25.5, 27.0, "uwaga"), (27.0, INF, "alarm")],
        opis_norm="21.0 - 25.5 deg C",
        zrodlo_progu="spec 22 - 24 deg C and allowed ISS range 18 - 27 deg C",
    ),
    Parametr(
        "wilgotnosc_kabiny", "Relative Humidity", "%", "srodowisko",
        [(-INF, 25.0, "alarm"), (25.0, 30.0, "uwaga"), (30.0, 60.0, "norma"), (60.0, 75.0, "uwaga"), (75.0, INF, "alarm")],
        format="{:.0f}", opis_norm="30 - 60 %",
        zrodlo_progu="ISS range 25 - 75 % under ECLSS monitoring",
    ),
    Parametr(
        "co2_kabiny", "Cabin CO2 Concentration", "ppm", "srodowisko",
        [(-INF, 3000.0, "norma"), (3000.0, 5300.0, "uwaga"), (5300.0, INF, "alarm")],
        format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="below 3000 ppm",
        zrodlo_progu="typical ISS 2000 - 3000 ppm, NASA limit 5300 ppm",
    ),
    Parametr(
        "cisnienie_kabiny", "Cabin Air Pressure", "kPa", "srodowisko",
        [(-INF, 95.0, "alarm"), (95.0, 99.0, "uwaga"), (99.0, 103.0, "norma"), (103.0, 105.0, "uwaga"), (105.0, INF, "alarm")],
        opis_norm="approx. 101 kPa",
    ),
    Parametr(
        "o2_kabiny", "Oxygen O2 Concentration", "%", "srodowisko",
        [(-INF, 19.5, "alarm"), (19.5, 20.5, "uwaga"), (20.5, 22.0, "norma"), (22.0, 23.5, "uwaga"), (23.5, INF, "alarm")],
        opis_norm="20.5 - 22.0 %",
    ),
    Parametr(
        "promieniowanie_dobowe", "Daily Radiation Dose", "mGy/d", "srodowisko",
        [(-INF, 1.0, "norma"), (1.0, 2.0, "uwaga"), (2.0, INF, "alarm")],
        format="{:.3f}", kierunek="wyzej_gorzej", opis_norm="below 1.0 mGy/d",
        zrodlo_progu="typical ISS 0.2 - 0.8 mGy/d, elevated during solar storms: heuristic",
    ),

    # 2. Cardiovascular, respiratory, and thermoregulation sensors
    Parametr(
        "tetno", "Resting Heart Rate", "bpm", "kardio",
        [(-INF, 40.0, "alarm"), (40.0, 50.0, "uwaga"), (50.0, 80.5, "norma"), (80.5, 100.0, "uwaga"), (100.0, INF, "alarm")],
        format="{:.0f}", opis_norm="50 - 80 bpm",
    ),
    Parametr(
        "hrv_rmssd", "HRV RMSSD", "ms", "kardio",
        [(-INF, 25.0, "alarm"), (25.0, 45.0, "uwaga"), (45.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="45 - 80 ms",
    ),
    Parametr(
        "spo2", "Blood Oxygen SpO2", "%", "kardio",
        [(-INF, 90.0, "alarm"), (90.0, 96.0, "uwaga"), (96.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="96 - 100 %",
    ),
    Parametr(
        "oddech", "Respiratory Rate", "breaths/min", "kardio",
        [(-INF, 8.0, "alarm"), (8.0, 12.0, "uwaga"), (12.0, 18.5, "norma"), (18.5, 24.0, "uwaga"), (24.0, INF, "alarm")],
        format="{:.0f}", opis_norm="12 - 18 breaths/min",
    ),
    Parametr(
        "cisnienie_skurczowe", "Systolic Blood Pressure", "mmHg", "kardio",
        [(-INF, 90.0, "alarm"), (90.0, 100.0, "uwaga"), (100.0, 131.0, "norma"), (131.0, 145.0, "uwaga"), (145.0, INF, "alarm")],
        format="{:.0f}", opis_norm="100 - 130 mmHg",
    ),
    Parametr(
        "cisnienie_rozkurczowe", "Diastolic Blood Pressure", "mmHg", "kardio",
        [(-INF, 55.0, "alarm"), (55.0, 65.0, "uwaga"), (65.0, 85.0, "norma"), (85.0, 93.0, "uwaga"), (93.0, INF, "alarm")],
        format="{:.0f}", opis_norm="65 - 84 mmHg",
    ),
    Parametr(
        "temperatura_ciala", "Skin Body Temperature", "deg C", "kardio",
        [(-INF, 35.5, "alarm"), (35.5, 36.2, "uwaga"), (36.2, 37.35, "norma"), (37.35, 37.8, "uwaga"), (37.8, INF, "alarm")],
        opis_norm="36.2 - 37.3 deg C",
    ),

    # 3. Sleep, stress, activity, sweat biochemistry, and cognitive readiness
    Parametr(
        "sen_godziny", "Sleep Duration", "h", "sen",
        [(-INF, 5.0, "alarm"), (5.0, 7.0, "uwaga"), (7.0, 10.0, "norma"), (10.0, INF, "uwaga")],
        kierunek="nizej_gorzej", opis_norm="7.0 - 9.0 h",
    ),
    Parametr(
        "sleep_score", "Sleep Quality Score", "pts", "sen",
        [(-INF, 60.0, "alarm"), (60.0, 80.0, "uwaga"), (80.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="above 80 pts",
    ),
    Parametr(
        "stres_opaska", "Wearable Stress Index", "pts", "stres",
        [(-INF, 51.0, "norma"), (51.0, 76.0, "uwaga"), (76.0, INF, "alarm")],
        format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="0 - 50 pts",
    ),
    Parametr(
        "body_battery", "Body Battery Reserve", "pts", "aktywnosc",
        [(-INF, 25.0, "alarm"), (25.0, 50.0, "uwaga"), (50.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="above 50 pts",
    ),
    Parametr(
        "kortyzol_pot", "Sweat Cortisol", "ng/ml", "biochemia",
        [(-INF, 6.5, "norma"), (6.5, 12.0, "uwaga"), (12.0, INF, "alarm")],
        opis_norm="below 6.5 ng/ml",
        zrodlo_progu="Bio-Patch calibration and specification sheet: heuristic",
        kierunek="wyzej_gorzej",
    ),
    Parametr(
        "mleczany_pot", "Sweat Lactate", "mmol/l", "biochemia",
        [(-INF, 2.5, "norma"), (2.5, 3.8, "uwaga"), (3.8, INF, "alarm")],
        opis_norm="below 2.5 mmol/l",
        zrodlo_progu="Bio-Patch heuristic",
        kierunek="wyzej_gorzej",
    ),
    Parametr(
        "gotowosc_poznawcza", "EEG Cognitive Readiness", "%", "poznawcze",
        [(-INF, 50.0, "alarm"), (50.0, 75.0, "uwaga"), (75.0, INF, "norma")],
        format="{:.0f}", kierunek="nizej_gorzej", opis_norm="75 - 100 %",
    ),
]

PARAMETRY: dict[str, Parametr] = {p.klucz: p for p in _P}

Z_KAMERY: set[str] = set()

# Shared 11-feature telemetry and environmental vector for the anomaly network
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
