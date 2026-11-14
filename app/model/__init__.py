"""
Core crew health summary model package for HMS-of-A.
Combines reference thresholds, adaptive personal baselines,
a denoising anomaly autoencoder, multi-criteria deviation scoring,
temporal smoothing, and clinical text report generation.
Vision and voice modules are excluded per station configuration.
"""
from .thresholds import OBSZARY, PARAMETRY, CECHY_ANOMALII, STATUSY, RYZYKO, ocen
from .personal_baseline import BazaOsobista
from .anomaly_model import SiecAnomalii, BazaOnline, wczytaj_lub_baza
from .deviations import analizuj, ocen_parametr
from .report import generuj as generuj_raport, jako_tekst as raport_jako_tekst
from .state import Centrum, status_na_ui, status_z_ui

__all__ = [
    "OBSZARY",
    "PARAMETRY",
    "CECHY_ANOMALII",
    "STATUSY",
    "RYZYKO",
    "ocen",
    "BazaOsobista",
    "SiecAnomalii",
    "BazaOnline",
    "wczytaj_lub_baza",
    "analizuj",
    "ocen_parametr",
    "generuj_raport",
    "raport_jako_tekst",
    "Centrum",
    "status_na_ui",
    "status_z_ui",
]
