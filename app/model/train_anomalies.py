"""
Training CLI for the 11-16-4-16-11 denoising autoencoder on shared ECLSS cabin data
and normal HMS-of-A crew physiological baselines.

Reads collected history from data/telemetry_history.csv and NASA OSDR telemetry from
data/osdr_RR1.json, augmented with resting crew physiological patterns.
Saves trained weights to data/anomalies.json and data/anomalies.npz when NumPy is installed.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import pathlib
import random

from model import thresholds as N
from model.anomaly_model import SiecAnomalii

TU = pathlib.Path(__file__).resolve().parent
ROOT = TU.parent


def _wektory_csv(plik: pathlib.Path, krok: float = 30.0, przeniesienie: float = 120.0) -> list[dict]:
    if not plik.exists():
        return []
    cechy = set(N.CECHY_ANOMALII)
    zap = []
    with open(plik, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            k = r.get("parametr", "")
            if k in cechy:
                try:
                    zap.append((float(r["czas"]), k, float(r["wartosc"])))
                except ValueError:
                    pass
    if not zap:
        return []
    zap.sort()
    t0, t1 = zap[0][0], zap[-1][0]
    siatka = []
    t = t0 + krok
    while t <= t1 + 1e-6:
        siatka.append(t)
        t += krok

    ost_v = {}
    ost_t = {}
    j = 0
    wektory = []
    for t in siatka:
        while j < len(zap) and zap[j][0] <= t:
            ts, k, val = zap[j]
            ost_v[k] = val
            ost_t[k] = ts
            j += 1
        row = {k: ost_v[k] for k in ost_v if (t - ost_t[k]) <= przeniesienie}
        if len(row) >= 2:
            wektory.append(row)
    return wektory


def _wektory_osdr(plik: pathlib.Path, limit: int = 400) -> list[dict]:
    if not plik.exists():
        return []
    d = json.loads(plik.read_text(encoding="utf-8"))
    tel = [r for r in d.get("telemetria", []) if r.get("temperature_iss") is not None]
    if not tel:
        return []
    krok = max(1, len(tel) // limit)
    out = []
    for r in tel[::krok][:limit]:
        out.append({
            "temperatura_kabiny": float(r["temperature_iss"]),
            "wilgotnosc_kabiny": float(r["humidity_iss"]),
            "co2_kabiny": float(r["co2_iss"]),
        })
    return out


def buduj_zbior_treningowy(dane_dir: pathlib.Path, ziarno: int = 42) -> list[list[float]]:
    rng = random.Random(ziarno)
    srodowisko = _wektory_csv(dane_dir / "telemetry_history.csv") + _wektory_osdr(dane_dir / "osdr_RR1.json")
    if not srodowisko:
        srodowisko = [{"temperatura_kabiny": 23.0, "wilgotnosc_kabiny": 42.0, "co2_kabiny": 2500.0}]

    # Resting baseline biometric profiles for normal crew conditions
    bazy = [
        {"tetno": 68.0, "hrv_rmssd": 64.0, "spo2": 99.0, "oddech": 14.0, "cisnienie_skurczowe": 120.0, "temperatura_ciala": 36.6, "stres_opaska": 24.0, "body_battery": 85.0},
        {"tetno": 65.0, "hrv_rmssd": 72.0, "spo2": 99.0, "oddech": 13.0, "cisnienie_skurczowe": 118.0, "temperatura_ciala": 36.5, "stres_opaska": 20.0, "body_battery": 88.0},
        {"tetno": 66.0, "hrv_rmssd": 68.0, "spo2": 99.0, "oddech": 14.0, "cisnienie_skurczowe": 118.0, "temperatura_ciala": 36.6, "stres_opaska": 22.0, "body_battery": 84.0},
    ]

    cechy = N.CECHY_ANOMALII
    X: list[list[float]] = []
    for idx, env in enumerate(srodowisko):
        base = bazy[idx % len(bazy)]
        stres_j = max(8.0, min(42.0, base["stres_opaska"] + rng.gauss(0.0, 4.0)))
        sample = {
            "tetno": max(52.0, min(79.0, base["tetno"] + rng.gauss(0.0, 3.0))),
            "hrv_rmssd": max(46.0, min(92.0, base["hrv_rmssd"] + rng.gauss(0.0, 4.5))),
            "spo2": max(96.0, min(100.0, base["spo2"] + rng.choice([0.0, 0.0, 0.0, -1.0, 1.0]))),
            "oddech": max(12.0, min(18.0, base["oddech"] + rng.gauss(0.0, 1.0))),
            "cisnienie_skurczowe": max(106.0, min(129.0, base["cisnienie_skurczowe"] + rng.gauss(0.0, 3.5))),
            "temperatura_ciala": max(36.3, min(37.1, base["temperatura_ciala"] + rng.gauss(0.0, 0.12))),
            "stres_opaska": stres_j,
            "body_battery": max(62.0, min(98.0, base["body_battery"] + rng.gauss(0.0, 4.0))),
            "co2_kabiny": env.get("co2_kabiny", 2500.0 + rng.gauss(0.0, 180.0)),
            "temperatura_kabiny": env.get("temperatura_kabiny", 23.0 + rng.gauss(0.0, 0.5)),
            "wilgotnosc_kabiny": env.get("wilgotnosc_kabiny", 42.0 + rng.gauss(0.0, 3.0)),
        }
        X.append([sample.get(c, math.nan) for c in cechy])
    return X


def main():
    ap = argparse.ArgumentParser(description="Train HMS-of-A anomaly detection network")
    ap.add_argument("--data", "--dane", dest="dane", metavar="DIR", default=str(ROOT / "data"))
    ap.add_argument("--epochs", "--epoki", dest="epoki", metavar="EPOCHS", type=int, default=180)
    args = ap.parse_args()

    dane_dir = pathlib.Path(args.dane)
    X = buduj_zbior_treningowy(dane_dir)
    print(f"Built {len(X)} training vectors for {len(N.CECHY_ANOMALII)} features.")
    siec = SiecAnomalii(N.CECHY_ANOMALII).trenuj(X, epoki=args.epoki, lr=4e-3, bs=64, p_ukrycia=0.2)
    cel = dane_dir / "anomalies.json"
    siec.zapisz(cel)
    print(f"Saved anomaly network weights to {cel}.")


if __name__ == "__main__":
    main()
