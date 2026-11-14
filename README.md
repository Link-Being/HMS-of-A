# HMS-of-A

Health Monitoring System of Astronauts - a web-based medical telemetry, cabin environment monitoring, and anomaly detection platform for orbital station crews.

## Overview

HMS-of-A combines a Flask telemetry backend, a multi-criteria physiological and environmental scoring engine, and a zero-dependency vanilla JavaScript dashboard designed for mission commanders and individual astronauts on the Horizon One orbital station.

Key capabilities:
- Real-time crew biometrics and ECLSS cabin environment streaming backed by NASA OSDR RR-1 telemetry in `app/data/osdr_RR1.json`
- Multi-criteria health assessment across 20 parameters and 7 medical domains combining reference norms, adaptive personal baselines, and a denoising autoencoder
- Role-based authentication with full-fleet oversight for the Commander and personal medical dashboards for crew members
- Interactive SVG trend charts, radial gauges, step-by-step diagnostic procedures, microgravity prophylaxis guidelines, and critical emergency protocols
- Switchable `demo` and `real` operational modes, manual telemetry entry, simulated Garmin profile import, and plain-text clinical report export

## Architecture and Health Model

The `app/model/` package evaluates incoming crew and cabin telemetry without requiring heavy external ML frameworks:

- `app/model/thresholds.py` - Reference thresholds classified as `norma`, `uwaga`, or `alarm` across 7 domains: ECLSS cabin environment, cardiovascular and respiratory, sleep and recovery, stress and workload, activity and endurance, sweat biochemistry, and EEG cognitive readiness
- `app/model/personal_baseline.py` - Exponentially weighted personal and cabin baselines stored per astronaut in `app/data/personal_baselines/`, updated only during in-norm readings to prevent baseline drift during alerts
- `app/model/anomaly_model.py` - Unsupervised denoising autoencoder with `11 -> 16 -> 4 -> 16 -> 11` `tanh` architecture loaded from `app/data/anomalies.json` with pure-Python inference and optional NumPy acceleration, falling back to `BazaOnline` session statistics when untrained
- `app/model/deviations.py` and `app/model/state.py` - Combines reference threshold violations, personal z-scores, and autoencoder reconstruction residuals into smoothed readiness indices `0-100` with hysteresis and dwell timers to prevent alert flickering
- `app/model/report.py` - Generates structured English-language clinical summary reports with cross-signal correlation rules such as elevated CO2 with reduced cognitive readiness or elevated stress with suppressed HRV
- `app/model/train_anomalies.py` - Offline training CLI for retraining `app/data/anomalies.json` from `app/data/telemetry_history.csv` and `app/data/osdr_RR1.json`

## Quick Start

### Prerequisites

- Python 3
- Flask: `pip install flask`
- Optional: `numpy` for faster autoencoder training and matrix operations

### Running the Application

1. Start the backend server from the repository root or from `app/`:

```bash
python app/app.py
```

On Windows, double-click `app/start-server.bat` to launch the Flask server on port `5000` and open the dashboard automatically. Set the `PORT` environment variable to override the default port.

2. Open `http://localhost:5000/` in your browser.

3. Alternatively, open `app/index.html` directly in a browser for standalone client-side simulation. Standalone mode uses `localStorage` and client-side simulation in `app/js/stream.js`; backend model scoring, NASA OSDR playback, and `/api/raport.txt` export require running `app/app.py`.

### Retraining the Anomaly Network

```bash
cd app
python -m model.train_anomalies --data data --epochs 180
```

### Compliance Check

Repository files follow formatting rules enforced by `app/test-compliance.ps1` - no emojis, no en-dashes or em-dashes, and no parentheses in `.html` or `.md` files:

```powershell
powershell -ExecutionPolicy Bypass -File .\app\test-compliance.ps1
```

## Operational Modes and Accounts

The application starts in `demo` mode by default with a preconfigured 6-person roster and simulated clinical deviations. Switch between `demo` and `real` mode - which keeps only the Commander account until new crew members are added - from the Settings tab or via `/api/mode`.

| Name | Role | Access Level | Login | Password |
| :--- | :--- | :--- | :--- | :--- |
| Marek Marczak | Commander | Full fleet oversight | `marczak` | `marczak2026` |
| Adam Kolosa | Astronaut | Personal dashboard | `kolosa` | `kolosa1` |
| Michał Pawlak | Astronaut | Personal dashboard | `pawlak` | `pawlak2` |
| Krzysztof Mysior | Astronaut | Personal dashboard | `mysior` | `mysior3` |
| Jan Hopperl | Astronaut | Personal dashboard | `hopperl` | `hopperl4` |
| Wojciech Skrzypczak | Astronaut | Personal dashboard | `skrzypczak` | `skrzypczak5` |

## Application Modules

- **Main Dashboard**: Commander fleet summary, real-time ECLSS cabin readouts, prioritized crew status, or personal astronaut vitals and medical orders
- **Crew and Telemetry / My Medical Data**: Live 12-metric telemetry cards, interactive SVG time-series charts, radial gauges for bone density, muscle mass, hydration, and stress, plus periodic diagnostic test history
- **Daily Schedule**: Dedicated daily schedule view ready for mission planning entries
- **Instructions and Prophylaxis**: Interactive step-by-step measurement procedures, overdue FIFO test queue and countdown timer, microgravity prevention guidelines, and critical emergency protocols
- **Motivation Module**: Wellbeing readiness panel, body silhouette feedback, parameter stability summary, active daily tasks, rewards, crew rankings, guided breathing exercises, and night/day theme switcher
- **Event Log**: Chronological registry of medical orders issued by the Commander and daily crew check-in reports
- **Settings**: Operational mode switching, mission reset, user and astronaut management, manual telemetry entry, and simulated Garmin profile import

## Telemetry Scenarios and REST API

The background stream supports four scenarios selectable in the live control bar or via API: `resting`, `training`, `eva`, and `anomaly`.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/state` | `GET` | Returns current mode, users, astronauts, ECLSS state, crew summary, and stream config |
| `/api/telemetry/live` | `GET` | Returns latest telemetry packet, vitals, ECLSS cabin metrics, and aggregate crew stats |
| `/api/telemetry/control` | `POST` | Controls stream `action`: `start`, `stop`, `toggle`; `scenario`; and `interval` in seconds |
| `/api/telemetry/entry`, `/api/pomiary` | `POST` | Submits manual astronaut vitals, ECLSS values, or raw model measurement lists |
| `/api/model/summary` | `GET` | Returns crew and per-astronaut model snapshots; supports `?astro_id=` query parameter |
| `/api/raport.txt` | `GET` | Downloads plain-text clinical summary report; supports `?astro_id=` query parameter |
| `/api/garmin/import` | `POST` | Adds a simulated Garmin Health Telemetry Link astronaut profile |
| `/api/mode` | `POST` | Switches active operational mode between `demo` and `real` |
| `/api/mission/reset` | `POST` | Resets mission state to `demo` or `clear` |
| `/api/astronauts` | `POST` | Creates a new astronaut or commander account |
| `/api/astronauts/<astro_id>` | `DELETE` | Removes an account and clears its model state |

## Project Structure

- `README.md` - Project documentation at repository root
- `.gitattributes` - Git LFS tracking rules for `.onnx` and `.task` model weight binaries
- `local_camera_models/` - Offline CPU local AI models from `origin/gotowe-modele`: vision models in `vision/`, voice models in `voice/`, `example.py`, `requirements.txt`, and `README.md`
- `app/app.py` - Flask web server, background telemetry worker, model integration, and REST API
- `app/index.html` - Single-page web application shell
- `app/css/style.css` - Mission-control stylesheet with night and day themes
- `app/js/data.js` - Initial crew roster, diagnostic tests, schedules, and prophylaxis knowledge base
- `app/js/stream.js` - Backend live telemetry poller and offline client-side simulator
- `app/js/charts.js` - Vector SVG line charts, crew bar charts, and radial gauges
- `app/js/app.js` - UI views, authentication, forms, filtering, and state management
- `app/model/` - Health scoring package: `thresholds.py`, `personal_baseline.py`, `anomaly_model.py`, `deviations.py`, `state.py`, `report.py`, `train_anomalies.py`
- `app/data/` - Datasets and trained weights: `osdr_RR1.json`, `station_baseline.json`, `anomalies.json`, `telemetry_history.csv`
- `app/assets/` - Application logo and favicon in SVG and PNG formats
- `app/start-server.bat` - Windows startup script
- `app/test-compliance.ps1` - Formatting compliance check script
