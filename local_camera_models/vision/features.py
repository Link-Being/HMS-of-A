"""
Shared vision and audio feature extraction module for HMS-of-A local models.

Uses identical preprocessing during offline Colab/GPU training (e.g. UTA-RLDD)
and live laptop inference from webcam and microphone streams.

Components:
  - FaceAnalyzer    : MediaPipe FaceLandmarker (478 landmarks, blendshapes, head pose)
  - EAR / MAR       : Eye Aspect Ratio and Mouth Aspect Ratio indicators
  - Eye/face crops  : gray inputs prepared for eye-state (MRL Eye) and FER-2013 ONNX models
  - FatigueTracker  : 60 s sliding window computing PERCLOS, blinks, yawns, and head motion
  - rPPG POS        : non-contact heart rate estimation from facial skin color
  - Audio helpers   : 4 s audio window normalization and framing for wav2vec2 ONNX
"""
from __future__ import annotations

import collections
import math
from dataclasses import dataclass, field

import cv2
import numpy as np

# --------------------------------------------------------------------------- Constants
FACE_LANDMARKER_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)

# MediaPipe FaceMesh 478-landmark indices ordered p1..p6 per standard EAR definition.
LEFT_EYE_IDX = (33, 160, 158, 133, 153, 144)
RIGHT_EYE_IDX = (362, 385, 387, 263, 373, 380)
MOUTH_VERT_IDX = ((82, 87), (13, 14), (312, 317))
MOUTH_HORIZ_IDX = (78, 308)
FOREHEAD_IDX = (109, 10, 338, 337, 151, 108)
LEFT_CHEEK_IDX = (117, 118, 101, 36, 205, 187, 123)
RIGHT_CHEEK_IDX = (346, 347, 330, 266, 425, 411, 352)

EYE_INPUT_SIZE = 64     # Input crop size for oczy.onnx trained on MRL Eye
FACE_INPUT_SIZE = 48    # Input crop size for emocje_twarz.onnx trained on FER-2013
MAX_FRAME_WIDTH = 640   # Video frames are resized to this width before inference
TRACKER_FPS = 15        # Target sampling rate fed into FatigueTracker

AUDIO_SR = 16000
AUDIO_SEG = 4 * AUDIO_SR  # 4-second window at 16 kHz

# Class label order matching training ImageFolder alphabetical directories
FACE_EMOTIONS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
# RAVDESS emotional classes for codes 01..08
VOICE_EMOTIONS = ["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"]
NEGATIVE_EMOTIONS = {"angry", "disgust", "fear", "fearful", "sad"}
FATIGUE_CLASSES = ["alert", "low_vigilance", "drowsy"]  # UTA-RLDD labels 0 / 5 / 10

FEATURE_NAMES = [
    "face_ratio", "perclos", "closed_mean", "blinks_per_min", "blink_dur_mean",
    "long_closures_per_min", "ear_mean", "ear_std", "mar_mean", "mar_p95",
    "yawns_per_min", "pitch_mean", "pitch_std", "yaw_std", "roll_std",
]


# --------------------------------------------------------------------------- Helpers
def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x = np.asarray(x, np.float64)
    e = np.exp(x - x.max(axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)


def resize_max(frame: np.ndarray, max_w: int = MAX_FRAME_WIDTH) -> np.ndarray:
    h, w = frame.shape[:2]
    if w <= max_w:
        return frame
    s = max_w / w
    return cv2.resize(frame, (max_w, int(round(h * s))), interpolation=cv2.INTER_AREA)


def _dist(a, b) -> float:
    return float(np.hypot(*(a - b)))


def compute_ear(pts: np.ndarray, idx) -> float:
    p1, p2, p3, p4, p5, p6 = (pts[i] for i in idx)
    return (_dist(p2, p6) + _dist(p3, p5)) / (2.0 * _dist(p1, p4) + 1e-6)


def mean_ear(pts: np.ndarray) -> float:
    return 0.5 * (compute_ear(pts, LEFT_EYE_IDX) + compute_ear(pts, RIGHT_EYE_IDX))


def compute_mar(pts: np.ndarray) -> float:
    v = np.mean([_dist(pts[a], pts[b]) for a, b in MOUTH_VERT_IDX])
    return float(v / (_dist(pts[MOUTH_HORIZ_IDX[0]], pts[MOUTH_HORIZ_IDX[1]]) + 1e-6))


def extract_head_pose(matrix) -> tuple[float, float, float]:
    """Extracts pitch, yaw, and roll angles in degrees from a 4x4 MediaPipe matrix."""
    r = np.asarray(matrix, np.float64)[:3, :3]
    pitch = math.degrees(math.atan2(r[2, 1], r[2, 2]))
    yaw = math.degrees(math.asin(float(np.clip(-r[2, 0], -1.0, 1.0))))
    roll = math.degrees(math.atan2(r[1, 0], r[0, 0]))
    return pitch, yaw, roll


def crop_square(img: np.ndarray, cx: float, cy: float, size: float, out_size: int) -> np.ndarray:
    """Crops a square patch with edge replication padding and resizes to out_size."""
    side = max(int(round(size)), 2)
    x0, y0 = int(round(cx - side / 2)), int(round(cy - side / 2))
    h, w = img.shape[:2]
    pl, pt = max(0, -x0), max(0, -y0)
    pr, pb = max(0, x0 + side - w), max(0, y0 + side - h)
    crop = img[max(0, y0):min(h, y0 + side), max(0, x0):min(w, x0 + side)]
    if crop.size == 0:
        return np.zeros((out_size, out_size), img.dtype)
    if pl or pt or pr or pb:
        crop = cv2.copyMakeBorder(crop, pt, pb, pl, pr, cv2.BORDER_REPLICATE)
    interp = cv2.INTER_AREA if side > out_size else cv2.INTER_LINEAR
    return cv2.resize(crop, (out_size, out_size), interpolation=interp)


def extract_eye_crops(gray: np.ndarray, pts: np.ndarray, scale: float = 1.5) -> list[np.ndarray]:
    crops = []
    for idx in (LEFT_EYE_IDX, RIGHT_EYE_IDX):
        p = pts[list(idx)]
        center = p.mean(axis=0)
        side = scale * _dist(pts[idx[0]], pts[idx[3]])
        crops.append(crop_square(gray, center[0], center[1], side, EYE_INPUT_SIZE))
    return crops


def extract_face_crop(gray: np.ndarray, pts: np.ndarray, margin: float = 0.10) -> np.ndarray:
    x0, y0 = pts.min(axis=0)
    x1, y1 = pts.max(axis=0)
    side = max(x1 - x0, y1 - y0) * (1 + 2 * margin)
    return crop_square(gray, (x0 + x1) / 2, (y0 + y1) / 2, side, FACE_INPUT_SIZE)


def sample_skin_rgb(frame_bgr: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """Computes mean R, G, B skin values across forehead and cheeks for rPPG."""
    h, w = frame_bgr.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    for poly in (FOREHEAD_IDX, LEFT_CHEEK_IDX, RIGHT_CHEEK_IDX):
        cv2.fillPoly(mask, [pts[list(poly)].astype(np.int32)], 255)
    if cv2.countNonZero(mask) < 50:
        return np.full(3, np.nan)
    b, g, r, _ = cv2.mean(frame_bgr, mask=mask)
    return np.array([r, g, b], np.float64)


# --------------------------------------------------------------------------- MediaPipe & ONNX
@dataclass
class FaceObservation:
    pts: np.ndarray
    ear: float
    mar: float
    pitch: float
    yaw: float
    roll: float
    blend: dict = field(default_factory=dict)
    rgb: np.ndarray | None = None


class FaceAnalyzer:
    """Wrapper around MediaPipe FaceLandmarker in VIDEO mode. One instance per process."""

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

    def process(self, frame_bgr: np.ndarray, t_sec: float, include_rgb: bool = True) -> FaceObservation | None:
        import mediapipe as mp

        ts = int(t_sec * 1000)
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
            pitch, yaw, roll = extract_head_pose(res.facial_transformation_matrixes[0])
        else:
            pitch = yaw = roll = float("nan")
        return FaceObservation(
            pts=pts,
            ear=mean_ear(pts),
            mar=compute_mar(pts),
            pitch=pitch,
            yaw=yaw,
            roll=roll,
            blend=blend,
            rgb=sample_skin_rgb(frame_bgr, pts) if include_rgb else None,
        )

    def close(self):
        self._lm.close()


class OnnxModel:
    """Lightweight CPU ONNX Runtime inference wrapper."""

    def __init__(self, path: str, threads: int | None = None):
        import onnxruntime as ort

        so = ort.SessionOptions()
        if threads:
            so.intra_op_num_threads = threads
            so.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(path), so, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def __call__(self, x: np.ndarray) -> np.ndarray:
        return self.session.run(None, {self.input_name: np.ascontiguousarray(x, np.float32)})[0]


def eye_closure_prob(obs: FaceObservation, gray: np.ndarray, eye_model: OnnxModel | None) -> float:
    """Returns eye closure probability in 0..1 using MRL Eye ONNX or MediaPipe fallback."""
    if eye_model is not None:
        probs = []
        for crop in extract_eye_crops(gray, obs.pts):
            logit = eye_model(crop[None, None].astype(np.float32) / 255.0)
            probs.append(softmax(logit)[0, 1])
        return float(np.mean(probs))
    return 0.5 * (obs.blend.get("eyeBlinkLeft", 0.0) + obs.blend.get("eyeBlinkRight", 0.0))


def face_input(gray: np.ndarray, pts: np.ndarray) -> np.ndarray:
    return extract_face_crop(gray, pts)[None, None].astype(np.float32) / 255.0


# --------------------------------------------------------------------------- Fatigue Tracking
def _contiguous_durations(mask: np.ndarray, t: np.ndarray) -> list[float]:
    """Computes durations of contiguous True spans."""
    durations, start = [], None
    for i, active in enumerate(mask):
        if active and start is None:
            start = i
        elif not active and start is not None:
            durations.append(t[i] - t[start])
            start = None
    if start is not None:
        durations.append(t[-1] - t[start])
    return durations


class FatigueTracker:
    """Sliding time window (default 60 s) emitting a FEATURE_NAMES vector."""

    def __init__(self, window_sec: float = 60.0, mar_threshold: float = 0.5):
        self.window_sec = window_sec
        self.mar_threshold = mar_threshold
        self.buf: collections.deque = collections.deque()

    def add(self, t: float, obs: FaceObservation | None, closed_prob: float | None):
        nan = float("nan")
        if obs is None or closed_prob is None:
            self.buf.append((t, nan, nan, nan, nan, nan, nan))
        else:
            self.buf.append((t, closed_prob, obs.ear, obs.mar, obs.pitch, obs.yaw, obs.roll))
        while self.buf and self.buf[0][0] < t - self.window_sec:
            self.buf.popleft()

    def span(self) -> float:
        return self.buf[-1][0] - self.buf[0][0] if len(self.buf) > 1 else 0.0

    def features(self) -> np.ndarray:
        arr = np.array(self.buf, np.float64)
        f = dict.fromkeys(FEATURE_NAMES, float("nan"))
        if len(arr) < 2:
            return np.array([f[n] for n in FEATURE_NAMES], np.float32)
        t = arr[:, 0]
        face_mask = ~np.isnan(arr[:, 1])
        dur = max(t[-1] - t[0], 1e-6)
        f["face_ratio"] = float(face_mask.mean())
        if face_mask.sum() >= 10:
            tf, b = t[face_mask], arr[face_mask]
            closed = b[:, 1] > 0.5
            spans = _contiguous_durations(closed, tf)
            blinks = [d for d in spans if 0.04 <= d < 0.5]
            long_closures = [d for d in spans if d >= 0.5]
            yawns = [d for d in _contiguous_durations(b[:, 3] > self.mar_threshold, tf) if d >= 1.0]
            f.update(
                perclos=float(closed.mean()),
                closed_mean=float(b[:, 1].mean()),
                blinks_per_min=len(blinks) / dur * 60,
                blink_dur_mean=float(np.mean(blinks)) if blinks else 0.0,
                long_closures_per_min=len(long_closures) / dur * 60,
                ear_mean=float(b[:, 2].mean()),
                ear_std=float(b[:, 2].std()),
                mar_mean=float(b[:, 3].mean()),
                mar_p95=float(np.percentile(b[:, 3], 95)),
                yawns_per_min=len(yawns) / dur * 60,
                pitch_mean=float(np.nanmean(b[:, 4])),
                pitch_std=float(np.nanstd(b[:, 4])),
                yaw_std=float(np.nanstd(b[:, 5])),
                roll_std=float(np.nanstd(b[:, 6])),
            )
        return np.array([f[n] for n in FEATURE_NAMES], np.float32)


def fatigue_heuristic(vec: np.ndarray) -> float:
    """Fallback 0-100 fatigue rule score prior to Platt scaling."""
    f = dict(zip(FEATURE_NAMES, vec))
    if not np.isfinite(f["perclos"]):
        return float("nan")
    score = f["perclos"] * 250 + f["long_closures_per_min"] * 10 + f["yawns_per_min"] * 15
    return float(np.clip(score, 0, 100))


def calibrated_fatigue_prob(rule_score: float, platt_ab: tuple[float, float] | list[float]) -> float:
    """Applies Platt logistic calibration 0..100 percent from konfig.json ZMECZENIE_PLATT."""
    if not np.isfinite(rule_score):
        return float("nan")
    a, b = float(platt_ab[0]), float(platt_ab[1])
    z = a * float(rule_score) + b
    return float(100.0 / (1.0 + math.exp(-np.clip(z, -30.0, 30.0))))


# --------------------------------------------------------------------------- Video Batch Helpers
def video_frames(path: str, target_fps: float | None):
    """Yields (timestamp_sec, frame_bgr). If target_fps is None, yields every frame."""
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps < 1 or fps > 240:
        fps = 30.0
    step = max(1, round(fps / target_fps)) if target_fps else 1
    i = 0
    while True:
        if i % step == 0:
            ok, fr = cap.read()
        else:
            ok, fr = cap.grab(), None
        if not ok:
            break
        if fr is not None:
            yield i / fps, fr
        i += 1
    cap.release()


def features_from_video(
    path: str,
    landmarker_path: str,
    eye_model_path: str | None,
    mar_threshold: float,
    window_sec: float = 60.0,
    step_sec: float = 10.0,
) -> np.ndarray:
    """Extracts a (n_windows, len(FEATURE_NAMES)) matrix from a video file."""
    fa = FaceAnalyzer(landmarker_path)
    eye_model = OnnxModel(eye_model_path, threads=1) if eye_model_path else None
    tr = FatigueTracker(window_sec, mar_threshold)
    out, next_t = [], window_sec
    for t, fr in video_frames(path, TRACKER_FPS):
        fr = resize_max(fr)
        obs = fa.process(fr, t, include_rgb=False)
        closed = eye_closure_prob(obs, cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY), eye_model) if obs else None
        tr.add(t, obs, closed)
        if t >= next_t:
            out.append(tr.features())
            next_t += step_sec
    fa.close()
    return np.array(out, np.float32).reshape(-1, len(FEATURE_NAMES))


def mar_from_video(path: str, landmarker_path: str) -> np.ndarray:
    """Collects frame-level MAR values at TRACKER_FPS for yawn threshold calibration."""
    fa = FaceAnalyzer(landmarker_path)
    vals = []
    for t, fr in video_frames(path, TRACKER_FPS):
        obs = fa.process(resize_max(fr), t, include_rgb=False)
        if obs:
            vals.append(obs.mar)
    fa.close()
    return np.array(vals, np.float32)


def rgb_from_video(path: str, landmarker_path: str) -> tuple[np.ndarray, np.ndarray, float]:
    """Returns (timestamps, skin_rgb[N, 3], fps) per frame for rPPG evaluation."""
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    cap.release()
    fa = FaceAnalyzer(landmarker_path)
    t_list, rgb_list = [], []
    for t, fr in video_frames(path, None):
        fr = resize_max(fr)
        obs = fa.process(fr, t)
        t_list.append(t)
        rgb_list.append(obs.rgb if obs is not None else np.full(3, np.nan))
    fa.close()
    return np.array(t_list), np.array(rgb_list), float(fps)


# --------------------------------------------------------------------------- rPPG (POS)
def fill_nans_linear(x: np.ndarray) -> np.ndarray:
    x = np.array(x, np.float64)
    for k in range(x.shape[1]):
        col = x[:, k]
        ok = np.isfinite(col)
        if ok.sum() >= 2 and not ok.all():
            col[~ok] = np.interp(np.flatnonzero(~ok), np.flatnonzero(ok), col[ok])
    return x


def resample_uniform(t: np.ndarray, x: np.ndarray, fs: float) -> np.ndarray:
    tt = np.arange(t[0], t[-1], 1.0 / fs)
    return np.stack([np.interp(tt, t, x[:, k]) for k in range(x.shape[1])], axis=1)


def pos_bvp(rgb: np.ndarray, fs: float) -> np.ndarray:
    """Plane-Orthogonal-to-Skin BVP extraction (Wang et al., 2017)."""
    n = len(rgb)
    win = int(round(1.6 * fs))
    h = np.zeros(n)
    proj = np.array([[0.0, 1.0, -1.0], [-2.0, 1.0, 1.0]])
    for k in range(win, n + 1):
        c = rgb[k - win:k].T
        m = c.mean(axis=1, keepdims=True)
        if np.any(m <= 0):
            continue
        s = proj @ (c / m)
        hh = s[0] + (s[0].std() / (s[1].std() + 1e-9)) * s[1]
        h[k - win:k] += hh - hh.mean()
    return h


def bandpass_filter(x: np.ndarray, fs: float, lo: float = 0.7, hi: float = 3.0) -> np.ndarray:
    from scipy.signal import butter, filtfilt

    b, a = butter(3, [lo, hi], btype="band", fs=fs)
    return filtfilt(b, a, x)


def heart_rate_from_bvp(x: np.ndarray, fs: float, lo: float = 0.7, hi: float = 3.0) -> tuple[float, float]:
    """Returns (BPM, SNR in dB) from the BVP power spectrum."""
    x = (x - x.mean()) * np.hanning(len(x))
    nfft = max(8192, 1 << int(np.ceil(np.log2(len(x) * 4))))
    spectrum = np.abs(np.fft.rfft(x, nfft)) ** 2
    freqs = np.fft.rfftfreq(nfft, 1.0 / fs)
    band = (freqs >= lo) & (freqs <= hi)
    if not band.any():
        return float("nan"), float("-inf")
    fp = freqs[band][np.argmax(spectrum[band])]
    sig_mask = (np.abs(freqs - fp) <= 0.1) | (np.abs(freqs - 2 * fp) <= 0.2)
    snr = 10 * np.log10(spectrum[band & sig_mask].sum() / (spectrum[band & ~sig_mask].sum() + 1e-12) + 1e-12)
    return float(fp * 60.0), float(snr)


def rppg_heart_rate(t: np.ndarray, rgb: np.ndarray, fs: float = 30.0) -> tuple[float, float]:
    rgb = fill_nans_linear(rgb)
    if not np.isfinite(rgb).all() or len(t) < fs * 4:
        return float("nan"), float("-inf")
    x = resample_uniform(np.asarray(t, np.float64), rgb, fs)
    return heart_rate_from_bvp(bandpass_filter(pos_bvp(x, fs), fs), fs)


# --------------------------------------------------------------------------- Audio Helpers
def normalize_audio(w: np.ndarray) -> np.ndarray:
    w = np.asarray(w, np.float32)
    return ((w - w.mean()) / np.sqrt(w.var() + 1e-7)).astype(np.float32)


def fit_audio_length(w: np.ndarray, n: int = AUDIO_SEG, start: int | None = None) -> np.ndarray:
    """Crops or zero-pads audio waveform to n samples centered by default."""
    if len(w) >= n:
        s = (len(w) - n) // 2 if start is None else start
        return w[s:s + n]
    out = np.zeros(n, np.float32)
    s = (n - len(w)) // 2 if start is None else start
    out[s:s + len(w)] = w
    return out
