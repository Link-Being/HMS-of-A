"""
Sieć anomalii: autoenkoder uczący się "normalnego" stanu danej osoby i stacji, bez etykiet.

Wejście: wektor parametrów (normy.CECHY_ANOMALII), standaryzowany względem historii tej osoby.
Sieć próbuje odtworzyć wektor przez wąskie gardło (in -> 16 -> 4 -> 16 -> in).
Jeśli bieżący stan jest podobny do tego, co sieć widziała, błąd odtworzenia jest mały;
nietypowe połączenia sygnałów (np. wysokie CO2 + rosnące zmęczenie + napięty głos) dają duży błąd.
Wynik 0-100 to percentyl błędu względem historii treningowej. Wkłady pokazują, które parametry
odbiegają najbardziej.

Brakujące parametry (np. brak mowy, brak danych ECLSS) są maskowane: sieć uczy się z losowo
ukrytymi wejściami, więc działa także przy niepełnych danych.

Czysty numpy, bez PyTorch, żeby działało lekko na laptopie.
Zanim sieć zostanie wytrenowana, działa BazaOnline: odchylenia z-score od bieżącej sesji.
"""
from __future__ import annotations

import math
import pathlib

import numpy as np


class SiecAnomalii:
    def __init__(self, cechy: list[str], ukryte: int = 16, waskie: int = 4, ziarno: int = 0):
        self.cechy = list(cechy)
        n = len(cechy)
        rng = np.random.default_rng(ziarno)
        rozm = [n, ukryte, waskie, ukryte, n]
        self.W = [rng.normal(0, math.sqrt(1.0 / a), (a, b)) for a, b in zip(rozm[:-1], rozm[1:])]
        self.b = [np.zeros(b) for b in rozm[1:]]
        self.mu = np.zeros(n)
        self.sd = np.ones(n)
        self.bledy_ref = np.array([0.0, 1.0])

    # ------------------------------------------------------------------ sieć
    def _przod(self, x):
        akt = [x]
        for i, (W, b) in enumerate(zip(self.W, self.b)):
            z = akt[-1] @ W + b
            akt.append(z if i == len(self.W) - 1 else np.tanh(z))
        return akt

    def _standaryzuj(self, X):
        Z = (X - self.mu) / self.sd
        maska = np.isfinite(Z)
        return np.where(maska, np.clip(Z, -6, 6), 0.0), maska

    def blad(self, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Błąd odtworzenia na wiersz oraz kwadraty błędów per cecha (NaN dla brakujących)."""
        Z, maska = self._standaryzuj(np.atleast_2d(X))
        R = self._przod(Z)[-1]
        e2 = np.where(maska, (R - Z) ** 2, np.nan)
        n = maska.sum(1)
        wiersz = np.where(n > 0, np.nansum(e2, 1) / np.maximum(n, 1), np.nan)
        return wiersz, e2

    # ------------------------------------------------------------------ trening
    def trenuj(self, X: np.ndarray, epoki: int = 300, lr: float = 3e-3, bs: int = 128,
               p_ukrycia: float = 0.2, ziarno: int = 0, gadaj: bool = True):
        rng = np.random.default_rng(ziarno)
        self.mu = np.nanmean(X, 0)
        self.sd = np.nanstd(X, 0)
        self.mu = np.where(np.isfinite(self.mu), self.mu, 0.0)
        self.sd = np.where(np.isfinite(self.sd) & (self.sd > 1e-6), self.sd, 1.0)
        Z, maska = self._standaryzuj(X)
        par = self.W + self.b
        m = [np.zeros_like(p) for p in par]
        v = [np.zeros_like(p) for p in par]
        t = 0
        for ep in range(epoki):
            perm = rng.permutation(len(Z))
            suma = 0.0
            for i in range(0, len(Z), bs):
                idx = perm[i:i + bs]
                zc, mc = Z[idx], maska[idx]
                ukryj = rng.random(zc.shape) < p_ukrycia      # odszumianie: losowo ukryte wejścia
                wej = np.where(ukryj, 0.0, zc)
                akt = self._przod(wej)
                n = max(mc.sum(), 1)
                d = 2 * (akt[-1] - zc) * mc / n
                suma += float(((akt[-1] - zc) ** 2 * mc).sum())
                gW, gb = [None] * len(self.W), [None] * len(self.b)
                for k in range(len(self.W) - 1, -1, -1):
                    gW[k] = akt[k].T @ d
                    gb[k] = d.sum(0)
                    if k > 0:
                        d = (d @ self.W[k].T) * (1 - akt[k] ** 2)
                t += 1
                for j, (p, g) in enumerate(zip(par, gW + gb)):
                    m[j] = 0.9 * m[j] + 0.1 * g
                    v[j] = 0.999 * v[j] + 0.001 * g * g
                    p -= lr * (m[j] / (1 - 0.9 ** t)) / (np.sqrt(v[j] / (1 - 0.999 ** t)) + 1e-8)
            if gadaj and (ep % 50 == 0 or ep == epoki - 1):
                print(f"  epoka {ep + 1}/{epoki}: błąd odtworzenia {suma / max(maska.sum(), 1):.4f}")
        bl, _ = self.blad(X)
        self.bledy_ref = np.sort(bl[np.isfinite(bl)])
        return self

    # ------------------------------------------------------------------ ocena
    def ocen(self, stan: dict) -> dict:
        x = np.array([[stan.get(c, np.nan) for c in self.cechy]], float)
        bl, e2 = self.blad(x)
        if not np.isfinite(bl[0]):
            return {"wynik": None, "metoda": "siec", "wklady": {}, "reszty": {}}
        pct = float(np.searchsorted(self.bledy_ref, bl[0]) / max(len(self.bledy_ref), 1))
        wk = {c: float(e) for c, e in zip(self.cechy, e2[0]) if np.isfinite(e)}
        # reszta ze znakiem (w odch. std.): o ile wartość jest wyżej (+) / niżej (-) niż sieć oczekuje
        # na podstawie POZOSTAŁYCH sygnałów
        Z, maska = self._standaryzuj(x)
        R = self._przod(Z)[-1]
        reszty = {c: float(z - r) for c, z, r, m in zip(self.cechy, Z[0], R[0], maska[0]) if m}
        return {"wynik": round(100 * pct, 1), "blad": float(bl[0]), "metoda": "siec", "wklady": wk, "reszty": reszty}

    # ------------------------------------------------------------------ zapis
    def zapisz(self, sciezka):
        d = {f"W{i}": w for i, w in enumerate(self.W)} | {f"b{i}": b for i, b in enumerate(self.b)}
        np.savez(sciezka, cechy=np.array(self.cechy), mu=self.mu, sd=self.sd, bledy_ref=self.bledy_ref, **d)

    @classmethod
    def wczytaj(cls, sciezka) -> "SiecAnomalii":
        d = np.load(sciezka, allow_pickle=False)
        s = cls(list(d["cechy"]))
        s.W = [d[f"W{i}"] for i in range(len(s.W))]
        s.b = [d[f"b{i}"] for i in range(len(s.b))]
        s.mu, s.sd, s.bledy_ref = d["mu"], d["sd"], d["bledy_ref"]
        return s


class BazaOnline:
    """Zastępstwo przed treningiem sieci: średnia i odch. std. każdej cechy z bieżącej sesji (Welford)."""

    def __init__(self, cechy: list[str], min_probek: int = 30):
        self.cechy = list(cechy)
        self.min = min_probek
        self.n = dict.fromkeys(cechy, 0)
        self.sr = dict.fromkeys(cechy, 0.0)
        self.m2 = dict.fromkeys(cechy, 0.0)

    def dodaj(self, stan: dict):
        for c in self.cechy:
            v = stan.get(c)
            if v is None or not math.isfinite(v):
                continue
            self.n[c] += 1
            d = v - self.sr[c]
            self.sr[c] += d / self.n[c]
            self.m2[c] += d * (v - self.sr[c])

    def ocen(self, stan: dict) -> dict:
        wk = {}
        for c in self.cechy:
            v = stan.get(c)
            if v is None or not math.isfinite(v) or self.n[c] < self.min:
                continue
            sd = math.sqrt(self.m2[c] / (self.n[c] - 1)) if self.n[c] > 1 else 0.0
            sd = max(sd, 1e-3 + 0.05 * abs(self.sr[c]))
            wk[c] = ((v - self.sr[c]) / sd) ** 2
        if not wk:
            gotowe = max(self.n.values()) / self.min if self.n else 0
            return {"wynik": None, "metoda": "kalibracja", "postep": min(1.0, gotowe), "wklady": {}, "reszty": {}}
        rms = math.sqrt(sum(wk.values()) / len(wk))
        wynik = max(0.0, min(100.0, (rms - 0.8) / 2.2 * 100))
        # bez wytrenowanej sieci nie ma oczekiwań z innych sygnałów; reszt nie podajemy
        return {"wynik": round(wynik, 1), "metoda": "baza_sesji", "wklady": wk, "reszty": {}}


def wczytaj_lub_baza(sciezka: pathlib.Path, cechy: list[str]):
    if sciezka.exists():
        try:
            return SiecAnomalii.wczytaj(sciezka)
        except Exception as e:
            print("Nie mogę wczytać sieci anomalii:", e)
    return BazaOnline(cechy)
