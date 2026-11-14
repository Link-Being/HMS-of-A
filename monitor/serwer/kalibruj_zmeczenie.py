#!/usr/bin/env python3
"""
Kalibracja Platta wyniku reguł zmęczenia (cechy.zmeczenie_heurystyka) na UTA-RLDD: czujny (0) vs senny (10).
Wynik: P(senny) = sigmoid(a * wynik_regul + b), zapisane do modele/konfig.json jako ZMECZENIE_PLATT.
Monitor liczy wtedy zmęczenie = 100 * P(senny). Wybrane w eksperymencie_zmeczenie.py: bal. dokładność 71,8%
(GroupKFold po osobach), trafność na całe nagranie 78%, wobec 64,6% dla reguł z progiem 40.
"""
import json
import pathlib
import sys

import numpy as np
from sklearn.linear_model import LogisticRegression

BAZA = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(BAZA))
import cechy as C  # noqa: E402
import eksperyment_zmeczenie as E  # noqa: E402

X, y, _ = E.zbuduj(E.wczytaj(), False, [0, 2])
s = np.nan_to_num(np.array([C.zmeczenie_heurystyka(r) for r in X]), nan=0.0)[:, None]
m = LogisticRegression().fit(s, y)
a, b = float(m.coef_[0, 0]), float(m.intercept_[0])
kp = BAZA / "modele" / "konfig.json"
k = json.loads(kp.read_text()) if kp.exists() else {}
k["ZMECZENIE_PLATT"] = [a, b]
k["ZMECZENIE_OPIS"] = "zmeczenie = 100 * sigmoid(a * wynik_regul + b) = szacowane P(senny) w %; UTA-RLDD, 60 osob"
kp.write_text(json.dumps(k, indent=2, ensure_ascii=False))
for w in (0, 10, 20, 30, 50, 80):
    print(f"wynik reguł {w:3d} -> zmęczenie {100 / (1 + np.exp(-(a * w + b))):5.1f}")
print("a, b =", a, b)
