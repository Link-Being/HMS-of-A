"""
Pakiet glowny modelu podsumowujacego stan zalogi HMS-of-A.
Sklada sie z systemu norm referencyjnych, adaptacyjnej bazy osobistej,
autoenkodera anomalii, wielokryterialnego modelu odchylen,
modulu integracji czasowej oraz generatora raportu tekstowego.
Pomija moduly wizyjne i glosowe zgodnie z konfiguracja stacji.
"""
from .normy import OBSZARY, PARAMETRY, CECHY_ANOMALII, STATUSY, RYZYKO, ocen
from .baza_osobista import BazaOsobista
from .anomalie import SiecAnomalii, BazaOnline, wczytaj_lub_baza
from .odchylenia import analizuj, ocen_parametr
from .raport import generuj as generuj_raport, jako_tekst as raport_jako_tekst
from .stan import Centrum, status_na_ui, status_z_ui

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
