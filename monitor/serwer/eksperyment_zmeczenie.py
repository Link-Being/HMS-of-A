#!/usr/bin/env python3
"""
Eksperymenty z modelem zmęczenia na cechach UTA-RLDD (dane/cechy_rldd/*.npy, już policzone).

Porównuje:
  - zadanie: 3 klasy (0/5/10) vs 2 klasy (czujny 0 vs senny 10)
  - cechy:   surowe vs skalibrowane na osobie (odjęta średnia i podzielone przez odch. std.
             z PIERWSZEJ POŁOWY nagrania czujnego tej osoby, odpowiednik "normy osobistej")
  - modele:  reguły (heurystyka z monitora), regresja logistyczna, gradient boosting, MLP
Walidacja: GroupKFold po osobach (model nie widzi testowanych osób). Przy kalibracji pierwsza połowa
nagrania czujnego jest zużyta na kalibrację i NIE wchodzi do testu (bez przecieku).
"""
import json
import pathlib
import sys

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score, roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

BAZA = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(BAZA))
import cechy as C  # noqa: E402

ETYK = {"0": 0, "5": 1, "10": 2}


def wczytaj():
    dane = {}
    for f in sorted((BAZA / "dane" / "cechy_rldd").glob("*.npy")):
        osoba, et = f.stem.rsplit("_", 1)
        if et in ETYK:
            a = np.load(f)
            if len(a):
                dane.setdefault(osoba, {})[ETYK[et]] = a
    return {o: d for o, d in dane.items() if 0 in d}


def zbuduj(dane, kalibracja: bool, klasy):
    X, y, g = [], [], []
    for osoba, d in dane.items():
        alert = d[0]
        pol = len(alert) // 2
        if kalibracja:
            ref = alert[:pol]
            mu = np.nanmean(ref, 0)
            sd = np.nanstd(ref, 0)
            sd = np.where(np.isfinite(sd) & (sd > 1e-6), sd, 1.0)
            mu = np.where(np.isfinite(mu), mu, 0.0)
        for k, a in d.items():
            if k not in klasy:
                continue
            if kalibracja and k == 0:
                a = a[pol:]                      # pierwsza połowa zużyta na kalibrację
            if kalibracja:
                a = np.hstack([(a - mu) / sd, a])  # względne + surowe
            X.append(a)
            y += [klasy.index(k)] * len(a)
            g += [osoba] * len(a)
    return np.vstack(X), np.array(y), np.array(g)


def modele():
    imp = lambda: SimpleImputer(strategy="median")
    return {
        "logistyczna": lambda: make_pipeline(imp(), StandardScaler(), LogisticRegression(max_iter=2000, C=0.3)),
        "gradient_boosting": lambda: HistGradientBoostingClassifier(max_depth=4, learning_rate=0.05, max_iter=300,
                                                                    l2_regularization=1.0),
        "mlp": lambda: make_pipeline(imp(), StandardScaler(), MLPClassifier((64, 32), alpha=1e-2, max_iter=400,
                                                                           early_stopping=True, random_state=0)),
    }


def ocen(X, y, g, fabryka, binarne):
    pr = np.zeros(len(y), int)
    pp = np.zeros(len(y))
    for tr, te in GroupKFold(n_splits=5).split(X, y, g):
        m = fabryka().fit(X[tr], y[tr])
        pr[te] = m.predict(X[te])
        if binarne:
            pp[te] = m.predict_proba(X[te])[:, 1]
    wyn = {"bal_acc": balanced_accuracy_score(y, pr)}
    if binarne:
        wyn["auc"] = roc_auc_score(y, pp)
        # dokładność na poziomie nagrania (średnia z okien), bliższa temu, jak działa panel
        vid = {}
        for gi, yi, pi in zip(g, y, pp):
            vid.setdefault((gi, yi), []).append(pi)
        wyn["acc_nagrania"] = float(np.mean([(np.mean(v) > 0.5) == yi for (gi, yi), v in vid.items()]))
    return wyn


def reguly(X, y, binarne):
    """Obecna heurystyka monitora (cechy surowe = pierwsze 15 kolumn)."""
    s = np.array([C.zmeczenie_heurystyka(r[:len(C.FEATURE_NAMES)]) for r in X])
    s = np.nan_to_num(s, nan=0.0)
    if binarne:
        return {"bal_acc": balanced_accuracy_score(y, s >= 40), "auc": roc_auc_score(y, s)}
    return {"bal_acc": balanced_accuracy_score(y, np.digitize(s, [40, 70]))}


def main():
    dane = wczytaj()
    print(f"Osób: {len(dane)}, okien: {sum(len(a) for d in dane.values() for a in d.values())}")
    wyniki = {}
    for zadanie, klasy in (("3 klasy", [0, 1, 2]), ("czujny vs senny", [0, 2])):
        binarne = len(klasy) == 2
        for kal in (False, True):
            X, y, g = zbuduj(dane, kal, klasy)
            Xs = X[:, len(C.FEATURE_NAMES):] if kal else X
            klucz = f"{zadanie} | {'kalibracja na osobie' if kal else 'surowe'}"
            wyniki[klucz] = {"reguły": reguly(Xs, y, binarne)}
            for nazwa, f in modele().items():
                wyniki[klucz][nazwa] = ocen(X, y, g, f, binarne)
            print(f"\n{klucz}  (okien {len(y)})")
            for nazwa, w in wyniki[klucz].items():
                print(f"   {nazwa:18s} " + "  ".join(f"{k}={v:.3f}" for k, v in w.items()))
    (BAZA / "modele" / "zmeczenie_eksperymenty.json").write_text(json.dumps(wyniki, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
