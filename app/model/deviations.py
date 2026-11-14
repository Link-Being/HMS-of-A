"""
Deviation model: evaluates all available parameters and identifies out-of-norm domains.

Three independent evaluation criteria:
  1. Reference threshold - value outside specification range
  2. Personal baseline - atypical value for this individual or cabin
  3. Signal coherence - anomaly autoencoder residual relative to paired signals
"""
from __future__ import annotations

import math

from . import thresholds as N

PROG_OBSZARU = 30.0
PROG_PARAMETRU = 15.0


def _skala_z(z: float | None) -> float:
    if z is None or not math.isfinite(z):
        return 0.0
    return max(0.0, min(1.0, (abs(z) - 1.5) / 2.5)) * 100.0


def _kierunek_normy(par: N.Parametr, v: float) -> str:
    normy = [(od, do) for od, do, st in par.przedzialy if st == "norma"]
    if not normy:
        return ""
    return "too low" if v < min(od for od, _ in normy) else "too high"


def _tylko_zly_kierunek(par: N.Parametr, x: float | None) -> float | None:
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
        norm_opis = par.opis_norm or "specification range"
        powody.append({
            "typ": "norma",
            "kierunek": _kierunek_normy(par, p["wartosc"]),
            "opis": f"outside reference threshold: {norm_opis}",
        })

    d_os = _skala_z(z)
    if d_os > 0:
        typ_txt = f"typically {par.fmt(typowa)} {par.jednostka}, " if typowa is not None else ""
        kier = "higher" if z > 0 else "lower"
        powody.append({
            "typ": "osobista",
            "kierunek": kier,
            "opis": f"{kier} than usual: {typ_txt}{abs(z):.1f} std. dev.",
        })

    d_siec = _skala_z(reszta)
    if d_siec > 0:
        kier_s = "higher" if reszta > 0 else "lower"
        powody.append({
            "typ": "siec",
            "kierunek": kier_s,
            "opis": f"{kier_s} than expected from paired signals",
        })

    wynik = max(d_norma, 0.8 * d_os, 0.8 * d_siec) * p.get("pewnosc", 1.0)
    return {
        "klucz": p["klucz"],
        "nazwa": par.nazwa,
        "obszar": par.obszar,
        "wartosc": p["tekst"],
        "status": p["status"],
        "jednostka": par.jednostka,
        "wynik": round(wynik, 1),
        "z": round(float(z), 2) if z is not None else None,
        "reszta": round(float(reszta), 2) if reszta is not None else None,
        "powody": powody,
    }


def analizuj(parametry: list[dict], baza, reszty: dict) -> list[dict]:
    """Return active domains sorted from highest deviation score to lowest."""
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
        odch = [o for o in ps if o["wynik"] >= PROG_PARAMETRU or o["status"] != "norma"]
        wynik = ps[0]["wynik"] + 8.0 * max(0, len(odch) - 1)
        wynik = min(100.0, wynik)
        poza_norma = any(o["status"] != "norma" for o in ps)
        obszary.append({
            "obszar": ob,
            "nazwa": nazwa,
            "wynik": round(wynik, 1),
            "odchylony": bool(wynik >= PROG_OBSZARU or poza_norma),
            "parametry": odch,
            "liczba_parametrow": len(ps),
            "typy": sorted({pw["typ"] for o in odch for pw in o["powody"]}),
        })
    obszary.sort(key=lambda o: -o["wynik"])
    return obszary
