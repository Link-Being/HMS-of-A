"""
Model odchyleń: analizuje WSZYSTKIE dostępne parametry i wskazuje obszary odchylone od normy.

Dla każdego parametru sprawdzane są trzy niezależne rodzaje odchylenia:
  1. norma referencyjna  - wartość poza zakresem z arkusza specyfikacji (normy.py),
  2. norma osobista      - wartość nietypowa dla TEJ osoby / kabiny (baza_osobista.py, z-score),
  3. spójność sygnałów   - wartość inna, niż wynikałoby z pozostałych sygnałów (reszta sieci anomalii).
Każde daje 0-100; wynik parametru to maksimum (normy osobiste i sieć z wagą 0,8, progi heurystyczne
z wagą 0,5), przemnożone przez pewność danych. Obszar dostaje wynik swojego najbardziej odchylonego
parametru plus premię za kolejne odchylone parametry (zgodne sygnały wzmacniają wniosek).
Wynik >= PROG_OBSZARU oznacza obszar odchylony od normy.
"""
from __future__ import annotations

import math

from . import normy as N

PROG_OBSZARU = 30.0
PROG_PARAMETRU = 15.0


def _skala_z(z: float | None) -> float:
    """|z| 1,5 -> 0; |z| 4 -> 100."""
    if z is None or not math.isfinite(z):
        return 0.0
    return max(0.0, min(1.0, (abs(z) - 1.5) / 2.5)) * 100


def _kierunek_normy(par: N.Parametr, v: float) -> str:
    normy = [(od, do) for od, do, st in par.przedzialy if st == "norma"]
    if not normy:
        return ""
    return "za nisko" if v < min(od for od, _ in normy) else "za wysoko"


def _tylko_zly_kierunek(par: N.Parametr, x: float | None) -> float | None:
    """Dla parametrów, gdzie tylko jeden kierunek jest zły (np. CO2: wyżej gorzej), zmiana w dobrą stronę to nie odchylenie."""
    if x is None:
        return None
    if par.kierunek == "wyzej_gorzej" and x < 0:
        return None
    if par.kierunek == "nizej_gorzej" and x > 0:
        return None
    return x


def ocen_parametr(p: dict, z: float | None, typowa: float | None, reszta: float | None) -> dict:
    par = N.PARAMETRY[p["klucz"]]
    z = _tylko_zly_kierunek(par, z)
    reszta = _tylko_zly_kierunek(par, reszta)
    w_heur = 0.5 if par.heurystyczny else 1.0
    powody = []

    d_norma = N.RYZYKO[p["status"]] * w_heur
    if p["status"] != "norma":
        powody.append({"typ": "norma", "kierunek": _kierunek_normy(par, p["wartosc"]),
                       "opis": f"poza normą referencyjną ({par.opis_norm or 'zakres z arkusza'})"})

    d_os = _skala_z(z)
    if d_os > 0:
        typ_txt = f"typowo {par.fmt(typowa)} {par.jednostka}" if typowa is not None else ""
        powody.append({"typ": "osobista", "kierunek": "wyżej" if z > 0 else "niżej",
                       "opis": f"{'wyżej' if z > 0 else 'niżej'} niż zwykle ({typ_txt}; {abs(z):.1f} odch. std.)"})

    d_siec = _skala_z(reszta)
    if d_siec > 0:
        powody.append({"typ": "siec", "kierunek": "wyżej" if reszta > 0 else "niżej",
                       "opis": f"{'wyżej' if reszta > 0 else 'niżej'}, niż wynikałoby z pozostałych sygnałów"})

    wynik = max(d_norma, 0.8 * d_os, 0.8 * d_siec) * p.get("pewnosc", 1.0)
    return {"klucz": p["klucz"], "nazwa": par.nazwa, "obszar": par.obszar, "wartosc": p["tekst"], "status": p["status"],
            "jednostka": par.jednostka, "wynik": round(wynik, 1), "z": z, "reszta": reszta, "powody": powody}


def analizuj(parametry: list[dict], baza, reszty: dict) -> list[dict]:
    """Zwraca obszary z danymi, posortowane od najbardziej odchylonego."""
    oceny = []
    for p in parametry:
        if p.get("niepewny") or p["klucz"] not in N.PARAMETRY:
            continue
        k = p["klucz"]
        oceny.append(ocen_parametr(p, baza.z(k, p["wartosc"]), baza.typowa(k), reszty.get(k)))

    obszary = []
    for ob, nazwa in N.OBSZARY.items():
        ps = sorted([o for o in oceny if o["obszar"] == ob], key=lambda o: -o["wynik"])
        if not ps:
            continue
        # parametr odchylony: wysoki wynik LUB poza normą referencyjną (nawet heurystyczną)
        odch = [o for o in ps if o["wynik"] >= PROG_PARAMETRU or o["status"] != "norma"]
        wynik = ps[0]["wynik"] + 8.0 * max(0, len(odch) - 1)
        wynik = min(100.0, wynik)
        poza_norma = any(o["status"] != "norma" for o in ps)
        obszary.append({
            "obszar": ob, "nazwa": nazwa, "wynik": round(wynik, 1), "odchylony": wynik >= PROG_OBSZARU or poza_norma,
            "parametry": odch, "liczba_parametrow": len(ps),
            "typy": sorted({pw["typ"] for o in odch for pw in o["powody"]}),
        })
    obszary.sort(key=lambda o: -o["wynik"])
    return obszary
