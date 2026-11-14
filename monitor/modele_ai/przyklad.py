"""
Przykład użycia modeli AI samodzielnie (bez monitora i panelu).

    python przyklad.py                                   # model główny na przykładowych pomiarach
    python przyklad.py --zdjecie twarz.jpg               # + modele wizyjne na zdjęciu
    python przyklad.py --zdjecie twarz.jpg --nagranie glos.wav --co2 4200

Wymagania: numpy, scipy, opencv-python, mediapipe, onnxruntime, praat-parselmouth
(środowisko ..\\laptop\\.venv ma je wszystkie).
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
import tempfile

import numpy as np

TU = pathlib.Path(__file__).resolve().parent
sys.path[:0] = [str(TU), str(TU / "wizyjne"), str(TU / "glosowe")]

import cechy as C                      # noqa: E402  modele wizyjne + cechy zmęczenia
from glowny import raport as R          # noqa: E402  model główny
from glowny.stan import Centrum         # noqa: E402


def modele_wizyjne(sciezka: str) -> dict:
    import cv2

    img = cv2.imread(sciezka)
    if img is None:
        raise SystemExit(f"Nie mogę wczytać zdjęcia: {sciezka}")
    img = C.resize_max(img)
    fa = C.FaceAnalyzer(str(TU / "wizyjne" / "face_landmarker.task"))
    obs = fa.przetworz(img, 0.0, z_rgb=False)
    fa.close()
    if obs is None:
        print("[wizja] nie znaleziono twarzy")
        return {}
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    oczy = C.OnnxModel(TU / "wizyjne" / "oczy.onnx")
    twarz = C.OnnxModel(TU / "wizyjne" / "emocje_twarz.onnx")
    zamk = C.prawd_zamkniecia(obs, gray, oczy)
    emo = C.softmax(twarz(C.wejscie_twarzy(gray, obs.pts)))[0]
    neg = float(sum(p for p, n in zip(emo, C.EMOCJE_TWARZ) if n in C.NEGATYWNE))
    print(f"[wizja] punkty twarzy: {len(obs.pts)} | EAR {obs.ear:.3f} | MAR {obs.mar:.3f} | "
          f"głowa pitch {obs.pitch:.0f}° yaw {obs.yaw:.0f}°")
    print(f"[wizja] oczy zamknięte: {zamk:.0%}")
    print("[wizja] emocje twarzy: " + ", ".join(f"{C.PL[n]} {p:.0%}" for n, p in
                                                sorted(zip(C.EMOCJE_TWARZ, emo), key=lambda x: -x[1])[:3]))
    # Zmęczenie wymaga okna 60 s wideo (C.FatigueTracker); z jednego zdjęcia podajemy tylko emocje.
    return {"negatywne_twarz": 100 * neg, "jakosc_kamery": 80.0}


def modele_glosowe(sciezka: str) -> dict:
    from scipy.io import wavfile
    from scipy.signal import resample_poly
    import glos_biomarkery as GB

    sr, w = wavfile.read(sciezka)
    w = w.astype(np.float32)
    if w.ndim > 1:
        w = w.mean(axis=1)
    if np.abs(w).max() > 1.5:
        w /= 32768.0
    if sr != C.AUDIO_SR:
        w = resample_poly(w, C.AUDIO_SR, sr).astype(np.float32)
    w = C.dopasuj_dlugosc(w)
    glos = C.OnnxModel(TU / "glosowe" / "emocje_glos.onnx")
    p = C.softmax(glos(C.normalizuj_audio(w)[None]))[0]
    print("[głos] emocje: " + ", ".join(f"{C.PL[n]} {x:.0%}" for n, x in
                                        sorted(zip(C.EMOCJE_GLOS, p), key=lambda x: -x[1])[:3]))
    b = GB.analizuj(w, C.AUDIO_SR)
    if b:
        print("[głos] biomarkery: " + ", ".join(f"{e} {wz.format(b[k])}" for k, e, wz, _ in GB.BIOMARKERY))
    neg = float(sum(x for x, n in zip(p, C.EMOCJE_GLOS) if n in C.NEGATYWNE))
    return {"negatywne_glos": 100 * neg}


def main():
    ap = argparse.ArgumentParser(description="Przykład: modele wizyjne, głosowe i model główny")
    ap.add_argument("--zdjecie")
    ap.add_argument("--nagranie", help="plik .wav z mową (min. ok. 2 s)")
    ap.add_argument("--co2", type=float, default=2700, help="CO2 kabiny [ppm]")
    ap.add_argument("--zmeczenie", type=float, default=30, help="zmęczenie 0-100 (normalnie z okna 60 s wideo)")
    args = ap.parse_args()

    pomiary = {"co2_kabiny": args.co2, "temperatura_kabiny": 23.2, "wilgotnosc_kabiny": 41,
               "zmeczenie": args.zmeczenie, "perclos": 4.0, "mrugniecia_min": 15, "jakosc_kamery": 80.0}
    if args.zdjecie:
        pomiary.update(modele_wizyjne(args.zdjecie))
    if args.nagranie:
        pomiary.update(modele_glosowe(args.nagranie))

    # model główny: normy z arkusza + norma osobista + sieć anomalii -> obszary odchylone i raport
    tmp = pathlib.Path(tempfile.mkdtemp())
    model = Centrum(tmp, TU / "glowny" / "anomalie.npz")
    model.dodaj([{"parametr": k, "wartosc": v, "zrodlo": "przyklad"} for k, v in pomiary.items()])
    model.krok()
    m = model.migawka()
    model.zamknij()
    print("\n[model główny] obszary od najbardziej odchylonego:")
    for o in m["odchylenia"]:
        print(f"   {o['nazwa']:32s} odchylenie {o['wynik']:5.1f}/100 {'<- ODCHYLONY' if o['odchylony'] else ''}")
    print("\n" + R.jako_tekst(m["raport"]))


if __name__ == "__main__":
    main()
