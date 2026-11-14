"""
Wspolny modul cech - uzywany IDENTYCZNIE w Colab (trening) i na laptopie (dzialanie).

Dzieki temu cechy liczone podczas treningu (np. na filmach UTA-RLDD) sa dokladnie
takie same jak cechy liczone na zywo z kamery laptopa.

Zawartosc:
  - FaceAnalyzer       : MediaPipe FaceLandmarker (478 punktow + blendshapes + poza glowy)
  - EAR / MAR          : wskazniki otwarcia oczu i ust
  - wycinki oczu/twarzy: wejscie do sieci oczu (MRL Eye) i emocji (FER-2013)
  - FatigueTracker     : okno 60 s -> PERCLOS, mrugniecia, ziewniecia, ruchy glowy
  - rPPG (POS)         : tetno z koloru skory twarzy (bez treningu)
  - audio              : przygotowanie 4-sekundowego okna glosu dla modelu wav2vec2
"""
from __future__ import annotations

import collections
import math
from dataclasses import dataclass, field

import cv2
import numpy as np

# --------------------------------------------------------------------------- stale
FACE_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)

# Indeksy punktow siatki MediaPipe (478 pkt). Kolejnosc: p1..p6 jak w definicji EAR.
OKO_L = (33, 160, 158, 133, 153, 144)
OKO_P = (362, 385, 387, 263, 373, 380)
USTA_PION = ((82, 87), (13, 14), (312, 317))
USTA_POZIOM = (78, 308)
CZOLO = (109, 10, 338, 337, 151, 108)
POLICZEK_L = (117, 118, 101, 36, 205, 187, 123)
POLICZEK_P = (346, 347, 330, 266, 425, 411, 352)

ROZMIAR_OKA = 64        # wejscie sieci oczu (MRL Eye)
ROZMIAR_TWARZY = 48     # wejscie sieci emocji (FER-2013 ma 48x48)
MAKS_SZEROKOSC = 640    # klatki sa zmniejszane do tej szerokosci (trening i laptop)
TRACKER_FPS = 15        # z jaka czestotliwoscia karmimy FatigueTracker (trening == laptop)

AUDIO_SR = 16000
AUDIO_SEG = 4 * AUDIO_SR  # 4 s

# FER-2013: kolejnosc alfabetyczna folderow (tak jak ImageFolder / sorted())
EMOCJE_TWARZ = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
# RAVDESS: kody 01..08
EMOCJE_GLOS = ["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"]
NEGATYWNE = {"angry", "disgust", "fear", "fearful", "sad"}
PL = {
    "angry": "zlosc", "disgust": "wstret", "fear": "strach", "fearful": "strach",
    "happy": "radosc", "neutral": "neutralny", "sad": "smutek", "surprise": "zaskoczenie",
    "surprised": "zaskoczenie", "calm": "spokoj",
}
ZMECZENIE_KLASY = ["czujny", "obnizona czujnosc", "senny"]  # UTA-RLDD: 0 / 5 / 10

FEATURE_NAMES = [
    "face_ratio", "perclos", "closed_mean", "blinks_per_min", "blink_dur_mean",
    "long_closures_per_min", "ear_mean", "ear_std", "mar_mean", "mar_p95",
    "yawns_per_min", "pitch_mean", "pitch_std", "yaw_std", "roll_std",
]


# --------------------------------------------------------------------------- narzedzia
def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x = np.asarray(x, np.float64)
    e = np.exp(x - x.max(axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)


def resize_max(frame: np.ndarray, max_w: int = MAKS_SZEROKOSC) -> np.ndarray:
    h, w = frame.shape[:2]
    if w <= max_w:
        return frame
    s = max_w / w
    return cv2.resize(frame, (max_w, int(round(h * s))), interpolation=cv2.INTER_AREA)


def _d(a, b) -> float:
    return float(np.hypot(*(a - b)))


def ear(pts: np.ndarray, idx) -> float:
    p1, p2, p3, p4, p5, p6 = (pts[i] for i in idx)
    return (_d(p2, p6) + _d(p3, p5)) / (2.0 * _d(p1, p4) + 1e-6)


def ear_obu(pts: np.ndarray) -> float:
    return 0.5 * (ear(pts, OKO_L) + ear(pts, OKO_P))


def mar(pts: np.ndarray) -> float:
    v = np.mean([_d(pts[a], pts[b]) for a, b in USTA_PION])
    return float(v / (_d(pts[USTA_POZIOM[0]], pts[USTA_POZIOM[1]]) + 1e-6))


def poza_glowy(m) -> tuple[float, float, float]:
    """pitch, yaw, roll [stopnie] z macierzy transformacji MediaPipe (4x4)."""
    r = np.asarray(m, np.float64)[:3, :3]
    pitch = math.degrees(math.atan2(r[2, 1], r[2, 2]))
    yaw = math.degrees(math.asin(float(np.clip(-r[2, 0], -1.0, 1.0))))
    roll = math.degrees(math.atan2(r[1, 0], r[0, 0]))
    return pitch, yaw, roll


def wytnij_kwadrat(img: np.ndarray, cx: float, cy: float, bok: float, out: int) -> np.ndarray:
    """Kwadratowy wycinek (z powieleniem krawedzi poza obrazem) przeskalowany do out x out."""
    bok = max(int(round(bok)), 2)
    x0, y0 = int(round(cx - bok / 2)), int(round(cy - bok / 2))
    h, w = img.shape[:2]
    pl, pt = max(0, -x0), max(0, -y0)
    pr, pb = max(0, x0 + bok - w), max(0, y0 + bok - h)
    crop = img[max(0, y0):min(h, y0 + bok), max(0, x0):min(w, x0 + bok)]
    if crop.size == 0:
        return np.zeros((out, out), img.dtype)
    if pl or pt or pr or pb:
        crop = cv2.copyMakeBorder(crop, pt, pb, pl, pr, cv2.BORDER_REPLICATE)
    interp = cv2.INTER_AREA if bok > out else cv2.INTER_LINEAR
    return cv2.resize(crop, (out, out), interpolation=interp)


def wycinki_oczu(gray: np.ndarray, pts: np.ndarray, skala: float = 1.5) -> list[np.ndarray]:
    wyn = []
    for idx in (OKO_L, OKO_P):
        p = pts[list(idx)]
        c = p.mean(axis=0)
        bok = skala * _d(pts[idx[0]], pts[idx[3]])
        wyn.append(wytnij_kwadrat(gray, c[0], c[1], bok, ROZMIAR_OKA))
    return wyn


def wycinek_twarzy(gray: np.ndarray, pts: np.ndarray, margines: float = 0.10) -> np.ndarray:
    x0, y0 = pts.min(axis=0)
    x1, y1 = pts.max(axis=0)
    bok = max(x1 - x0, y1 - y0) * (1 + 2 * margines)
    return wytnij_kwadrat(gray, (x0 + x1) / 2, (y0 + y1) / 2, bok, ROZMIAR_TWARZY)


def srednie_rgb_skory(frame_bgr: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """Srednie RGB z czola i policzkow (do rPPG)."""
    h, w = frame_bgr.shape[:2]
    maska = np.zeros((h, w), np.uint8)
    for poly in (CZOLO, POLICZEK_L, POLICZEK_P):
        cv2.fillPoly(maska, [pts[list(poly)].astype(np.int32)], 255)
    if cv2.countNonZero(maska) < 50:
        return np.full(3, np.nan)
    b, g, r, _ = cv2.mean(frame_bgr, mask=maska)
    return np.array([r, g, b], np.float64)


# --------------------------------------------------------------------------- MediaPipe
@dataclass
class Obserwacja:
    pts: np.ndarray
    ear: float
    mar: float
    pitch: float
    yaw: float
    roll: float
    blend: dict = field(default_factory=dict)
    rgb: np.ndarray | None = None


class FaceAnalyzer:
    """Opakowanie FaceLandmarkera MediaPipe (tryb VIDEO). Jedna instancja na proces."""

    def __init__(self, model_path: str):
        from mediapipe.tasks.python import BaseOptions, vision

        opts = vision.FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model_path)),
            running_mode=vision.RunningMode.VIDEO,
            num_faces=1,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
        )
        self._lm = vision.FaceLandmarker.create_from_options(opts)
        self._ts = -1

    def przetworz(self, frame_bgr: np.ndarray, t_sek: float, z_rgb: bool = True) -> Obserwacja | None:
        import mediapipe as mp

        ts = int(t_sek * 1000)
        if ts <= self._ts:
            ts = self._ts + 1
        self._ts = ts
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        res = self._lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), ts)
        if not res.face_landmarks:
            return None
        h, w = frame_bgr.shape[:2]
        pts = np.array([[p.x * w, p.y * h] for p in res.face_landmarks[0]], np.float32)
        blend = {c.category_name: float(c.score) for c in res.face_blendshapes[0]} if res.face_blendshapes else {}
        if res.facial_transformation_matrixes:
            pitch, yaw, roll = poza_glowy(res.facial_transformation_matrixes[0])
        else:
            pitch = yaw = roll = float("nan")
        return Obserwacja(
            pts=pts, ear=ear_obu(pts), mar=mar(pts), pitch=pitch, yaw=yaw, roll=roll, blend=blend,
            rgb=srednie_rgb_skory(frame_bgr, pts) if z_rgb else None,
        )

    def close(self):
        self._lm.close()


class OnnxModel:
    def __init__(self, path: str, watki: int | None = None):
        import onnxruntime as ort

        so = ort.SessionOptions()
        if watki:
            so.intra_op_num_threads = watki
            so.inter_op_num_threads = 1
        self.s = ort.InferenceSession(str(path), so, providers=["CPUExecutionProvider"])
        self.we = self.s.get_inputs()[0].name

    def __call__(self, x: np.ndarray) -> np.ndarray:
        return self.s.run(None, {self.we: np.ascontiguousarray(x, np.float32)})[0]


def prawd_zamkniecia(obs: Obserwacja, gray: np.ndarray, model_oczu: OnnxModel | None) -> float:
    """0..1 - na ile oczy sa zamkniete. Siec MRL Eye, a bez niej blendshape MediaPipe."""
    if model_oczu is not None:
        p = []
        for crop in wycinki_oczu(gray, obs.pts):
            logit = model_oczu(crop[None, None].astype(np.float32) / 255.0)
            p.append(softmax(logit)[0, 1])
        return float(np.mean(p))
    return 0.5 * (obs.blend.get("eyeBlinkLeft", 0.0) + obs.blend.get("eyeBlinkRight", 0.0))


def wejscie_twarzy(gray: np.ndarray, pts: np.ndarray) -> np.ndarray:
    return wycinek_twarzy(gray, pts)[None, None].astype(np.float32) / 255.0


# --------------------------------------------------------------------------- zmeczenie
def _segmenty(maska: np.ndarray, t: np.ndarray) -> list[float]:
    """Czasy trwania ciaglych odcinkow True."""
    dl, start = [], None
    for i, m in enumerate(maska):
        if m and start is None:
            start = i
        elif not m and start is not None:
            dl.append(t[i] - t[start])
            start = None
    if start is not None:
        dl.append(t[-1] - t[start])
    return dl


class FatigueTracker:
    """Okno przesuwne (domyslnie 60 s) -> wektor cech FEATURE_NAMES."""

    def __init__(self, okno: float = 60.0, prog_mar: float = 0.5):
        self.okno = okno
        self.prog_mar = prog_mar
        self.buf: collections.deque = collections.deque()

    def dodaj(self, t: float, obs: Obserwacja | None, zamk: float | None):
        nan = float("nan")
        if obs is None or zamk is None:
            self.buf.append((t, nan, nan, nan, nan, nan, nan))
        else:
            self.buf.append((t, zamk, obs.ear, obs.mar, obs.pitch, obs.yaw, obs.roll))
        while self.buf and self.buf[0][0] < t - self.okno:
            self.buf.popleft()

    def zakres(self) -> float:
        return self.buf[-1][0] - self.buf[0][0] if len(self.buf) > 1 else 0.0

    def cechy(self) -> np.ndarray:
        a = np.array(self.buf, np.float64)
        f = dict.fromkeys(FEATURE_NAMES, float("nan"))
        if len(a) < 2:
            return np.array([f[n] for n in FEATURE_NAMES], np.float32)
        t = a[:, 0]
        twarz = ~np.isnan(a[:, 1])
        dur = max(t[-1] - t[0], 1e-6)
        f["face_ratio"] = float(twarz.mean())
        if twarz.sum() >= 10:
            tf, b = t[twarz], a[twarz]
            zam = b[:, 1] > 0.5
            seg = _segmenty(zam, tf)
            mrug = [d for d in seg if 0.04 <= d < 0.5]
            dlugie = [d for d in seg if d >= 0.5]
            ziew = [d for d in _segmenty(b[:, 3] > self.prog_mar, tf) if d >= 1.0]
            f.update(
                perclos=float(zam.mean()),
                closed_mean=float(b[:, 1].mean()),
                blinks_per_min=len(mrug) / dur * 60,
                blink_dur_mean=float(np.mean(mrug)) if mrug else 0.0,
                long_closures_per_min=len(dlugie) / dur * 60,
                ear_mean=float(b[:, 2].mean()),
                ear_std=float(b[:, 2].std()),
                mar_mean=float(b[:, 3].mean()),
                mar_p95=float(np.percentile(b[:, 3], 95)),
                yawns_per_min=len(ziew) / dur * 60,
                pitch_mean=float(np.nanmean(b[:, 4])),
                pitch_std=float(np.nanstd(b[:, 4])),
                yaw_std=float(np.nanstd(b[:, 5])),
                roll_std=float(np.nanstd(b[:, 6])),
            )
        return np.array([f[n] for n in FEATURE_NAMES], np.float32)


def zmeczenie_heurystyka(c: np.ndarray) -> float:
    """Wynik 0-100, gdy nie ma wytrenowanego modelu zmeczenia."""
    f = dict(zip(FEATURE_NAMES, c))
    if not np.isfinite(f["perclos"]):
        return float("nan")
    s = f["perclos"] * 250 + f["long_closures_per_min"] * 10 + f["yawns_per_min"] * 15
    return float(np.clip(s, 0, 100))


# --------------------------------------------------------------------------- przetwarzanie filmow (Colab)
def klatki_filmu(path: str, fps_cel: float | None):
    """Generator (t_sek, klatka_bgr). fps_cel=None -> wszystkie klatki."""
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps < 1 or fps > 240:
        fps = 30.0
    krok = max(1, round(fps / fps_cel)) if fps_cel else 1
    i = 0
    while True:
        if i % krok == 0:
            ok, fr = cap.read()
        else:
            ok, fr = cap.grab(), None
        if not ok:
            break
        if fr is not None:
            yield i / fps, fr
        i += 1
    cap.release()


def cechy_z_filmu(path: str, landmarker: str, model_oczu: str | None, prog_mar: float,
                  okno: float = 60.0, krok: float = 10.0) -> np.ndarray:
    """Film -> macierz (n_okien, len(FEATURE_NAMES)). Uzywane do treningu na UTA-RLDD."""
    fa = FaceAnalyzer(landmarker)
    oczy = OnnxModel(model_oczu, watki=1) if model_oczu else None
    tr = FatigueTracker(okno, prog_mar)
    out, nastepny = [], okno
    for t, fr in klatki_filmu(path, TRACKER_FPS):
        fr = resize_max(fr)
        obs = fa.przetworz(fr, t, z_rgb=False)
        zamk = prawd_zamkniecia(obs, cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY), oczy) if obs else None
        tr.dodaj(t, obs, zamk)
        if t >= nastepny:
            out.append(tr.cechy())
            nastepny += krok
    fa.close()
    return np.array(out, np.float32).reshape(-1, len(FEATURE_NAMES))


def mar_z_filmu(path: str, landmarker: str) -> np.ndarray:
    """MAR klatka po klatce (TRACKER_FPS). Uzywane do kalibracji progu ziewania na YawDD."""
    fa = FaceAnalyzer(landmarker)
    wyn = []
    for t, fr in klatki_filmu(path, TRACKER_FPS):
        obs = fa.przetworz(resize_max(fr), t, z_rgb=False)
        if obs:
            wyn.append(obs.mar)
    fa.close()
    return np.array(wyn, np.float32)


def rgb_z_filmu(path: str, landmarker: str) -> tuple[np.ndarray, np.ndarray, float]:
    """(t, rgb[N,3], fps) dla kazdej klatki. Uzywane do walidacji rPPG na UBFC-rPPG."""
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.release()
    fa = FaceAnalyzer(landmarker)
    t_l, rgb_l = [], []
    for t, fr in klatki_filmu(path, None):
        fr = resize_max(fr)
        obs = fa.przetworz(fr, t)
        t_l.append(t)
        rgb_l.append(obs.rgb if obs is not None else np.full(3, np.nan))
    fa.close()
    return np.array(t_l), np.array(rgb_l), float(fps)


# --------------------------------------------------------------------------- rPPG (POS)
def uzupelnij_nan(x: np.ndarray) -> np.ndarray:
    x = np.array(x, np.float64)
    for k in range(x.shape[1]):
        c = x[:, k]
        ok = np.isfinite(c)
        if ok.sum() >= 2 and not ok.all():
            c[~ok] = np.interp(np.flatnonzero(~ok), np.flatnonzero(ok), c[ok])
    return x


def przeprobkuj(t: np.ndarray, x: np.ndarray, fs: float) -> np.ndarray:
    tt = np.arange(t[0], t[-1], 1.0 / fs)
    return np.stack([np.interp(tt, t, x[:, k]) for k in range(x.shape[1])], axis=1)


def pos_bvp(rgb: np.ndarray, fs: float) -> np.ndarray:
    """Plane-Orthogonal-to-Skin (Wang i in., 2017)."""
    n = len(rgb)
    l = int(round(1.6 * fs))
    h = np.zeros(n)
    proj = np.array([[0.0, 1.0, -1.0], [-2.0, 1.0, 1.0]])
    for k in range(l, n + 1):
        c = rgb[k - l:k].T
        m = c.mean(axis=1, keepdims=True)
        if np.any(m <= 0):
            continue
        s = proj @ (c / m)
        hh = s[0] + (s[0].std() / (s[1].std() + 1e-9)) * s[1]
        h[k - l:k] += hh - hh.mean()
    return h


def pasmowy(x: np.ndarray, fs: float, lo: float = 0.7, hi: float = 3.0) -> np.ndarray:
    from scipy.signal import butter, filtfilt

    b, a = butter(3, [lo, hi], btype="band", fs=fs)
    return filtfilt(b, a, x)


def tetno_z_sygnalu(x: np.ndarray, fs: float, lo: float = 0.7, hi: float = 3.0) -> tuple[float, float]:
    """(BPM, SNR w dB) z widma sygnalu."""
    x = (x - x.mean()) * np.hanning(len(x))
    nfft = max(8192, 1 << int(np.ceil(np.log2(len(x) * 4))))
    widmo = np.abs(np.fft.rfft(x, nfft)) ** 2
    f = np.fft.rfftfreq(nfft, 1.0 / fs)
    pas = (f >= lo) & (f <= hi)
    if not pas.any():
        return float("nan"), float("-inf")
    fp = f[pas][np.argmax(widmo[pas])]
    sygn = (np.abs(f - fp) <= 0.1) | (np.abs(f - 2 * fp) <= 0.2)
    snr = 10 * np.log10(widmo[pas & sygn].sum() / (widmo[pas & ~sygn].sum() + 1e-12) + 1e-12)
    return float(fp * 60.0), float(snr)


def tetno_rppg(t: np.ndarray, rgb: np.ndarray, fs: float = 30.0) -> tuple[float, float]:
    rgb = uzupelnij_nan(rgb)
    if not np.isfinite(rgb).all() or len(t) < fs * 4:
        return float("nan"), float("-inf")
    x = przeprobkuj(np.asarray(t, np.float64), rgb, fs)
    return tetno_z_sygnalu(pasmowy(pos_bvp(x, fs), fs), fs)


# --------------------------------------------------------------------------- audio
def normalizuj_audio(w: np.ndarray) -> np.ndarray:
    w = np.asarray(w, np.float32)
    return ((w - w.mean()) / np.sqrt(w.var() + 1e-7)).astype(np.float32)


def dopasuj_dlugosc(w: np.ndarray, n: int = AUDIO_SEG, start: int | None = None) -> np.ndarray:
    """Przytnij/dopelnij do n probek (domyslnie srodek)."""
    if len(w) >= n:
        s = (len(w) - n) // 2 if start is None else start
        return w[s:s + n]
    out = np.zeros(n, np.float32)
    s = (n - len(w)) // 2 if start is None else start
    out[s:s + len(w)] = w
    return out
