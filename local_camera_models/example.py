"""
Standalone example demonstrating local vision, voice, and HMS-of-A summarizing models.

    python example.py
    python example.py --image face.jpg
    python example.py --image face.jpg --audio speech.wav --co2 4200

Dependencies listed in requirements.txt:
numpy, scipy, opencv-python, mediapipe, onnxruntime, sounddevice, praat-parselmouth
"""
from __future__ import annotations

import argparse
import pathlib
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
REPO_ROOT = HERE.parent
APP_DIR = REPO_ROOT / "app"
sys.path[:0] = [str(HERE / "vision"), str(HERE / "voice"), str(APP_DIR)]

from model import Centrum, raport_jako_tekst    # noqa: E402


def run_vision_models(image_path: str) -> dict:
    import cv2
    import features as V

    img = cv2.imread(image_path)
    if img is None:
        raise SystemExit(f"Unable to read image: {image_path}")
    img = V.resize_max(img)
    fa = V.FaceAnalyzer(str(HERE / "vision" / "face_landmarker.task"))
    obs = fa.process(img, 0.0, include_rgb=False)
    fa.close()
    if obs is None:
        print("[vision] no face detected")
        return {}
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    eye_model = V.OnnxModel(HERE / "vision" / "oczy.onnx")
    face_model = V.OnnxModel(HERE / "vision" / "emocje_twarz.onnx")
    closed_prob = V.eye_closure_prob(obs, gray, eye_model)
    probs = V.softmax(face_model(V.face_input(gray, obs.pts)))[0]
    neg = float(sum(p for p, name in zip(probs, V.FACE_EMOTIONS) if name in V.NEGATIVE_EMOTIONS))
    print(
        f"[vision] landmarks: {len(obs.pts)} | EAR {obs.ear:.3f} | MAR {obs.mar:.3f} | "
        f"head pitch {obs.pitch:.0f} deg yaw {obs.yaw:.0f} deg"
    )
    print(f"[vision] eyes closed probability: {closed_prob:.0%}")
    print(
        "[vision] facial emotions: "
        + ", ".join(f"{name} {p:.0%}" for name, p in sorted(zip(V.FACE_EMOTIONS, probs), key=lambda x: -x[1])[:3])
    )
    # Fatigue calibration requires a 60 s video stream via V.FatigueTracker; single-frame outputs emotion only.
    return {"negatywne_twarz": 100 * neg, "jakosc_kamery": 80.0}


def run_voice_models(audio_path: str) -> dict:
    import numpy as np
    from scipy.io import wavfile
    from scipy.signal import resample_poly
    import features as V
    import voice_biomarkers as VB

    sr, w = wavfile.read(audio_path)
    w = w.astype(np.float32)
    if w.ndim > 1:
        w = w.mean(axis=1)
    if np.abs(w).max() > 1.5:
        w /= 32768.0
    if sr != V.AUDIO_SR:
        w = resample_poly(w, V.AUDIO_SR, sr).astype(np.float32)
    w = V.fit_audio_length(w)
    voice_model = V.OnnxModel(HERE / "voice" / "emocje_glos.onnx")
    probs = V.softmax(voice_model(V.normalize_audio(w)[None]))[0]
    print(
        "[voice] emotions: "
        + ", ".join(f"{name} {p:.0%}" for name, p in sorted(zip(V.VOICE_EMOTIONS, probs), key=lambda x: -x[1])[:3])
    )
    biomarkers = VB.analyze_voice(w, V.AUDIO_SR)
    if biomarkers:
        print(
            "[voice] biomarkers: "
            + ", ".join(f"{label} {fmt.format(biomarkers[key])}" for key, label, fmt, _ in VB.BIOMARKERS)
        )
    neg = float(sum(p for p, name in zip(probs, V.VOICE_EMOTIONS) if name in V.NEGATIVE_EMOTIONS))
    return {"negatywne_glos": 100 * neg}


def main():
    ap = argparse.ArgumentParser(description="Standalone test for local vision, voice, and HMS-of-A models")
    ap.add_argument("--image", help="Path to face image for vision model inference")
    ap.add_argument("--audio", help="Path to speech WAV file (minimum ~2 s)")
    ap.add_argument("--co2", type=float, default=2700, help="Cabin CO2 ppm")
    ap.add_argument("--fatigue", type=float, default=30, help="Simulated fatigue score 0-100")
    args = ap.parse_args()

    measurements = {
        "co2_kabiny": args.co2,
        "temperatura_kabiny": 23.2,
        "wilgotnosc_kabiny": 41,
        "zmeczenie": args.fatigue,
        "perclos": 4.0,
        "mrugniecia_min": 15,
        "jakosc_kamery": 80.0,
    }
    if args.image:
        measurements.update(run_vision_models(args.image))
    if args.audio:
        measurements.update(run_voice_models(args.audio))

    tmp = pathlib.Path(tempfile.mkdtemp())
    anomalies_path = APP_DIR / "data" / "anomalies.json"
    hub = Centrum(tmp, anomalies_path if anomalies_path.exists() else None)
    hub.dodaj([{"parametr": k, "wartosc": v, "zrodlo": "local_camera_example"} for k, v in measurements.items()])
    hub.krok()
    snap = hub.migawka()
    hub.zamknij()
    print("\n[main model] domains ordered by highest deviation:")
    for area in snap["odchylenia"]:
        flag = "<- DEVIATION" if area["odchylony"] else ""
        print(f"   {area['nazwa']:32s} score {area['wynik']:5.1f}/100 {flag}")
    print("\n" + raport_jako_tekst(snap["raport"]))


if __name__ == "__main__":
    main()
