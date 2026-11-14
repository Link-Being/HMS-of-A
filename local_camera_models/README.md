# Local Camera and Voice AI Models

Standalone offline CPU inference package imported from branch `origin/gotowe-modele` and organized alongside the core HMS-of-A health scoring package in `app/model/`.

## Directory Structure

- `vision/` : Camera and facial telemetry inference models
  - `face_landmarker.task` : Google MediaPipe Face Landmarker outputting 478 facial landmarks, 52 blendshapes, and head pose matrices
  - `oczy.onnx` : ResNet18 binary eye openness classifier trained on MRL Eye dataset, 64x64 grayscale input, 96.3% validation accuracy
  - `emocje_twarz.onnx` : ResNet18 facial expression classifier trained on FER-2013 across 7 classes, 48x48 grayscale input, 69.7% validation accuracy, 0.69 macro-F1
  - `features.py` : Face landmarker wrapper, EAR/MAR metrics, `FatigueTracker` 60 s sliding window, POS rPPG heart-rate estimator, and ONNX runtime helpers
  - `konfig.json` : Calibrated yawn threshold `MAR_YAWN` from YawDD and logistic Platt fatigue calibration `ZMECZENIE_PLATT` from UTA-RLDD
  - `fatigue_experiments.json` : Cross-subject benchmark metrics on UTA-RLDD across raw rules, logistic regression, MLP, and Platt calibration
- `voice/` : Acoustic and vocal emotion inference models
  - `emocje_glos.onnx` : wav2vec2-base transformer speech emotion classifier fine-tuned on RAVDESS across 8 classes, 4 s window at 16 kHz, 77.9% validation accuracy, 0.77 macro-F1
  - `voice_biomarkers.py` : Praat / Parselmouth extractor computing 12 acoustic biomarkers plus `VoiceBaseline` personal z-score tracking
- `example.py` : Standalone CLI demonstrating vision, voice, and `app/model/` scoring integration
- `requirements.txt` : Python runtime dependencies for vision and audio inference

## Fatigue Calibration Details

On the full UTA-RLDD dataset covering 60 subjects and 10,182 60 s windows, rule-based temporal features combined with logistic Platt scaling reached 71.8% cross-subject balanced accuracy and 78.0% per-recording accuracy on alert vs drowsy classification:

- Rule-weighted fatigue features: `perclos * 250 + long_closures_per_min * 10 + yawns_per_min * 15`
- Calibrated probability: `fatigue = 100 / [1 + e^-[a * rule_score + b]]` using `ZMECZENIE_PLATT` coefficients in `vision/konfig.json`

## Standalone Usage

Install dependencies from `requirements.txt` and run:

```bash
python local_camera_models/example.py --image face.jpg --audio speech.wav --co2 4200
```

## Limitations

These models provide research-grade telemetry estimation only and do not constitute a certified medical device. Large binary weights `.onnx` and `.task` are managed with Git LFS via `.gitattributes`.
