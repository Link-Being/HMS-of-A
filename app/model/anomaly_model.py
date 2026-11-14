"""
Anomaly network: unsupervised denoising autoencoder learning normal crew and station patterns.

Architecture: input -> 16 -> 4 -> 16 -> output with tanh activations and random input masking.
Supports NumPy acceleration when installed as well as pure-Python inference and training
without external dependencies, using shared JSON weight files.
"""
from __future__ import annotations

import bisect
import json
import math
import pathlib
import random

try:
    import numpy as np
except ImportError:
    np = None


def _isfinite(v) -> bool:
    return v is not None and isinstance(v, (int, float)) and math.isfinite(float(v))


def _matvec_add(vec: list[float], W: list[list[float]], b: list[float], tanh_act: bool) -> list[float]:
    cols = len(b)
    out = [float(b[j]) for j in range(cols)]
    for i, x in enumerate(vec):
        if x == 0.0:
            continue
        row = W[i]
        for j in range(cols):
            out[j] += x * row[j]
    if tanh_act:
        out = [math.tanh(z) for z in out]
    return out


class SiecAnomalii:
    def __init__(self, cechy: list[str], ukryte: int = 16, waskie: int = 4, ziarno: int = 0):
        self.cechy = list(cechy)
        self.ukryte = int(ukryte)
        self.waskie = int(waskie)
        n = len(cechy)
        rozm = [n, self.ukryte, self.waskie, self.ukryte, n]
        rng = random.Random(ziarno)
        self.W: list[list[list[float]]] = []
        self.b: list[list[float]] = []
        for a, b_dim in zip(rozm[:-1], rozm[1:]):
            sd_init = math.sqrt(1.0 / max(a, 1))
            self.W.append([[rng.gauss(0.0, sd_init) for _ in range(b_dim)] for _ in range(a)])
            self.b.append([0.0 for _ in range(b_dim)])
        self.mu = [0.0 for _ in range(n)]
        self.sd = [1.0 for _ in range(n)]
        self.bledy_ref = [0.0, 1.0]

    def _standaryzuj_wiersz(self, vals: list[float]) -> tuple[list[float], list[bool]]:
        z_row: list[float] = []
        maska: list[bool] = []
        for i, v in enumerate(vals):
            if not _isfinite(v):
                z_row.append(0.0)
                maska.append(False)
                continue
            sd_v = self.sd[i] if self.sd[i] > 1e-6 else 1.0
            z = (float(v) - self.mu[i]) / sd_v
            if not math.isfinite(z):
                z_row.append(0.0)
                maska.append(False)
            else:
                z_clamped = max(-6.0, min(6.0, z))
                z_row.append(z_clamped)
                maska.append(True)
        return z_row, maska

    def _przod_wiersz(self, z_row: list[float]) -> list[list[float]]:
        akt = [list(z_row)]
        last = len(self.W) - 1
        for i, (W, b) in enumerate(zip(self.W, self.b)):
            akt.append(_matvec_add(akt[-1], W, b, tanh_act=(i != last)))
        return akt

    def blad_wiersza(self, vals: list[float]) -> tuple[float, list[float | None]]:
        z_row, maska = self._standaryzuj_wiersz(vals)
        recon = self._przod_wiersz(z_row)[-1]
        e2: list[float | None] = []
        suma = 0.0
        licznik = 0
        for m, r, z in zip(maska, recon, z_row):
            if m:
                err = (r - z) ** 2
                e2.append(err)
                suma += err
                licznik += 1
            else:
                e2.append(None)
        wiersz = (suma / licznik) if licznik > 0 else math.nan
        return wiersz, e2

    def trenuj(self, X, epoki: int = 300, lr: float = 3e-3, bs: int = 128,
               p_ukrycia: float = 0.2, ziarno: int = 0, gadaj: bool = True):
        if np is not None:
            return self._trenuj_numpy(np.asarray(X, dtype=float), epoki, lr, bs, p_ukrycia, ziarno, gadaj)
        return self._trenuj_python(X, epoki, lr, bs, p_ukrycia, ziarno, gadaj)

    def _trenuj_numpy(self, X, epoki: int, lr: float, bs: int, p_ukrycia: float, ziarno: int, gadaj: bool):
        rng = np.random.default_rng(ziarno)
        mu = np.nanmean(X, 0)
        sd = np.nanstd(X, 0)
        mu = np.where(np.isfinite(mu), mu, 0.0)
        sd = np.where(np.isfinite(sd) & (sd > 1e-6), sd, 1.0)
        self.mu = [float(x) for x in mu]
        self.sd = [float(x) for x in sd]

        Z_raw = (X - mu) / sd
        maska = np.isfinite(Z_raw)
        Z = np.where(maska, np.clip(Z_raw, -6.0, 6.0), 0.0)

        W_np = [np.array(w, dtype=float) for w in self.W]
        b_np = [np.array(b, dtype=float) for b in self.b]
        par = W_np + b_np
        m = [np.zeros_like(p) for p in par]
        v = [np.zeros_like(p) for p in par]
        t = 0

        for ep in range(epoki):
            perm = rng.permutation(len(Z))
            suma = 0.0
            for i in range(0, len(Z), bs):
                idx = perm[i:i + bs]
                zc, mc = Z[idx], maska[idx]
                ukryj = rng.random(zc.shape) < p_ukrycia
                wej = np.where(ukryj, 0.0, zc)
                akt = [wej]
                for l_idx, (Wl, bl) in enumerate(zip(W_np, b_np)):
                    z_lin = akt[-1] @ Wl + bl
                    akt.append(z_lin if l_idx == len(W_np) - 1 else np.tanh(z_lin))
                n_ok = max(float(mc.sum()), 1.0)
                d = 2.0 * (akt[-1] - zc) * mc / n_ok
                suma += float(((akt[-1] - zc) ** 2 * mc).sum())
                gW = [None] * len(W_np)
                gb = [None] * len(b_np)
                for k in range(len(W_np) - 1, -1, -1):
                    gW[k] = akt[k].T @ d
                    gb[k] = d.sum(0)
                    if k > 0:
                        d = (d @ W_np[k].T) * (1.0 - akt[k] ** 2)
                t += 1
                b1_corr = 1.0 - 0.9 ** t
                b2_corr = 1.0 - 0.999 ** t
                for j, (p, g) in enumerate(zip(par, gW + gb)):
                    m[j] = 0.9 * m[j] + 0.1 * g
                    v[j] = 0.999 * v[j] + 0.001 * g * g
                    p -= lr * (m[j] / b1_corr) / (np.sqrt(v[j] / b2_corr) + 1e-8)
            if gadaj and (ep % 50 == 0 or ep == epoki - 1):
                print(f"  epoch {ep + 1}/{epoki}: reconstruction loss {suma / max(float(maska.sum()), 1.0):.4f}")

        self.W = [w.tolist() for w in W_np]
        self.b = [b.tolist() for b in b_np]
        errs = []
        for row in X:
            bl, _ = self.blad_wiersza(row.tolist())
            if math.isfinite(bl):
                errs.append(bl)
        errs.sort()
        self.bledy_ref = errs if errs else [0.0, 1.0]
        return self

    def _trenuj_python(self, X: list[list[float]], epoki: int, lr: float, bs: int,
                       p_ukrycia: float, ziarno: int, gadaj: bool):
        n_feat = len(self.cechy)
        rng = random.Random(ziarno)
        cols = [[] for _ in range(n_feat)]
        for row in X:
            for j, val in enumerate(row):
                if _isfinite(val):
                    cols[j].append(float(val))
        for j in range(n_feat):
            if cols[j]:
                mu_j = sum(cols[j]) / len(cols[j])
                var_j = sum((x - mu_j) ** 2 for x in cols[j]) / len(cols[j])
                sd_j = math.sqrt(var_j)
                self.mu[j] = mu_j
                self.sd[j] = sd_j if sd_j > 1e-6 else 1.0
            else:
                self.mu[j] = 0.0
                self.sd[j] = 1.0

        z_rows = []
        masks = []
        total_mask = 0
        for row in X:
            z_r, m_r = self._standaryzuj_wiersz(row)
            z_rows.append(z_r)
            masks.append(m_r)
            total_mask += sum(1 for x in m_r if x)

        mW = [[[0.0] * len(W[0]) for _ in range(len(W))] for W in self.W]
        vW = [[[0.0] * len(W[0]) for _ in range(len(W))] for W in self.W]
        mb = [[0.0] * len(b) for b in self.b]
        vb = [[0.0] * len(b) for b in self.b]
        t = 0
        indices = list(range(len(z_rows)))

        for ep in range(epoki):
            rng.shuffle(indices)
            suma = 0.0
            for start in range(0, len(indices), bs):
                batch_idx = indices[start:start + bs]
                gW = [[[0.0] * len(W[0]) for _ in range(len(W))] for W in self.W]
                gb = [[0.0] * len(b) for b in self.b]
                n_ok = max(sum(1 for idx in batch_idx for flag in masks[idx] if flag), 1)
                for idx in batch_idx:
                    zc = z_rows[idx]
                    mc = masks[idx]
                    wej = [0.0 if (not mc[j] or rng.random() < p_ukrycia) else zc[j] for j in range(n_feat)]
                    akt = self._przod_wiersz(wej)
                    d = []
                    for j in range(n_feat):
                        if mc[j]:
                            diff = akt[-1][j] - zc[j]
                            suma += diff * diff
                            d.append(2.0 * diff / n_ok)
                        else:
                            d.append(0.0)
                    for k in range(len(self.W) - 1, -1, -1):
                        in_a = akt[k]
                        rows_k = len(self.W[k])
                        cols_k = len(self.W[k][0])
                        for r_i in range(rows_k):
                            ai = in_a[r_i]
                            if ai == 0.0:
                                continue
                            gW_row = gW[k][r_i]
                            for c_j in range(cols_k):
                                gW_row[c_j] += ai * d[c_j]
                        for c_j in range(cols_k):
                            gb[k][c_j] += d[c_j]
                        if k > 0:
                            d_prev = []
                            for r_i in range(rows_k):
                                s_val = 0.0
                                W_row = self.W[k][r_i]
                                for c_j in range(cols_k):
                                    s_val += d[c_j] * W_row[c_j]
                                d_prev.append(s_val * (1.0 - in_a[r_i] * in_a[r_i]))
                            d = d_prev
                t += 1
                b1_corr = 1.0 - 0.9 ** t
                b2_corr = 1.0 - 0.999 ** t
                for k in range(len(self.W)):
                    for r_i in range(len(self.W[k])):
                        for c_j in range(len(self.W[k][r_i])):
                            g = gW[k][r_i][c_j]
                            mW[k][r_i][c_j] = 0.9 * mW[k][r_i][c_j] + 0.1 * g
                            vW[k][r_i][c_j] = 0.999 * vW[k][r_i][c_j] + 0.001 * g * g
                            m_hat = mW[k][r_i][c_j] / b1_corr
                            v_hat = vW[k][r_i][c_j] / b2_corr
                            self.W[k][r_i][c_j] -= lr * m_hat / (math.sqrt(v_hat) + 1e-8)
                    for c_j in range(len(self.b[k])):
                        g = gb[k][c_j]
                        mb[k][c_j] = 0.9 * mb[k][c_j] + 0.1 * g
                        vb[k][c_j] = 0.999 * vb[k][c_j] + 0.001 * g * g
                        m_hat = mb[k][c_j] / b1_corr
                        v_hat = vb[k][c_j] / b2_corr
                        self.b[k][c_j] -= lr * m_hat / (math.sqrt(v_hat) + 1e-8)
            if gadaj and (ep % 50 == 0 or ep == epoki - 1):
                print(f"  epoch {ep + 1}/{epoki}: reconstruction loss {suma / max(total_mask, 1):.4f}")

        errs = []
        for row in X:
            bl, _ = self.blad_wiersza(row)
            if math.isfinite(bl):
                errs.append(bl)
        errs.sort()
        self.bledy_ref = errs if errs else [0.0, 1.0]
        return self

    def ocen(self, stan: dict) -> dict:
        vals = [stan.get(c, math.nan) for c in self.cechy]
        bl, e2 = self.blad_wiersza(vals)
        if not math.isfinite(bl):
            return {"wynik": None, "metoda": "siec", "wklady": {}, "reszty": {}}
        pos = bisect.bisect_left(self.bledy_ref, bl)
        pct = float(pos) / max(len(self.bledy_ref), 1)
        wk = {c: float(e) for c, e in zip(self.cechy, e2) if e is not None and math.isfinite(e)}
        z_row, maska = self._standaryzuj_wiersz(vals)
        recon = self._przod_wiersz(z_row)[-1]
        reszty = {c: float(z - r) for c, z, r, m in zip(self.cechy, z_row, recon, maska) if m}
        return {
            "wynik": round(100.0 * pct, 1),
            "blad": float(bl),
            "metoda": "siec",
            "wklady": wk,
            "reszty": reszty,
        }

    def zapisz(self, sciezka: pathlib.Path | str):
        p = pathlib.Path(sciezka)
        p.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "cechy": self.cechy,
            "ukryte": self.ukryte,
            "waskie": self.waskie,
            "mu": [float(x) for x in self.mu],
            "sd": [float(x) for x in self.sd],
            "bledy_ref": [float(x) for x in self.bledy_ref],
            "W": self.W,
            "b": self.b,
        }
        if p.suffix.lower() == ".npz":
            if np is not None:
                d = {f"W{i}": np.array(w) for i, w in enumerate(self.W)} | {
                    f"b{i}": np.array(b) for i, b in enumerate(self.b)
                }
                np.savez(
                    p,
                    cechy=np.array(self.cechy),
                    mu=np.array(self.mu),
                    sd=np.array(self.sd),
                    bledy_ref=np.array(self.bledy_ref),
                    **d,
                )
            p_json = p.with_suffix(".json")
            p_json.write_text(json.dumps(payload), encoding="utf-8")
        else:
            p.write_text(json.dumps(payload), encoding="utf-8")

    @classmethod
    def wczytaj(cls, sciezka: pathlib.Path | str) -> "SiecAnomalii":
        p = pathlib.Path(sciezka)
        if p.suffix.lower() == ".json":
            d = json.loads(p.read_text(encoding="utf-8"))
            s = cls(d["cechy"], ukryte=d.get("ukryte", 16), waskie=d.get("waskie", 4))
            s.W = d["W"]
            s.b = d["b"]
            s.mu = [float(x) for x in d["mu"]]
            s.sd = [float(x) for x in d["sd"]]
            s.bledy_ref = sorted(float(x) for x in d["bledy_ref"])
            return s
        if np is not None and p.exists():
            d = np.load(p, allow_pickle=False)
            s = cls(list(d["cechy"]))
            s.W = [d[f"W{i}"].tolist() for i in range(len(s.W))]
            s.b = [d[f"b{i}"].tolist() for i in range(len(s.b))]
            s.mu = d["mu"].tolist()
            s.sd = d["sd"].tolist()
            s.bledy_ref = sorted(d["bledy_ref"].tolist())
            return s
        p_json = p.with_suffix(".json")
        if p_json.exists():
            return cls.wczytaj(p_json)
        raise FileNotFoundError(str(p))


class BazaOnline:
    """Fallback before network training: rolling session mean and standard deviation."""

    def __init__(self, cechy: list[str], min_probek: int = 30):
        self.cechy = list(cechy)
        self.min = min_probek
        self.n = dict.fromkeys(cechy, 0)
        self.sr = dict.fromkeys(cechy, 0.0)
        self.m2 = dict.fromkeys(cechy, 0.0)

    def dodaj(self, stan: dict):
        for c in self.cechy:
            v = stan.get(c)
            if not _isfinite(v):
                continue
            v = float(v)
            self.n[c] += 1
            d = v - self.sr[c]
            self.sr[c] += d / self.n[c]
            self.m2[c] += d * (v - self.sr[c])

    def ocen(self, stan: dict) -> dict:
        wk = {}
        for c in self.cechy:
            v = stan.get(c)
            if not _isfinite(v) or self.n[c] < self.min:
                continue
            v = float(v)
            sd = math.sqrt(self.m2[c] / (self.n[c] - 1)) if self.n[c] > 1 else 0.0
            sd = max(sd, 1e-3 + 0.05 * abs(self.sr[c]))
            wk[c] = ((v - self.sr[c]) / sd) ** 2
        if not wk:
            gotowe = max(self.n.values()) / self.min if self.n else 0.0
            return {"wynik": None, "metoda": "kalibracja", "postep": min(1.0, gotowe), "wklady": {}, "reszty": {}}
        rms = math.sqrt(sum(wk.values()) / len(wk))
        wynik = max(0.0, min(100.0, (rms - 0.8) / 2.2 * 100.0))
        return {"wynik": round(wynik, 1), "metoda": "baza_sesji", "wklady": wk, "reszty": {}}


def wczytaj_lub_baza(sciezka: pathlib.Path, cechy: list[str]):
    p = pathlib.Path(sciezka)
    p_json = p.with_suffix(".json")
    kandydaci = [p]
    if p_json != p:
        kandydaci.insert(0, p_json) if p.suffix.lower() != ".json" and not p.exists() else kandydaci.append(p_json)
    for cand in kandydaci:
        if cand.exists():
            try:
                model = SiecAnomalii.wczytaj(cand)
                if list(model.cechy) == list(cechy):
                    return model
            except Exception as e:
                print("Unable to load anomaly network:", e)
    return BazaOnline(cechy)
