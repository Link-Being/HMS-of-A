"""
Acoustic speech biomarkers computed with Praat via Parselmouth.

For each speech window (default 4 s at 16 kHz) computes:
  f0_hz        median vocal pitch F0                                  [Hz]
  f0_sd_st     intonation pitch standard deviation                    [semitones]
  f0_zakres_st pitch range p95 - p5                                   [semitones]
  jitter       local vocal fold period perturbation                   [%]
  shimmer      local amplitude perturbation                           [%]
  hnr_db       harmonics-to-noise ratio (hoarseness / breathiness)    [dB]
  cpps_db      smoothed cepstral peak prominence (phonation quality)  [dB]
  glosnosc_db  mean speech intensity (relative, uncalibrated)         [dB]
  glosnosc_sd  intensity variability                                  [dB]
  tempo_syl_s  estimated syllable rate during active speech           [syl/s]
  pauzy_proc   pause ratio within the speech window                   [%]
  alpha_db     spectral slope energy 1-5 kHz vs 50 Hz-1 kHz           [dB]

Absolute values vary across speakers and microphones; comparison against an
individual VoiceBaseline via z-scores is therefore preferred. Tension and voice
fatigue indices are literature heuristics and do not constitute clinical diagnosis.
"""
from __future__ import annotations

import collections
import json
import pathlib

import numpy as np

# (metric_key, display_label, format_spec, minimum_baseline_sd)
BIOMARKERS = [
    ("f0_hz", "F0", "{:.0f} Hz", 8.0),
    ("f0_sd_st", "Intonation std", "{:.1f} st", 0.4),
    ("f0_zakres_st", "F0 range", "{:.1f} st", 1.0),
    ("jitter", "Jitter", "{:.2f} %", 0.15),
    ("shimmer", "Shimmer", "{:.1f} %", 0.8),
    ("hnr_db", "HNR", "{:.1f} dB", 1.0),
    ("cpps_db", "CPPS", "{:.1f} dB", 0.8),
    ("glosnosc_db", "Loudness", "{:.0f} dB", 2.0),
    ("glosnosc_sd", "Loudness std", "{:.1f} dB", 0.8),
    ("tempo_syl_s", "Speech rate", "{:.1f} syl/s", 0.4),
    ("pauzy_proc", "Pauses", "{:.0f} %", 5.0),
    ("alpha_db", "Spectral tilt", "{:.1f} dB", 1.5),
]
BIOMARKER_KEYS = [k for k, *_ in BIOMARKERS]

# Z-score directional weights; +1 means increase in biomarker raises index.
TENSION_WEIGHTS = {
    "f0_hz": 1.0,
    "glosnosc_db": 0.7,
    "tempo_syl_s": 0.6,
    "jitter": 0.5,
    "alpha_db": 0.5,
    "hnr_db": -0.4,
}
FATIGUE_WEIGHTS = {
    "f0_sd_st": -1.0,
    "f0_zakres_st": -0.6,
    "tempo_syl_s": -0.8,
    "pauzy_proc": 0.8,
    "glosnosc_db": -0.6,
    "cpps_db": -0.6,
    "shimmer": 0.4,
    "hnr_db": -0.4,
}


def analyze_voice(w: np.ndarray, sr: int = 16000) -> dict | None:
    """Computes acoustic biomarkers for one window. Returns None if < 0.4 s voiced speech."""
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
    semitones = 12.0 * np.log2(f0v / 100.0)

    out = {
        "f0_hz": float(np.median(f0v)),
        "f0_sd_st": float(np.std(semitones)),
        "f0_zakres_st": float(np.percentile(semitones, 95) - np.percentile(semitones, 5)),
    }

    def safe_eval(fn):
        try:
            v = float(fn())
            return v if np.isfinite(v) else float("nan")
        except Exception:
            return float("nan")

    pp = call(snd, "To PointProcess (periodic, cc)", 75, 500)
    out["jitter"] = safe_eval(lambda: call(pp, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3) * 100)
    out["shimmer"] = safe_eval(lambda: call([snd, pp], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6) * 100)

    harm = snd.to_harmonicity_cc(time_step=0.01, minimum_pitch=75.0, silence_threshold=0.1, periods_per_window=1.0)
    hv = harm.values[harm.values > -199]
    out["hnr_db"] = float(np.mean(hv)) if len(hv) else float("nan")

    out["cpps_db"] = safe_eval(
        lambda: call(
            call(snd, "To PowerCepstrogram", 60, 0.002, 5000, 50),
            "Get CPPS",
            "yes", 0.02, 0.0005, 60, 330, 0.05, "parabolic", 0.001, 0.05,
            "Straight", "Robust",
        )
    )

    # Loudness, pauses, and syllable rate following de Jong & Wempe (2009)
    intensity = snd.to_intensity(minimum_pitch=75.0, time_step=0.01)
    db = intensity.values[0]
    t_db = intensity.xs()
    thresh = np.percentile(db, 95) - 25.0
    voiced_energy = db > thresh
    out["pauzy_proc"] = float(100.0 * (1.0 - voiced_energy.mean()))
    out["glosnosc_db"] = float(np.mean(db[voiced_energy])) if voiced_energy.any() else float("nan")
    out["glosnosc_sd"] = float(np.std(db[voiced_energy])) if voiced_energy.sum() > 2 else float("nan")

    voiced_pitch = np.array([pitch.get_value_at_time(t) for t in t_db])
    voiced_pitch = np.nan_to_num(voiced_pitch) > 0
    syllables, last_min, last_peak = 0, np.inf, None
    syl_thresh = max(thresh, np.median(db))
    for i in range(1, len(db) - 1):
        last_min = min(last_min, db[i])
        if db[i] >= db[i - 1] and db[i] > db[i + 1] and db[i] > syl_thresh and voiced_pitch[i]:
            if last_peak is None or db[i] - last_min >= 2.0:
                syllables += 1
                last_peak, last_min = db[i], np.inf
    speech_sec = voiced_energy.sum() * 0.01
    out["tempo_syl_s"] = float(syllables / speech_sec) if speech_sec > 0.3 else float("nan")

    # Spectral slope / alpha ratio from FFT
    spectrum = np.abs(np.fft.rfft(w * np.hanning(len(w)))) ** 2
    freqs = np.fft.rfftfreq(len(w), 1.0 / sr)
    low_band = spectrum[(freqs >= 50) & (freqs < 1000)].sum()
    high_band = spectrum[(freqs >= 1000) & (freqs < 5000)].sum()
    out["alpha_db"] = float(10 * np.log10((high_band + 1e-12) / (low_band + 1e-12)))
    return out


class VoiceBaseline:
    """Personal voice baseline: median and std dev across the initial N windows."""

    def __init__(self, path: pathlib.Path, baseline_windows: int = 12, rolling_windows: int = 6):
        self.path = pathlib.Path(path)
        self.baseline_windows = baseline_windows
        self.samples: list[dict] = []
        self.recent: collections.deque = collections.deque(maxlen=rolling_windows)
        self.mean: dict | None = None
        self.sd: dict | None = None
        if self.path.exists():
            try:
                d = json.loads(self.path.read_text(encoding="utf-8"))
                self.mean = d.get("srednia") or d.get("mean")
                self.sd = d.get("sd")
            except Exception:
                pass

    @property
    def ready(self) -> bool:
        return self.mean is not None

    def progress(self) -> float:
        return 1.0 if self.ready else len(self.samples) / self.baseline_windows

    def add(self, b: dict):
        self.recent.append(b)
        if self.ready:
            return
        self.samples.append(b)
        if len(self.samples) >= self.baseline_windows:
            min_sd = {k: m for k, _, _, m in BIOMARKERS}
            self.mean = {k: float(np.nanmedian([p[k] for p in self.samples])) for k in BIOMARKER_KEYS}
            self.sd = {k: float(max(np.nanstd([p[k] for p in self.samples]), min_sd[k])) for k in BIOMARKER_KEYS}
            self.path.write_text(json.dumps({"mean": self.mean, "sd": self.sd}, indent=2), encoding="utf-8")

    def current(self) -> dict | None:
        """Median across recent rolling windows (more stable than a single 4 s clip)."""
        if not self.recent:
            return None
        return {k: float(np.nanmedian([o[k] for o in self.recent])) for k in BIOMARKER_KEYS}

    def z_scores(self, b: dict) -> dict:
        if not self.ready:
            return {}
        return {
            k: (b[k] - self.mean[k]) / self.sd[k]
            for k in BIOMARKER_KEYS
            if np.isfinite(b.get(k, np.nan)) and np.isfinite(self.mean.get(k, np.nan))
        }


def compute_index(z: dict, weights: dict) -> float:
    """Computes a 0-100 index (50 = nominal baseline) from a weighted z-score sum."""
    pairs = [(w, z[k]) for k, w in weights.items() if k in z]
    if not pairs:
        return float("nan")
    s = sum(w * np.clip(v, -3, 3) for w, v in pairs) / sum(abs(w) for w, _ in pairs)
    return float(np.clip(50 + 25 * s, 0, 100))
