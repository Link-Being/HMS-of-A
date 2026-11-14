"""
Biomarkery glosu (akustyka mowy) liczone Praatem przez Parselmouth.

Dla kazdego okna mowy (domyslnie 4 s, 16 kHz) liczone sa:
  f0_hz        srednia wysokosc glosu (mediana F0)                        [Hz]
  f0_sd_st     zmiennosc intonacji (odch. std. F0)                        [polton]
  f0_zakres_st zakres intonacji (p95 - p5)                                [polton]
  jitter       niestabilnosc okresu drgan fald glosowych (local)          [%]
  shimmer      niestabilnosc amplitudy drgan (local)                      [%]
  hnr_db       stosunek harmonicznych do szumu (chrypka / zadyszka)       [dB]
  cpps_db      wyrazistosc piku cepstralnego (jakosc fonacji, chrypka)    [dB]
  glosnosc_db  srednia intensywnosc mowy (wzgledna, bez kalibracji SPL)   [dB]
  glosnosc_sd  zmiennosc glosnosci                                        [dB]
  tempo_syl_s  tempo mowy (szacowane jadra sylab / s mowy)                [syl/s]
  pauzy_proc   udzial pauz w oknie                                        [%]
  alpha_db     nachylenie widma: energia 1-5 kHz vs 50 Hz-1 kHz            [dB]

Wartosci bezwzgledne zaleza od osoby i mikrofonu, dlatego wazniejsze jest porownanie
z wlasna baza (BazaGlosu -> z-score). Indeksy "napiecie" i "zmeczenie glosu" to
heurystyki oparte na kierunkach zmian opisywanych w literaturze, NIE diagnoza.
"""
from __future__ import annotations

import collections
import json
import pathlib

import numpy as np

# (klucz, etykieta ASCII do okna OpenCV, format, minimalne odch. std. bazy)
BIOMARKERY = [
    ("f0_hz", "F0", "{:.0f} Hz", 8.0),
    ("f0_sd_st", "Intonacja (zmiennosc)", "{:.1f} st", 0.4),
    ("f0_zakres_st", "Zakres F0", "{:.1f} st", 1.0),
    ("jitter", "Jitter", "{:.2f} %", 0.15),
    ("shimmer", "Shimmer", "{:.1f} %", 0.8),
    ("hnr_db", "HNR", "{:.1f} dB", 1.0),
    ("cpps_db", "CPPS", "{:.1f} dB", 0.8),
    ("glosnosc_db", "Glosnosc", "{:.0f} dB", 2.0),
    ("glosnosc_sd", "Zmiennosc glosnosci", "{:.1f} dB", 0.8),
    ("tempo_syl_s", "Tempo mowy", "{:.1f} syl/s", 0.4),
    ("pauzy_proc", "Pauzy", "{:.0f} %", 5.0),
    ("alpha_db", "Nachylenie widma", "{:.1f} dB", 1.5),
]
KLUCZE = [k for k, *_ in BIOMARKERY]

# Kierunki zmian (z-score) skladajace sie na indeksy. +1: wzrost markera podnosi indeks.
NAPIECIE = {"f0_hz": 1.0, "glosnosc_db": 0.7, "tempo_syl_s": 0.6, "jitter": 0.5, "alpha_db": 0.5, "hnr_db": -0.4}
ZMECZENIE = {"f0_sd_st": -1.0, "f0_zakres_st": -0.6, "tempo_syl_s": -0.8, "pauzy_proc": 0.8,
             "glosnosc_db": -0.6, "cpps_db": -0.6, "shimmer": 0.4, "hnr_db": -0.4}


def analizuj(w: np.ndarray, sr: int = 16000) -> dict | None:
    """Biomarkery jednego okna. None, gdy za malo mowy dzwiecznej (< 0.4 s)."""
    import parselmouth
    from parselmouth.praat import call

    w = np.asarray(w, np.float64)
    if not np.isfinite(w).all() or np.abs(w).max() < 1e-4:
        return None
    snd = parselmouth.Sound(w, sampling_frequency=sr)

    pitch = snd.to_pitch_ac(time_step=0.01, pitch_floor=75.0, pitch_ceiling=500.0)
    f0 = pitch.selected_array["frequency"]
    f0v = f0[f0 > 0]
    if len(f0v) < 40:
        return None
    st = 12.0 * np.log2(f0v / 100.0)

    wyn = {
        "f0_hz": float(np.median(f0v)),
        "f0_sd_st": float(np.std(st)),
        "f0_zakres_st": float(np.percentile(st, 95) - np.percentile(st, 5)),
    }

    def bezp(f):
        try:
            v = float(f())
            return v if np.isfinite(v) else float("nan")
        except Exception:
            return float("nan")

    pp = call(snd, "To PointProcess (periodic, cc)", 75, 500)
    wyn["jitter"] = bezp(lambda: call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3) * 100)
    wyn["shimmer"] = bezp(lambda: call([snd, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6) * 100)

    harm = snd.to_harmonicity_cc(time_step=0.01, minimum_pitch=75.0, silence_threshold=0.1, periods_per_window=1.0)
    hv = harm.values[harm.values > -199]
    wyn["hnr_db"] = float(np.mean(hv)) if len(hv) else float("nan")

    wyn["cpps_db"] = bezp(lambda: call(call(snd, "To PowerCepstrogram", 60, 0.002, 5000, 50), "Get CPPS",
                                       "yes", 0.02, 0.0005, 60, 330, 0.05, "parabolic", 0.001, 0.05,
                                       "Straight", "Robust"))  # "Robust slow" trwa ~50 s na okno

    # glosnosc, pauzy, tempo (jadra sylab wg idei de Jong & Wempe 2009)
    inten = snd.to_intensity(minimum_pitch=75.0, time_step=0.01)
    db = inten.values[0]
    tdb = inten.xs()
    prog = np.percentile(db, 95) - 25.0
    mowa = db > prog
    wyn["pauzy_proc"] = float(100.0 * (1.0 - mowa.mean()))
    wyn["glosnosc_db"] = float(np.mean(db[mowa])) if mowa.any() else float("nan")
    wyn["glosnosc_sd"] = float(np.std(db[mowa])) if mowa.sum() > 2 else float("nan")

    dzw = np.array([pitch.get_value_at_time(t) for t in tdb])
    dzw = np.nan_to_num(dzw) > 0
    sylaby, ost_min, ost_pik = 0, np.inf, None
    prog_syl = max(prog, np.median(db))
    for i in range(1, len(db) - 1):
        ost_min = min(ost_min, db[i])
        if db[i] >= db[i - 1] and db[i] > db[i + 1] and db[i] > prog_syl and dzw[i]:
            if ost_pik is None or db[i] - ost_min >= 2.0:
                sylaby += 1
                ost_pik, ost_min = db[i], np.inf
    czas_mowy = mowa.sum() * 0.01
    wyn["tempo_syl_s"] = float(sylaby / czas_mowy) if czas_mowy > 0.3 else float("nan")

    # nachylenie widma (alpha ratio) z ramek mowy
    widmo = np.abs(np.fft.rfft(w * np.hanning(len(w)))) ** 2
    f = np.fft.rfftfreq(len(w), 1.0 / sr)
    nisk = widmo[(f >= 50) & (f < 1000)].sum()
    wys = widmo[(f >= 1000) & (f < 5000)].sum()
    wyn["alpha_db"] = float(10 * np.log10((wys + 1e-12) / (nisk + 1e-12)))
    return wyn


class BazaGlosu:
    """Osobista baza odniesienia: srednia i odch. std. z pierwszych N okien mowy (zapisywana na dysk)."""

    def __init__(self, sciezka: pathlib.Path, n_bazy: int = 12, okno_biezace: int = 6):
        self.sciezka = pathlib.Path(sciezka)
        self.n_bazy = n_bazy
        self.probki: list[dict] = []
        self.ostatnie: collections.deque = collections.deque(maxlen=okno_biezace)
        self.srednia: dict | None = None
        self.sd: dict | None = None
        if self.sciezka.exists():
            try:
                d = json.loads(self.sciezka.read_text(encoding="utf-8"))
                self.srednia, self.sd = d["srednia"], d["sd"]
            except Exception:
                pass

    @property
    def gotowa(self) -> bool:
        return self.srednia is not None

    def postep(self) -> float:
        return 1.0 if self.gotowa else len(self.probki) / self.n_bazy

    def dodaj(self, b: dict):
        self.ostatnie.append(b)
        if self.gotowa:
            return
        self.probki.append(b)
        if len(self.probki) >= self.n_bazy:
            minsd = {k: m for k, _, _, m in BIOMARKERY}
            self.srednia = {k: float(np.nanmedian([p[k] for p in self.probki])) for k in KLUCZE}
            self.sd = {k: float(max(np.nanstd([p[k] for p in self.probki]), minsd[k])) for k in KLUCZE}
            self.sciezka.write_text(json.dumps({"srednia": self.srednia, "sd": self.sd}, indent=2), encoding="utf-8")

    def biezace(self) -> dict | None:
        """Mediana z ostatnich okien (stabilniejsza niz pojedyncze 4 s)."""
        if not self.ostatnie:
            return None
        return {k: float(np.nanmedian([o[k] for o in self.ostatnie])) for k in KLUCZE}

    def z(self, b: dict) -> dict:
        if not self.gotowa:
            return {}
        return {k: (b[k] - self.srednia[k]) / self.sd[k] for k in KLUCZE
                if np.isfinite(b.get(k, np.nan)) and np.isfinite(self.srednia.get(k, np.nan))}


def indeks(z: dict, wagi: dict) -> float:
    """Indeks 0-100 (50 = jak w bazie) z wazonej sumy z-score."""
    pary = [(w, z[k]) for k, w in wagi.items() if k in z]
    if not pary:
        return float("nan")
    s = sum(w * np.clip(v, -3, 3) for w, v in pary) / sum(abs(w) for w, _ in pary)
    return float(np.clip(50 + 25 * s, 0, 100))
