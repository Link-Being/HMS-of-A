# HMS-of-A

Health Monitoring System of Astronauts - a web-based medical telemetry, cabin environment monitoring, and anomaly detection platform for orbital station crews.

## Overview

HMS-of-A combines a Flask telemetry backend, a multi-criteria physiological and environmental scoring engine, and a zero-dependency vanilla JavaScript dashboard designed for mission commanders and individual astronauts on the Horyzont Jeden orbital station.

Key capabilities:
- Real-time crew biometrics and ECLSS cabin environment streaming backed by NASA OSDR RR-1 telemetry in `dane/osdr_RR1.json`
- Multi-criteria health assessment across 20 parameters and 7 medical domains combining reference norms, adaptive personal baselines, and a denoising autoencoder
- Role-based authentication with full-fleet oversight for the Commander and personal medical dashboards for crew members
- Interactive SVG trend charts, radial gauges, step-by-step diagnostic procedures, microgravity prophylaxis guidelines, and critical emergency protocols
- Switchable `demo` and `real` operational modes, manual telemetry entry, simulated Garmin profile import, and plain-text diagnostic report export

## Architecture and Health Model

The `model/` package evaluates incoming crew and cabin telemetry without requiring heavy external ML frameworks:

- `model/normy.py` - Reference thresholds classified as `norma`, `uwaga`, or `alarm` across 7 domains: ECLSS cabin environment, cardiovascular and respiratory, sleep and recovery, stress and workload, activity and endurance, sweat biochemistry, and EEG cognitive readiness
- `model/baza_osobista.py` - Exponentially weighted personal and cabin baselines stored per astronaut in `dane/bazy_osobiste/`, updated only during in-norm readings to prevent baseline drift during alerts
- `model/anomalie.py` - Unsupervised denoising autoencoder with `11 -> 16 -> 4 -> 16 -> 11` `tanh` architecture loaded from `dane/anomalie.json` with pure-Python inference and optional NumPy acceleration, falling back to `BazaOnline` session statistics when untrained
- `model/odchylenia.py` and `model/stan.py` - Combines reference threshold violations, personal z-scores, and autoencoder reconstruction residuals into smoothed readiness indices `0-100` with hysteresis and dwell timers to prevent alert flickering
- `model/raport.py` - Generates structured Polish-language clinical summary reports with cross-signal correlation rules such as elevated CO2 with reduced cognitive readiness or elevated stress with suppressed HRV
- `model/ucz_anomalie.py` - Offline training CLI for retraining `dane/anomalie.json` from `dane/historia_pomiarow.csv` and `dane/osdr_RR1.json`

## Quick Start

### Prerequisites

- Python 3
- Flask: `pip install flask`
- Optional: `numpy` for faster autoencoder training and matrix operations

### Running the Application

1. Start the backend server:

```bash
python app.py
```

On Windows, double-click `start-server.bat` or `run-app.bat` to launch the Flask server on port `5000` and open the dashboard automatically. Set the `PORT` environment variable to override the default port.

2. Open `http://localhost:5000/` in your browser.

3. Alternatively, open `index.html` directly in a browser for standalone client-side simulation. Standalone mode uses `localStorage` and client-side simulation in `js/stream.js`; backend model scoring, NASA OSDR playback, and `/api/raport.txt` export require running `app.py`.

### Retraining the Anomaly Network

```bash
python -m model.ucz_anomalie --dane dane --epoki 180
```

### Compliance Check

Repository files follow formatting rules enforced by `test-compliance.ps1` - no emojis, no en-dashes or em-dashes, and no parentheses in `.html` or `.md` files:

```powershell
powershell -ExecutionPolicy Bypass -File .\test-compliance.ps1
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
- **Instructions and Prophylaxis**: Interactive step-by-step measurement procedures, overdue FIFO test queue and countdown timer, microgravity prevention guidelines, and critical emergency protocols
- **Motivation Module**: Mission progress tracking, crew rankings, rewards, guided breathing exercises, and night/day theme switcher
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

- `app.py` - Flask web server, background telemetry worker, model integration, and REST API
- `index.html` - Single-page web application shell
- `css/style.css` - Mission-control stylesheet with night and day themes
- `js/data.js` - Initial crew roster, diagnostic tests, schedules, and prophylaxis knowledge base
- `js/stream.js` - Backend live telemetry poller and offline client-side simulator
- `js/charts.js` - Vector SVG line charts, crew bar charts, and radial gauges
- `js/app.js` - UI views, authentication, forms, filtering, and state management
- `model/` - Health scoring package: `normy.py`, `baza_osobista.py`, `anomalie.py`, `odchylenia.py`, `stan.py`, `raport.py`, `ucz_anomalie.py`
- `dane/` - Datasets and trained weights: `osdr_RR1.json`, `baza_stacji.json`, `anomalie.json`, `historia_pomiarow.csv`
- `assets/` - Application logo and favicon in SVG and PNG formats
- `start-server.bat`, `run-app.bat` - Windows startup scripts
- `test-compliance.ps1` - Formatting compliance check script
