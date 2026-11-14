"""
Trening sieci anomalii na historii zebranej przez panel (dane_centrum/historia_pomiarow.csv).

Historia jest zamieniana na wektory co 30 s (ostatnia wartość każdego parametru, przeniesiona
maks. 2 min), a autoenkoder uczy się, jak wygląda "normalny" stan tej osoby i stacji.
Zapis: modele/anomalie.npz (panel wczyta go przy następnym starcie).

    python ucz_anomalie.py
    python ucz_anomalie.py --min-wektorow 200 --epoki 400

Zbieraj historię w typowych warunkach (różne pory dnia, wypoczęty i zmęczony), żeby sieć
nie uznawała zwykłej zmienności za anomalię. Im więcej godzin, tym lepiej.
"""
from __future__ import annotations

import argparse
import csv
import pathlib

import numpy as np

from glowny import normy as N
from glowny.anomalie import SiecAnomalii

TU = pathlib.Path(__file__).resolve().parent


def wektory(plik: pathlib.Path, krok: float = 30.0, przeniesienie: float = 120.0) -> np.ndarray:
    cechy = N.CECHY_ANOMALII
    idx = {c: i for i, c in enumerate(cechy)}
    zap = []
    with open(plik, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["parametr"] in idx:
                try:
                    zap.append((float(r["czas"]), idx[r["parametr"]], float(r["wartosc"])))
                except ValueError:
                    pass
    if not zap:
        return np.empty((0, len(cechy)))
    zap.sort()
    t0, t1 = zap[0][0], zap[-1][0]
    siatka = np.arange(t0 + krok, t1 + krok, krok)
    X = np.full((len(siatka), len(cechy)), np.nan)
    ost_v = np.full(len(cechy), np.nan)
    ost_t = np.full(len(cechy), -np.inf)
    j = 0
    for k, t in enumerate(siatka):
        while j < len(zap) and zap[j][0] <= t:
            _, c, v = zap[j]
            ost_v[c], ost_t[c] = v, zap[j][0]
            j += 1
        swieze = (t - ost_t) <= przeniesienie
        X[k] = np.where(swieze, ost_v, np.nan)
    return X[np.isfinite(X).sum(1) >= 2]


def main():
    ap = argparse.ArgumentParser(description="Trening sieci anomalii na historii panelu")
    ap.add_argument("--historia", default=str(TU.parent / "laptop" / "dane_centrum" / "historia_pomiarow.csv"))
    ap.add_argument("--min-wektorow", type=int, default=240, help="min. liczba wektorów 30 s (240 = 2 h)")
    ap.add_argument("--epoki", type=int, default=300)
    args = ap.parse_args()

    X = wektory(pathlib.Path(args.historia))
    print(f"Wektorów 30 s: {len(X)} (~{len(X) / 120:.1f} h danych)")
    for c, n in zip(N.CECHY_ANOMALII, np.isfinite(X).sum(0)):
        print(f"  {c:20s} obecny w {n / max(len(X), 1):5.0%} wektorów")
    if len(X) < args.min_wektorow:
        raise SystemExit(f"Za mało danych (potrzeba co najmniej {args.min_wektorow}). Zbieraj dalej z uruchomionym panelem.")
    siec = SiecAnomalii(N.CECHY_ANOMALII).trenuj(X, epoki=args.epoki)
    cel = TU / "glowny" / "anomalie.npz"
    siec.zapisz(cel)
    print(f"Zapisano {cel}. Dla panelu na laptopie skopiuj go do laptop/modele/anomalie.npz.")


if __name__ == "__main__":
    main()
