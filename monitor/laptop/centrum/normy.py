"""
Normy referencyjne parametrów (na podstawie "Monitorowanie_Zdrowia_Astronautow_Specyfikacja-v2.xlsx").

Każdy parametr ma przedziały [od, do) ze statusem: "norma", "uwaga", "alarm".
Parametry, dla których arkusz nie podaje progów liczbowych (np. CO2, wskaźniki z kamery i głosu),
mają progi przyjęte z literatury lub heurystyczne; jest to opisane w polu "zrodlo_progu".
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

INF = math.inf
STATUSY = ("norma", "uwaga", "alarm")
RYZYKO = {"norma": 0.0, "uwaga": 50.0, "alarm": 100.0}


@dataclass
class Parametr:
    klucz: str
    nazwa: str
    jednostka: str
    obszar: str
    przedzialy: list            # [(od, do, status), ...]
    format: str = "{:.1f}"
    zrodlo_progu: str = "arkusz specyfikacji"
    opis_norm: str = ""
    kierunek: str = ""          # "wyzej_gorzej" / "nizej_gorzej" / "" (do opisu trendu w raporcie)

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
    "srodowisko": "Środowisko kabiny (ECLSS)",
    "zmeczenie": "Zmęczenie i czujność",
    "stres": "Stres i emocje",
    "kardio": "Układ krążenia i oddech",
    "sen": "Sen i regeneracja",
    "aktywnosc": "Aktywność i wydolność",
    "biochemia": "Biochemia potu",
    "poznawcze": "Funkcje poznawcze (EEG)",
}

_P = [
    # --- 1. ECLSS (dane z NASA OSDR EDA) ---------------------------------------------------
    Parametr("temperatura_kabiny", "Temperatura w kabinie", "°C", "srodowisko",
             [(-INF, 18, "alarm"), (18, 21, "uwaga"), (21, 25.5, "norma"), (25.5, 27, "uwaga"), (27, INF, "alarm")],
             opis_norm="typowo 22–24 °C", zrodlo_progu="arkusz (22–24 °C) + dopuszczalny zakres ISS 18–27 °C"),
    Parametr("wilgotnosc_kabiny", "Wilgotność względna", "%", "srodowisko",
             [(-INF, 25, "alarm"), (25, 30, "uwaga"), (30, 60, "norma"), (60, 75, "uwaga"), (75, INF, "alarm")],
             format="{:.0f}", opis_norm="30–60%", zrodlo_progu="zakres ISS 25–75% (arkusz: kontrolowana przez ECLSS)"),
    Parametr("co2_kabiny", "Stężenie CO₂", "ppm", "srodowisko",
             [(-INF, 3000, "norma"), (3000, 5300, "uwaga"), (5300, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="< 3000 ppm",
             zrodlo_progu="typowe ISS 2000–3000 ppm; limit NASA 4 mmHg ≈ 5300 ppm (bóle głowy, spadek uwagi)"),
    Parametr("cisnienie_kabiny", "Ciśnienie powietrza", "kPa", "srodowisko",
             [(-INF, 95, "alarm"), (95, 99, "uwaga"), (99, 103, "norma"), (103, 105, "uwaga"), (105, INF, "alarm")],
             opis_norm="ok. 101 kPa"),
    Parametr("o2_kabiny", "Stężenie O₂", "%", "srodowisko",
             [(-INF, 19.5, "alarm"), (19.5, 20.5, "uwaga"), (20.5, 22, "norma"), (22, 23.5, "uwaga"), (23.5, INF, "alarm")],
             opis_norm="ok. 21%"),
    Parametr("promieniowanie_dobowe", "Dawka promieniowania (doba)", "mGy/d", "srodowisko",
             [(-INF, 1.0, "norma"), (1.0, 2.0, "uwaga"), (2.0, INF, "alarm")],
             format="{:.3f}", kierunek="wyzej_gorzej", opis_norm="< 1 mGy/d",
             zrodlo_progu="typowe ISS 0,2–0,8 mGy/d; wyższe wartości sugerują burzę słoneczną (heurystyka)"),

    # --- 2. Opaska biometryczna (na przyszłość) --------------------------------------------
    Parametr("tetno", "Tętno (spokojna praca)", "bpm", "kardio",
             [(-INF, 40, "alarm"), (40, 50, "uwaga"), (50, 80, "norma"), (80, 100, "uwaga"), (100, INF, "alarm")],
             format="{:.0f}", opis_norm="55–75 bpm (spokojna praca na ISS)"),
    Parametr("hrv_rmssd", "HRV (RMSSD)", "ms", "kardio",
             [(-INF, 20, "alarm"), (20, 30, "uwaga"), (30, INF, "norma")],
             format="{:.0f}", kierunek="nizej_gorzej", opis_norm="docelowo 50–80 ms"),
    Parametr("spo2", "Saturacja SpO₂", "%", "kardio",
             [(-INF, 90, "alarm"), (90, 95, "uwaga"), (95, INF, "norma")],
             format="{:.0f}", kierunek="nizej_gorzej", opis_norm="docelowo 97–100%"),
    Parametr("oddech", "Częstość oddechu (spoczynek)", "odd./min", "kardio",
             [(-INF, 8, "alarm"), (8, 12, "uwaga"), (12, 18, "norma"), (18, 24, "uwaga"), (24, INF, "alarm")],
             format="{:.0f}", opis_norm="12–16 odd./min"),
    Parametr("sen_godziny", "Czas snu", "h", "sen",
             [(-INF, 5, "alarm"), (5, 7, "uwaga"), (7, 10, "norma"), (10, INF, "uwaga")],
             kierunek="nizej_gorzej", opis_norm="7–9 h"),
    Parametr("sleep_score", "Ocena snu", "pkt", "sen",
             [(-INF, 60, "alarm"), (60, 80, "uwaga"), (80, INF, "norma")],
             format="{:.0f}", kierunek="nizej_gorzej", opis_norm="> 80 pkt"),
    Parametr("stres_opaska", "Poziom stresu (opaska)", "pkt", "stres",
             [(-INF, 51, "norma"), (51, 76, "uwaga"), (76, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="0–50 pkt"),
    Parametr("body_battery", "Body Battery", "pkt", "aktywnosc",
             [(-INF, 25, "alarm"), (25, 50, "uwaga"), (50, INF, "norma")],
             format="{:.0f}", kierunek="nizej_gorzej", opis_norm="> 50 pkt"),

    # --- 6. Nowe moduły (na przyszłość) ------------------------------------------------------
    Parametr("kortyzol_pot", "Kortyzol (pot)", "ng/ml", "biochemia",
             [(-INF, 150, "norma"), (150, 250, "uwaga"), (250, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", zrodlo_progu="heurystyka (arkusz: wymagana autokalibracja)"),
    Parametr("mleczany_pot", "Mleczany (pot)", "mmol/l", "biochemia",
             [(-INF, 20, "norma"), (20, 30, "uwaga"), (30, INF, "alarm")],
             kierunek="wyzej_gorzej", zrodlo_progu="heurystyka"),
    Parametr("gotowosc_poznawcza", "Gotowość poznawcza (EEG)", "%", "poznawcze",
             [(-INF, 50, "alarm"), (50, 70, "uwaga"), (70, INF, "norma")],
             format="{:.0f}", kierunek="nizej_gorzej", opis_norm="skala 0–100%"),

    # --- Kamera i głos (monitor.py na laptopie) -------------------------------------------------
    Parametr("zmeczenie", "Zmęczenie (kamera)", "/100", "zmeczenie",
             [(-INF, 40, "norma"), (40, 70, "uwaga"), (70, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="< 40", zrodlo_progu="heurystyka projektu"),
    Parametr("perclos", "PERCLOS (zamknięte oczy)", "%", "zmeczenie",
             [(-INF, 8, "norma"), (8, 15, "uwaga"), (15, INF, "alarm")],
             format="{:.1f}", kierunek="wyzej_gorzej", opis_norm="< 8%",
             zrodlo_progu="literatura DMS: PERCLOS > 15% = senność"),
    Parametr("ziewniecia_min", "Ziewnięcia", "/min", "zmeczenie",
             [(-INF, 1, "norma"), (1, 3, "uwaga"), (3, INF, "alarm")],
             kierunek="wyzej_gorzej", opis_norm="< 1/min", zrodlo_progu="heurystyka"),
    Parametr("mrugniecia_min", "Mrugnięcia", "/min", "zmeczenie",
             [(-INF, 5, "uwaga"), (5, 30, "norma"), (30, INF, "uwaga")],
             format="{:.0f}", opis_norm="5–30/min", zrodlo_progu="typowo 10–20/min"),
    Parametr("zmeczenie_glos", "Zmęczenie w głosie", "/100", "zmeczenie",
             [(-INF, 65, "norma"), (65, 80, "uwaga"), (80, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="< 65 (50 = baza)",
             zrodlo_progu="heurystyka (50 = jak w bazie)"),
    # FER-2013 często myli neutralną twarz ze smutkiem, więc progi są celowo wysokie
    Parametr("negatywne_twarz", "Negatywne emocje (twarz)", "%", "stres",
             [(-INF, 55, "norma"), (55, 75, "uwaga"), (75, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="< 55%", zrodlo_progu="heurystyka"),
    Parametr("negatywne_glos", "Negatywne emocje (głos)", "%", "stres",
             [(-INF, 55, "norma"), (55, 75, "uwaga"), (75, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="< 55%", zrodlo_progu="heurystyka"),
    Parametr("napiecie_glos", "Napięcie w głosie", "/100", "stres",
             [(-INF, 65, "norma"), (65, 80, "uwaga"), (80, INF, "alarm")],
             format="{:.0f}", kierunek="wyzej_gorzej", opis_norm="< 65 (50 = baza)",
             zrodlo_progu="heurystyka (50 = jak w bazie)"),
]
PARAMETRY: dict[str, Parametr] = {p.klucz: p for p in _P}

# Parametry liczone z obrazu kamery: ich pewność zależy od jakości obrazu (jakosc_kamery 0-100).
Z_KAMERY = {"zmeczenie", "perclos", "mrugniecia_min", "ziewniecia_min", "negatywne_twarz"}

# Parametry wchodzące do sieci anomalii (te, które dziś realnie przychodzą).
CECHY_ANOMALII = [
    "zmeczenie", "perclos", "mrugniecia_min", "ziewniecia_min", "zmeczenie_glos",
    "negatywne_twarz", "negatywne_glos", "napiecie_glos",
    "co2_kabiny", "temperatura_kabiny", "wilgotnosc_kabiny",
]


def ocen(klucz: str, wartosc: float) -> dict:
    p = PARAMETRY.get(klucz)
    st = p.status(wartosc) if p else None
    return {"status": st, "ryzyko": RYZYKO.get(st)}
