# Local Camera and Voice Models

The `local_camera_models/` directory holds standalone offline CPU models. They are excluded from the main Flask dashboard and demonstrated in `local_camera_models/example.py`.

## Vision Pipeline

Video frames resized to max width 640 px pass through MediaPipe Face Landmarker before feeding four specialized analyzers.

```mermaid
flowchart TD
    Cam["Camera Frame max 640 px"] --> MP["MediaPipe Face Landmarker"]
    MP --> Eye["oczy.onnx Eye Closure"]
    MP --> Emo["emocje_twarz.onnx 7 Emotions"]
    MP --> Skin["Forehead and Cheek Skin RGB"]
    Eye --> Fat["FatigueTracker 60 s Window"]
    Fat --> Platt["Platt Calibration 0 to 100 %"]
    Skin --> RPPG["POS rPPG Bandpass and FFT"]
```

- `oczy.onnx` : Binary eye openness model trained on MRL Eye dataset
- `emocje_twarz.onnx` : Facial expression classifier trained on FER-2013 across 7 classes
- `konfig.json` : Stores YawDD yawn threshold `MAR_YAWN` and UTA-RLDD Platt scaling coefficients `ZMECZENIE_PLATT`
- `rppg_heart_rate` : Extracts pulse wave from skin color oscillations using Plane-Orthogonal-to-Skin projection

## Voice Pipeline

Audio sampled at 16 kHz in 4 s windows feeds a speech emotion transformer and acoustic biomarker extractor.

```mermaid
flowchart TD
    Mic["Audio Window 16 kHz, 4 s"] --> Norm["Normalize Waveform"]
    Mic --> Praat["Praat Feature Extraction"]
    Norm --> Wav["emocje_glos.onnx 8 Emotions"]
    Praat --> Bio["12 Acoustic Biomarkers"]
    Bio --> Base["VoiceBaseline Calibration"]
    Base --> Idx["Tension and Fatigue Indices 0 to 100"]
```

- `emocje_glos.onnx` : Speech emotion classifier across 8 RAVDESS categories
- `voice_biomarkers.py` : Compares vocal pitch, perturbation, pauses, and spectral tilt against individual speaker baselines

## Standalone Integration

`local_camera_models/example.py` runs vision and voice inference on sample files and feeds outputs into `Centrum` from `app/model/`.
