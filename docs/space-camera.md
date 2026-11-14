# Space Camera Concept for Edge Models

Conceptual camera and edge hardware design required to run `local_camera_models/` reliably in orbital microgravity.

## Hardware and Edge Architecture

The camera unit captures stable color video and clean speech audio, runs inference locally, and sends lightweight telemetry to HMS-of-A.

```mermaid
flowchart LR
    subgraph Optics["Optical Front End"]
        Lens["Wide-FOV Shatterproof Lens"]
        LED["Diffused Soft-White LED"]
        Sensor["HDR Global-Shutter RGB 30 fps"]
    end
    subgraph Audio["Audio Front End"]
        Mic["Beamforming 16 kHz Mic"]
    end
    subgraph Edge["Space Edge Compute"]
        SoC["Radiation-Tolerant SoC and ECC"]
        Cool["Conduction Cooling Plate"]
    end
    subgraph Models["local_camera_models Edge Stack"]
        Vision["MediaPipe, ONNX, and rPPG"]
        Voice["wav2vec2 ONNX and Praat"]
    end
    Lens --> Sensor
    LED --> Sensor
    Sensor --> SoC
    Mic --> SoC
    Cool -.-> SoC
    SoC --> Vision
    SoC --> Voice
    Vision --> Bus["HMS-of-A Telemetry Bus"]
    Voice --> Bus
```

## Space Adaptation Logic

Orbital conditions challenge optical and acoustic sensors. Each hardware choice protects one or more edge model requirements.

```mermaid
flowchart TD
    Glare["Orbital Glare and Shadows"] --> Fix1["HDR Sensor and Diffused LED"]
    Fix1 --> M1["Stable Skin RGB for POS rPPG"]
    Micro["Floating Crew Posture"] --> Fix2["Wide-FOV Low-Distortion Lens"]
    Fix2 --> M2["Continuous 478 Face Landmarks"]
    Noise["Constant ECLSS Fan Noise"] --> Fix3["Directional 16 kHz Mic Array"]
    Fix3 --> M3["Clean 4 s Windows for Voice Models"]
    Space["Radiation and Zero Convection"] --> Fix4["ECC RAM, Watchdog, Conduction Cooling"]
    Fix4 --> M4["Reliable Offline 30 fps Inference"]
```

## Key Camera Requirements

- Sensor : True RGB global-shutter sensor at 30 fps minimum and 640 px width or higher to match `rppg_heart_rate` and `FatigueTracker`
- Exposure lock : Fixed white balance and manual exposure during rPPG capture so skin color oscillations are preserved
- Optics : Wide field of view with shatterproof sapphire or polycarbonate cover for floating astronaut framing and cabin safety
- Lighting : Diffused soft-white illumination to counter harsh sunlight contrast without saturating `64x64` eye and `48x48` face crops
- Audio : Beamforming 16 kHz microphone with hardware noise suppression for `emocje_glos.onnx` and `voice_biomarkers.py`
- Cooling : Thermal conduction into station structure because microgravity prevents natural air convection
- Reliability : Radiation shielding, ECC memory, low-outgassing enclosure, and hardware watchdog for autonomous recovery
- Privacy and link : Local CPU or NPU inference avoids streaming raw video over limited orbital downlinks
