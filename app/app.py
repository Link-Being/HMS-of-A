#!/usr/bin/env python3
# Web application server for HMS-of-A
# Health Monitoring System of Astronauts
# Note: no emojis, no parentheses in UI strings, no long dashes

import copy
import math
import os
import pathlib
import json
import time
import random
import threading
from datetime import datetime, timezone
from flask import Flask, Response, send_from_directory, jsonify, request

from model import Centrum, raport_jako_tekst, status_na_ui

BASE_DIR = pathlib.Path(__file__).resolve().parent

app = Flask(__name__, static_folder=str(BASE_DIR))
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


@app.after_request
def disable_client_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

state_lock = threading.Lock()
stop_event = threading.Event()

DANE_DIR = BASE_DIR / "data"
PLIK_SIECI = DANE_DIR / "anomalies.json"
OSDR_FILE = DANE_DIR / "osdr_RR1.json"
BAZA_STACJI_FILE = DANE_DIR / "station_baseline.json"
BAZY_OSOBISTE_DIR = DANE_DIR / "personal_baselines"


def _load_json_safe(path: pathlib.Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


OSDR_RECORDS = _load_json_safe(OSDR_FILE, {}).get("telemetria", [])
STATION_BASELINE = _load_json_safe(BAZA_STACJI_FILE, {})
osdr_cursor = {"idx": 0}


def build_initial_eclss() -> dict:
    """Builds initial cabin environmental state from real ISS OSDR telemetry and station baseline data."""
    rec = OSDR_RECORDS[0] if OSDR_RECORDS else {}
    rad_base = float(STATION_BASELINE.get("promieniowanie_dobowe", {}).get("sr", 0.21))
    return {
        "temp": round(float(rec.get("temperature_iss", 24.1)), 1),
        "pressure": 101.3,
        "humidity": int(round(float(rec.get("humidity_iss", 39.0)))),
        "o2": 20.9,
        "co2": int(round(float(rec.get("co2_iss", 2641.0)))),
        "waterTanks": 94,
        "dailyRadiation": round(rad_base, 2),
        "sourceTime": rec.get("time", "OSDR RR-1")
    }

# Demo mode user accounts
DEMO_USERS = [
    {
        "id": "kierownik",
        "login": "marczak",
        "password": "marczak2026",
        "name": "Marek Marczak",
        "role": "Commander",
        "title": "",
        "accessLevel": "Full oversight",
        "avatarCode": "MM"
    },
    {
        "id": "astro-1",
        "login": "kolosa",
        "password": "kolosa1",
        "name": "Adam Kolosa",
        "role": "",
        "title": "",
        "accessLevel": "Personal account",
        "avatarCode": "AK"
    },
    {
        "id": "astro-2",
        "login": "pawlak",
        "password": "pawlak2",
        "name": "Michał Pawlak",
        "role": "",
        "title": "",
        "accessLevel": "Personal account",
        "avatarCode": "MP"
    },
    {
        "id": "astro-3",
        "login": "mysior",
        "password": "mysior3",
        "name": "Krzysztof Mysior",
        "role": "",
        "title": "",
        "accessLevel": "Personal account",
        "avatarCode": "KM"
    },
    {
        "id": "astro-4",
        "login": "hopperl",
        "password": "hopperl4",
        "name": "Jan Hopperl",
        "role": "",
        "title": "",
        "accessLevel": "Personal account",
        "avatarCode": "JH"
    },
    {
        "id": "astro-5",
        "login": "skrzypczak",
        "password": "skrzypczak5",
        "name": "Wojciech Skrzypczak",
        "role": "",
        "title": "",
        "accessLevel": "Personal account",
        "avatarCode": "WS"
    }
]

# Demo mode astronauts
DEMO_ASTRONAUTS = [
    {
        "id": "astro-1",
        "name": "Adam Kolosa",
        "role": "",
        "avatarCode": "AK",
        "age": 42,
        "bloodType": "A Rh plus",
        "missionDay": 184,
        "evaHours": 34,
        "overallStatus": "normal",
        "statusLabel": "Stable Condition",
        "statusDescription": "All biometric indicators remain within the defined safety envelope.",
        "vitals": {
            "hr": 68, "hrUnit": "bpm",
            "rr": 882, "rrUnit": "ms",
            "hrv": 64, "hrvUnit": "ms",
            "bpSys": 120, "bpDia": 80, "bpUnit": "mmHg",
            "spo2": 99, "spo2Unit": "%",
            "temp": 36.6, "tempUnit": "deg C",
            "resp": 14, "respUnit": "breaths/min",
            "stressLevel": 24, "stressUnit": "pts",
            "bodyBattery": 85, "bodyBatteryUnit": "pts",
            "radDose": 14.2, "radUnit": "mSv",
            "boneDensity": 97, "boneUnit": "% norm",
            "muscleMass": 98, "muscleUnit": "% norm",
            "hydration": 95, "hydrationUnit": "%",
            "sleepHours": 7.8, "sleepUnit": "h",
            "sleepScore": 88, "sleepScoreUnit": "pts",
            "cortisol": 4.2, "cortisolUnit": "ng/ml",
            "lactate": 1.8, "lactateUnit": "mmol/l",
            "cognitiveReadiness": 92, "cognitiveUnit": "%"
        },
        "periodicTests": [
            {
                "id": "pt-101",
                "category": "Cardiology and Blood Pressure",
                "parameter": "Arterial blood pressure and 3-lead ECG",
                "equipment": "Astroskin Bio-Monitor Vest",
                "result": "120/80 mmHg, regular sinus rhythm, no signs of ischemia",
                "date": "14.11.2026",
                "time": "07:15",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-102",
                "category": "Sleep Analysis",
                "parameter": "Sleep duration, sleep stages, and Sleep Score",
                "equipment": "Actiwatch Biometric Band",
                "result": "7.8 h total sleep, deep 21 %, REM 24 %, light 55 %, Sleep Score: 88/100 pts",
                "date": "14.11.2026",
                "time": "06:30",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-103",
                "category": "Physical Performance",
                "parameter": "VO2 max aerobic capacity and energy expenditure",
                "equipment": "Garmin Performance Heart Rate Monitor",
                "result": "52.4 ml/kg/min, very high fitness, morning Body Battery 88 pts",
                "date": "13.11.2026",
                "time": "16:45",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-104",
                "category": "Resistance and Aerobic Training",
                "parameter": "ARED resistance and T2 treadmill session",
                "equipment": "ISS ARED and T2 Training Station",
                "result": "Squats and deadlift 142 kg, treadmill 210 W, duration 120 min, avg HR 138 bpm",
                "date": "14.11.2026",
                "time": "11:30",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-105",
                "category": "Sweat Biochemistry",
                "parameter": "Sweat biomarkers: Cortisol, lactate, Na, K, Ca, CRP",
                "equipment": "Bio-Patch Microfluidic Biosensor",
                "result": "Cortisol 4.2 ng/ml, lactate 1.8 mmol/l, Na 48 mmol/l, K 4.6 mmol/l, Ca 1.2 mmol/l, CRP 0.8 mg/l",
                "date": "14.11.2026",
                "time": "12:45",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-106",
                "category": "sEMG Muscle Activity",
                "parameter": "Muscle fatigue and micro-tremor sEMG Fibre-WBAN",
                "equipment": "Fibre-WBAN Sensor Straps",
                "result": "Optimal state, no fatigue, MDF 78 Hz, band 10 - 200 Hz, ZCR at resting baseline",
                "date": "14.11.2026",
                "time": "11:50",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-107",
                "category": "Central Nervous System CNS",
                "parameter": "Cognitive readiness index and EEG brainwaves",
                "equipment": "EEG Neuro-Sensor Headband",
                "result": "Cognitive readiness index 92 %, high focus level, balanced alpha rhythm",
                "date": "14.11.2026",
                "time": "09:20",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-108",
                "category": "Radiation Dosimetry",
                "parameter": "Daily and cumulative radiation exposure",
                "equipment": "Onboard RAD-ISS Dosimeter",
                "result": "Daily dose 0.42 mSv, total cumulative dose 14.2 mSv, below operational limit",
                "date": "14.11.2026",
                "time": "12:00",
                "status": "Normal",
                "statusType": "normal"
            }
        ],
        "telemetryHistory": [
            {"day": "Day 179", "hr": 69, "bpSys": 121, "spo2": 99, "stress": 26, "rad": 13.7},
            {"day": "Day 180", "hr": 71, "bpSys": 122, "spo2": 98, "stress": 30, "rad": 13.8},
            {"day": "Day 181", "hr": 67, "bpSys": 119, "spo2": 99, "stress": 22, "rad": 13.9},
            {"day": "Day 182", "hr": 70, "bpSys": 120, "spo2": 99, "stress": 25, "rad": 14.0},
            {"day": "Day 183", "hr": 66, "bpSys": 118, "spo2": 99, "stress": 21, "rad": 14.1},
            {"day": "Day 184", "hr": 68, "bpSys": 120, "spo2": 99, "stress": 24, "rad": 14.2}
        ],
        "orders": [],
        "dailyChecks": []
    },
    {
        "id": "astro-2",
        "name": "Michał Pawlak",
        "role": "",
        "avatarCode": "MP",
        "age": 39,
        "bloodType": "0 Rh plus",
        "missionDay": 184,
        "evaHours": 26,
        "overallStatus": "normal",
        "statusLabel": "Optimal Condition",
        "statusDescription": "Excellent metabolic and cardiovascular adaptation. Energy reserves remain high.",
        "vitals": {
            "hr": 65, "hrUnit": "bpm",
            "rr": 923, "rrUnit": "ms",
            "hrv": 72, "hrvUnit": "ms",
            "bpSys": 118, "bpDia": 78, "bpUnit": "mmHg",
            "spo2": 99, "spo2Unit": "%",
            "temp": 36.5, "tempUnit": "deg C",
            "resp": 13, "respUnit": "breaths/min",
            "stressLevel": 20, "stressUnit": "pts",
            "bodyBattery": 88, "bodyBatteryUnit": "pts",
            "radDose": 15.1, "radUnit": "mSv",
            "boneDensity": 98, "boneUnit": "% norm",
            "muscleMass": 97, "muscleUnit": "% norm",
            "hydration": 96, "hydrationUnit": "%",
            "sleepHours": 8.0, "sleepUnit": "h",
            "sleepScore": 92, "sleepScoreUnit": "pts",
            "cortisol": 3.8, "cortisolUnit": "ng/ml",
            "lactate": 1.4, "lactateUnit": "mmol/l",
            "cognitiveReadiness": 95, "cognitiveUnit": "%"
        },
        "periodicTests": [
            {
                "id": "pt-201",
                "category": "Cardiology and Blood Pressure",
                "parameter": "Arterial blood pressure and 3-lead ECG",
                "equipment": "Astroskin Bio-Monitor Vest",
                "result": "118/78 mmHg, regular rhythm, normal waveforms",
                "date": "14.11.2026",
                "time": "07:20",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-202",
                "category": "Sleep Analysis",
                "parameter": "Sleep duration, sleep stages, and Sleep Score",
                "equipment": "Actiwatch Biometric Band",
                "result": "8.0 h total sleep, deep 23 %, REM 25 %, awakenings 0, Sleep Score: 92/100 pts",
                "date": "14.11.2026",
                "time": "06:35",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-203",
                "category": "Physical Performance",
                "parameter": "VO2 max aerobic capacity and energy expenditure",
                "equipment": "Garmin Performance Heart Rate Monitor",
                "result": "54.1 ml/kg/min, athletic capacity, recovery status Balanced",
                "date": "13.11.2026",
                "time": "17:00",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-204",
                "category": "Resistance and Aerobic Training",
                "parameter": "ARED resistance and CEVIS ergometer session",
                "equipment": "ARED Station and CEVIS Cycle Ergometer",
                "result": "Strength training 135 kg, ergometer 195 W, duration 120 min, avg HR 132 bpm",
                "date": "14.11.2026",
                "time": "10:45",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-205",
                "category": "Sweat Biochemistry",
                "parameter": "Sweat biomarkers: Cortisol, lactate, electrolytes, CRP",
                "equipment": "Bio-Patch Microfluidic Biosensor",
                "result": "Cortisol 3.8 ng/ml, lactate 1.4 mmol/l, Na 46 mmol/l, K 4.4 mmol/l, CRP 0.5 mg/l",
                "date": "14.11.2026",
                "time": "12:50",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-206",
                "category": "sEMG Muscle Activity",
                "parameter": "Muscle fatigue and sEMG Fibre-WBAN",
                "equipment": "Fibre-WBAN Sensor Straps",
                "result": "Optimal state, no fatigue, MDF 81 Hz, no micro-tremor fluctuations",
                "date": "14.11.2026",
                "time": "11:10",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-207",
                "category": "Central Nervous System CNS",
                "parameter": "Cognitive readiness index and EEG attention",
                "equipment": "EEG Neuro-Sensor Headband",
                "result": "Cognitive readiness index 95 %, very high focus, reaction time 198 ms",
                "date": "14.11.2026",
                "time": "09:25",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-208",
                "category": "Radiation Dosimetry",
                "parameter": "Daily and cumulative radiation exposure",
                "equipment": "Onboard RAD-ISS Dosimeter",
                "result": "Daily dose 0.44 mSv, cumulative 15.1 mSv, within mission plan corridor",
                "date": "14.11.2026",
                "time": "12:00",
                "status": "Normal",
                "statusType": "normal"
            }
        ],
        "telemetryHistory": [
            {"day": "Day 179", "hr": 66, "bpSys": 119, "spo2": 99, "stress": 21, "rad": 14.6},
            {"day": "Day 180", "hr": 64, "bpSys": 117, "spo2": 99, "stress": 19, "rad": 14.7},
            {"day": "Day 181", "hr": 65, "bpSys": 118, "spo2": 99, "stress": 22, "rad": 14.8},
            {"day": "Day 182", "hr": 67, "bpSys": 120, "spo2": 99, "stress": 24, "rad": 14.9},
            {"day": "Day 183", "hr": 63, "bpSys": 116, "spo2": 99, "stress": 18, "rad": 15.0},
            {"day": "Day 184", "hr": 65, "bpSys": 118, "spo2": 99, "stress": 20, "rad": 15.1}
        ],
        "orders": [],
        "dailyChecks": []
    },
    {
        "id": "astro-3",
        "name": "Krzysztof Mysior",
        "role": "",
        "avatarCode": "KM",
        "age": 36,
        "bloodType": "B Rh plus",
        "missionDay": 184,
        "evaHours": 42,
        "overallStatus": "warning",
        "statusLabel": "Observation Required",
        "statusDescription": "Elevated blood pressure and shortened deep sleep phase recorded after EVA session.",
        "vitals": {
            "hr": 82, "hrUnit": "bpm",
            "rr": 731, "rrUnit": "ms",
            "hrv": 38, "hrvUnit": "ms",
            "bpSys": 136, "bpDia": 86, "bpUnit": "mmHg",
            "spo2": 97, "spo2Unit": "%",
            "temp": 37.1, "tempUnit": "deg C",
            "resp": 17, "respUnit": "breaths/min",
            "stressLevel": 54, "stressUnit": "pts",
            "bodyBattery": 52, "bodyBatteryUnit": "pts",
            "radDose": 18.9, "radUnit": "mSv",
            "boneDensity": 94, "boneUnit": "% norm",
            "muscleMass": 93, "muscleUnit": "% norm",
            "hydration": 89, "hydrationUnit": "%",
            "sleepHours": 5.6, "sleepUnit": "h",
            "sleepScore": 64, "sleepScoreUnit": "pts",
            "cortisol": 8.6, "cortisolUnit": "ng/ml",
            "lactate": 2.9, "lactateUnit": "mmol/l",
            "cognitiveReadiness": 74, "cognitiveUnit": "%"
        },
        "periodicTests": [
            {
                "id": "pt-301",
                "category": "Cardiology and Blood Pressure",
                "parameter": "Arterial blood pressure and 3-lead ECG",
                "equipment": "Astroskin Bio-Monitor Vest",
                "result": "136/86 mmHg, sinus rhythm with tendency toward post-exertion tachycardia",
                "date": "14.11.2026",
                "time": "13:10",
                "status": "Needs Attention",
                "statusType": "warning"
            },
            {
                "id": "pt-302",
                "category": "Sleep Analysis",
                "parameter": "Sleep duration, sleep stages, and Sleep Score",
                "equipment": "Actiwatch Biometric Band",
                "result": "5.6 h total sleep, deep 12 %, REM 18 %, 4 awakenings, Sleep Score: 64/100 pts",
                "date": "14.11.2026",
                "time": "06:15",
                "status": "Needs Attention",
                "statusType": "warning"
            },
            {
                "id": "pt-303",
                "category": "Physical Performance",
                "parameter": "VO2 max aerobic capacity and energy expenditure",
                "equipment": "Garmin Performance Heart Rate Monitor",
                "result": "44.8 ml/kg/min, satisfactory capacity, Body Battery reserves reduced",
                "date": "13.11.2026",
                "time": "16:30",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-304",
                "category": "Resistance and Aerobic Training",
                "parameter": "ARED resistance and T2 treadmill session",
                "equipment": "ARED Station and T2 Treadmill",
                "result": "Reduced load 110 kg, treadmill 160 W, duration 90 min, exercise HR 146 bpm",
                "date": "14.11.2026",
                "time": "10:00",
                "status": "Needs Attention",
                "statusType": "warning"
            },
            {
                "id": "pt-305",
                "category": "Sweat Biochemistry",
                "parameter": "Sweat biomarkers: Cortisol, lactate, electrolytes, CRP",
                "equipment": "Bio-Patch Microfluidic Biosensor",
                "result": "Cortisol 8.6 ng/ml elevated, lactate 2.9 mmol/l, Na 56 mmol/l, CRP 1.6 mg/l",
                "date": "14.11.2026",
                "time": "12:40",
                "status": "Needs Attention",
                "statusType": "warning"
            },
            {
                "id": "pt-306",
                "category": "sEMG Muscle Activity",
                "parameter": "Muscle fatigue and sEMG Fibre-WBAN",
                "equipment": "Fibre-WBAN Sensor Straps",
                "result": "Transitional state, warning for erector spinae fatigue, MDF 58 Hz",
                "date": "14.11.2026",
                "time": "11:45",
                "status": "Needs Attention",
                "statusType": "warning"
            },
            {
                "id": "pt-307",
                "category": "Central Nervous System CNS",
                "parameter": "Cognitive readiness index and EEG attention",
                "equipment": "EEG Neuro-Sensor Headband",
                "result": "Cognitive readiness index 74 %, moderate focus, elevated cognitive load",
                "date": "14.11.2026",
                "time": "09:15",
                "status": "Needs Attention",
                "statusType": "warning"
            },
            {
                "id": "pt-308",
                "category": "Radiation Dosimetry",
                "parameter": "Daily and cumulative radiation exposure",
                "equipment": "EVA Suit RAD-EMU Dosimeter",
                "result": "Daily dose 0.88 mSv elevated after EVA sortie, cumulative total 18.9 mSv",
                "date": "14.11.2026",
                "time": "12:00",
                "status": "Needs Attention",
                "statusType": "warning"
            }
        ],
        "telemetryHistory": [
            {"day": "Day 179", "hr": 72, "bpSys": 124, "spo2": 98, "stress": 34, "rad": 18.0},
            {"day": "Day 180", "hr": 76, "bpSys": 128, "spo2": 98, "stress": 40, "rad": 18.2},
            {"day": "Day 181", "hr": 80, "bpSys": 132, "spo2": 97, "stress": 48, "rad": 18.4},
            {"day": "Day 182", "hr": 78, "bpSys": 130, "spo2": 97, "stress": 46, "rad": 18.5},
            {"day": "Day 183", "hr": 84, "bpSys": 138, "spo2": 96, "stress": 56, "rad": 18.7},
            {"day": "Day 184", "hr": 82, "bpSys": 136, "spo2": 97, "stress": 54, "rad": 18.9}
        ],
        "orders": [],
        "dailyChecks": []
    },
    {
        "id": "astro-4",
        "name": "Jan Hopperl",
        "role": "",
        "avatarCode": "JH",
        "age": 44,
        "bloodType": "B Rh minus",
        "missionDay": 184,
        "evaHours": 14,
        "overallStatus": "critical",
        "statusLabel": "Elevated Risk",
        "statusDescription": "Resting tachycardia, reduced bone mineral density, and elevated sweat cortisol level.",
        "vitals": {
            "hr": 104, "hrUnit": "bpm",
            "rr": 576, "rrUnit": "ms",
            "hrv": 22, "hrvUnit": "ms",
            "bpSys": 146, "bpDia": 94, "bpUnit": "mmHg",
            "spo2": 95, "spo2Unit": "%",
            "temp": 37.4, "tempUnit": "deg C",
            "resp": 20, "respUnit": "breaths/min",
            "stressLevel": 78, "stressUnit": "pts",
            "bodyBattery": 28, "bodyBatteryUnit": "pts",
            "radDose": 24.6, "radUnit": "mSv",
            "boneDensity": 89, "boneUnit": "% norm",
            "muscleMass": 88, "muscleUnit": "% norm",
            "hydration": 85, "hydrationUnit": "%",
            "sleepHours": 4.2, "sleepUnit": "h",
            "sleepScore": 46, "sleepScoreUnit": "pts",
            "cortisol": 15.2, "cortisolUnit": "ng/ml",
            "lactate": 4.1, "lactateUnit": "mmol/l",
            "cognitiveReadiness": 58, "cognitiveUnit": "%"
        },
        "periodicTests": [
            {
                "id": "pt-401",
                "category": "Cardiology and Blood Pressure",
                "parameter": "Arterial blood pressure and 3-lead ECG",
                "equipment": "Astroskin Bio-Monitor Vest",
                "result": "146/94 mmHg, sinus tachycardia episodes, shortened RR interval",
                "date": "14.11.2026",
                "time": "13:30",
                "status": "Elevated Risk",
                "statusType": "critical"
            },
            {
                "id": "pt-402",
                "category": "Sleep Analysis",
                "parameter": "Sleep duration, sleep stages, and Sleep Score",
                "equipment": "Actiwatch Biometric Band",
                "result": "4.2 h total sleep, deep 7 %, REM 14 %, 6 awakenings, Sleep Score: 46/100 pts",
                "date": "14.11.2026",
                "time": "06:00",
                "status": "Elevated Risk",
                "statusType": "critical"
            },
            {
                "id": "pt-403",
                "category": "Physical Performance",
                "parameter": "VO2 max aerobic capacity and energy expenditure",
                "equipment": "Garmin Performance Heart Rate Monitor",
                "result": "36.2 ml/kg/min, low capacity, Body Battery depleted at 28 pts",
                "date": "13.11.2026",
                "time": "16:00",
                "status": "Elevated Risk",
                "statusType": "critical"
            },
            {
                "id": "pt-404",
                "category": "Resistance and Aerobic Training",
                "parameter": "ARED resistance and T2 treadmill session",
                "equipment": "ARED Station and T2 Treadmill",
                "result": "Session aborted after 40 min due to dizziness and HR 172 bpm",
                "date": "14.11.2026",
                "time": "09:40",
                "status": "Elevated Risk",
                "statusType": "critical"
            },
            {
                "id": "pt-405",
                "category": "Sweat Biochemistry",
                "parameter": "Sweat biomarkers: Cortisol, lactate, electrolytes, CRP",
                "equipment": "Bio-Patch Microfluidic Biosensor",
                "result": "Cortisol 15.2 ng/ml alert level, lactate 4.1 mmol/l, CRP 2.8 mg/l, Na loss",
                "date": "14.11.2026",
                "time": "12:35",
                "status": "Elevated Risk",
                "statusType": "critical"
            },
            {
                "id": "pt-406",
                "category": "sEMG Muscle Activity",
                "parameter": "Muscle fatigue and sEMG Fibre-WBAN",
                "equipment": "Fibre-WBAN Sensor Straps",
                "result": "Fatigue and overload state, elevated ZCR micro-tremors, MDF dropped to 44 Hz",
                "date": "14.11.2026",
                "time": "11:35",
                "status": "Elevated Risk",
                "statusType": "critical"
            },
            {
                "id": "pt-407",
                "category": "Central Nervous System CNS",
                "parameter": "Cognitive readiness index and EEG attention",
                "equipment": "EEG Neuro-Sensor Headband",
                "result": "Cognitive readiness index 58 %, significant attention drop, theta wave dominance and slowed reaction time",
                "date": "14.11.2026",
                "time": "09:10",
                "status": "Elevated Risk",
                "statusType": "critical"
            },
            {
                "id": "pt-408",
                "category": "Radiation Dosimetry",
                "parameter": "Daily and cumulative radiation exposure",
                "equipment": "Onboard RAD-ISS Dosimeter",
                "result": "Daily dose 0.62 mSv, cumulative total 24.6 mSv, approaching quarterly limit",
                "date": "14.11.2026",
                "time": "12:00",
                "status": "Elevated Risk",
                "statusType": "critical"
            }
        ],
        "telemetryHistory": [
            {"day": "Day 179", "hr": 88, "bpSys": 136, "spo2": 97, "stress": 62, "rad": 23.8},
            {"day": "Day 180", "hr": 92, "bpSys": 139, "spo2": 96, "stress": 68, "rad": 24.0},
            {"day": "Day 181", "hr": 96, "bpSys": 142, "spo2": 96, "stress": 71, "rad": 24.2},
            {"day": "Day 182", "hr": 98, "bpSys": 141, "spo2": 95, "stress": 74, "rad": 24.3},
            {"day": "Day 183", "hr": 106, "bpSys": 148, "spo2": 95, "stress": 82, "rad": 24.5},
            {"day": "Day 184", "hr": 104, "bpSys": 146, "spo2": 95, "stress": 78, "rad": 24.6}
        ],
        "orders": [],
        "dailyChecks": []
    },
    {
        "id": "astro-5",
        "name": "Wojciech Skrzypczak",
        "role": "",
        "avatarCode": "WS",
        "age": 35,
        "bloodType": "AB Rh plus",
        "missionDay": 184,
        "evaHours": 20,
        "overallStatus": "normal",
        "statusLabel": "Stable Condition",
        "statusDescription": "Exemplary adaptation to microgravity. Cognitive readiness index within optimal range.",
        "vitals": {
            "hr": 66, "hrUnit": "bpm",
            "rr": 909, "rrUnit": "ms",
            "hrv": 68, "hrvUnit": "ms",
            "bpSys": 118, "bpDia": 78, "bpUnit": "mmHg",
            "spo2": 99, "spo2Unit": "%",
            "temp": 36.6, "tempUnit": "deg C",
            "resp": 14, "respUnit": "breaths/min",
            "stressLevel": 22, "stressUnit": "pts",
            "bodyBattery": 84, "bodyBatteryUnit": "pts",
            "radDose": 14.8, "radUnit": "mSv",
            "boneDensity": 97, "boneUnit": "% norm",
            "muscleMass": 98, "muscleUnit": "% norm",
            "hydration": 95, "hydrationUnit": "%",
            "sleepHours": 7.9, "sleepUnit": "h",
            "sleepScore": 89, "sleepScoreUnit": "pts",
            "cortisol": 4.0, "cortisolUnit": "ng/ml",
            "lactate": 1.6, "lactateUnit": "mmol/l",
            "cognitiveReadiness": 94, "cognitiveUnit": "%"
        },
        "periodicTests": [
            {
                "id": "pt-501",
                "category": "Cardiology and Blood Pressure",
                "parameter": "Arterial blood pressure and 3-lead ECG",
                "equipment": "Astroskin Bio-Monitor Vest",
                "result": "118/78 mmHg, regular rhythm, normal P-QRS complexes",
                "date": "14.11.2026",
                "time": "07:10",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-502",
                "category": "Sleep Analysis",
                "parameter": "Sleep duration, sleep stages, and Sleep Score",
                "equipment": "Actiwatch Biometric Band",
                "result": "7.9 h total sleep, deep 22 %, REM 24 %, Sleep Score: 89/100 pts",
                "date": "14.11.2026",
                "time": "06:20",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-503",
                "category": "Physical Performance",
                "parameter": "VO2 max aerobic capacity and energy expenditure",
                "equipment": "Garmin Performance Heart Rate Monitor",
                "result": "51.8 ml/kg/min, very high fitness, high energy reserve",
                "date": "13.11.2026",
                "time": "16:15",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-504",
                "category": "Resistance and Aerobic Training",
                "parameter": "ARED resistance and T2 treadmill session",
                "equipment": "ARED Station and T2 Treadmill",
                "result": "Resistance training 140 kg, treadmill 205 W, duration 120 min, HR 136 bpm",
                "date": "14.11.2026",
                "time": "11:00",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-505",
                "category": "Sweat Biochemistry",
                "parameter": "Sweat biomarkers: Cortisol, lactate, electrolytes, CRP",
                "equipment": "Bio-Patch Microfluidic Biosensor",
                "result": "Cortisol 4.0 ng/ml, lactate 1.6 mmol/l, Na 49 mmol/l, K 4.5 mmol/l, CRP 0.6 mg/l",
                "date": "14.11.2026",
                "time": "12:48",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-506",
                "category": "sEMG Muscle Activity",
                "parameter": "Muscle fatigue and sEMG Fibre-WBAN",
                "equipment": "Fibre-WBAN Sensor Straps",
                "result": "Optimal state, no fatigue, MDF 79 Hz, no tremor indicators",
                "date": "14.11.2026",
                "time": "11:40",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-507",
                "category": "Central Nervous System CNS",
                "parameter": "Cognitive readiness index and EEG attention",
                "equipment": "EEG Neuro-Sensor Headband",
                "result": "Cognitive readiness index 94 %, high divided attention and navigational concentration",
                "date": "14.11.2026",
                "time": "09:30",
                "status": "Normal",
                "statusType": "normal"
            },
            {
                "id": "pt-508",
                "category": "Radiation Dosimetry",
                "parameter": "Daily and cumulative radiation exposure",
                "equipment": "Onboard RAD-ISS Dosimeter",
                "result": "Daily dose 0.43 mSv, total cumulative dose 14.8 mSv",
                "date": "14.11.2026",
                "time": "12:00",
                "status": "Normal",
                "statusType": "normal"
            }
        ],
        "telemetryHistory": [
            {"day": "Day 179", "hr": 67, "bpSys": 119, "spo2": 99, "stress": 23, "rad": 14.3},
            {"day": "Day 180", "hr": 65, "bpSys": 117, "spo2": 99, "stress": 21, "rad": 14.4},
            {"day": "Day 181", "hr": 68, "bpSys": 120, "spo2": 99, "stress": 24, "rad": 14.5},
            {"day": "Day 182", "hr": 66, "bpSys": 118, "spo2": 99, "stress": 22, "rad": 14.6},
            {"day": "Day 183", "hr": 64, "bpSys": 117, "spo2": 99, "stress": 20, "rad": 14.7},
            {"day": "Day 184", "hr": 66, "bpSys": 118, "spo2": 99, "stress": 22, "rad": 14.8}
        ],
        "orders": [],
        "dailyChecks": []
    }
]

# Primary application state
app_state = {
    "mode": "demo",
    "currentUser": None,
    "users": copy.deepcopy(DEMO_USERS),
    "astronauts": copy.deepcopy(DEMO_ASTRONAUTS),
    "realUsers": [copy.deepcopy(DEMO_USERS[0])],
    "realAstronauts": [],
    "demoUsers": copy.deepcopy(DEMO_USERS),
    "demoAstronauts": copy.deepcopy(DEMO_ASTRONAUTS),
    "eclssCabin": build_initial_eclss(),
    "crewSummary": {},
  "stepProcedures": [
    {
      "id": 'proc-cisnienie',
      "code": 'HMS-PR-BP-01',
      "name": 'Blood Pressure and SpO2 Measurement',
      "category": 'Cardiovascular and Recovery',
      "description": 'Standardized arterial blood pressure and oxygen saturation protocol in microgravity',
      "steps": [
        'Step 1 of 5: Body stabilization. Sit firmly in the diagnostic chair, fasten waist restraints, and rest motionless for five minutes.',
        'Step 2 of 5: Cuff placement. Position the tensiometer cuff on the left upper arm, exactly two centimeters above the elbow crease at heart level.',
        'Step 3 of 5: Pulse oximeter connection. Attach the optical SpO2 sensor to the right index finger and wait for the pulse waveform to stabilize.',
        'Step 4 of 5: Triple blood pressure capture. Start the automated cycle of three measurements spaced ninety seconds apart between inflations.',
        'Step 5 of 5: Verification and synchronization. Confirm SpO2 exceeds 96 percent and blood pressure is within baseline limits, then commit telemetry upload.'
      ]
    },
    {
      "id": 'proc-ekg',
      "code": 'HMS-PR-EKG-02',
      "name": 'ECG and HRV Variability Recording',
      "category": 'Cardiovascular and Recovery',
      "description": '12-lead Holter recording and calculation of autonomic nervous system reserve indices',
      "steps": [
        'Step 1 of 5: Skin preparation. Clean designated chest electrode sites with an alcohol swab and let dry completely.',
        'Step 2 of 5: Sensor application. Put on the biometric vest or apply the multi-point dermal ECG electrode patch.',
        'Step 3 of 5: Contact quality test. Check skin impedance in the medical console and verify signal noise stays below the error threshold.',
        'Step 4 of 5: Baseline resting capture. Recline calmly for five minutes while breathing steadily to compute heart rate variability HRV.',
        'Step 5 of 5: Recording and arrhythmia check. End session capture, confirm zero extrasystoles in the automated report, and transmit protocol to control.'
      ]
    },
    {
      "id": 'proc-pot',
      "code": 'HMS-PR-SWEAT-03',
      "name": 'Microfluidic Sweat Patch Biochemical Analysis',
      "category": 'Biochemistry and Stress: Sweat Analysis',
      "description": 'Quantification of sodium, potassium, lactate, calcium ions, and CRP protein',
      "steps": [
        'Step 1 of 5: Sensor preparation. Clean the inner forearm and unseal the hermetically packaged capillary microfluidic biosensor.',
        'Step 2 of 5: Patch application. Place the flexible patch onto the skin and press the perimeter evenly for twenty seconds to ensure an airtight seal.',
        'Step 3 of 5: Stimulating micro-iontophoresis. Activate the 3-minute low-current pilocarpine iontophoresis cycle to stimulate eccrine sweat glands.',
        'Step 4 of 5: Biomarker capture. Wait for the enzymatic micro-channel to fill and log sodium, potassium, lactate, calcium electrolytes, and CRP cytokines.',
        'Step 5 of 5: Telemetry transfer. Perform wireless NFC sync with the onboard terminal and dispose of the spent cartridge in medical waste.'
      ]
    },
    {
      "id": 'proc-semg',
      "code": 'HMS-PR-SEMG-04',
      "name": 'Neuromuscular sEMG Fatigue and Dynamometry Assessment',
      "category": 'Musculoskeletal System',
      "description": 'Median frequency MDF and zero-crossing rate ZCR measurement on the ARED device',
      "steps": [
        'Step 1 of 5: Electrode placement. Apply surface sEMG electrodes along the rectus femoris belly and gastrocnemius calf muscle.',
        'Step 2 of 5: Zero calibration. Record a 10-second resting baseline to determine background noise and resting muscle tone.',
        'Step 3 of 5: Maximal isometric contraction. Perform a 5-second test contraction on the ARED unit to establish peak reference force.',
        'Step 4 of 5: Monitored training set. Complete the squat set while tracking real-time median signal frequency MDF.',
        'Step 5 of 5: ZCR micro-tremor analysis. Verify zero-crossing rate ZCR shows no spike indicating extreme overload clustering and save the result.'
      ]
    },
    {
      "id": 'proc-cns',
      "code": 'HMS-PR-CNS-05',
      "name": 'EEG Brainwaves and Eye-Tracking Focus Examination',
      "category": 'Sleep and Central Nervous System',
      "description": 'Assessment of cognitive fatigue, psychomotor reaction time, and Cognitive Readiness index',
      "steps": [
        'Step 1 of 5: EEG headband placement. Fit the dry-electrode headband over forehead and occiput, adjusting tension until signal indicators turn green.',
        'Step 2 of 5: Eye-tracker calibration. Gaze sequentially at 5 illuminated reference points on the primary workstation console display.',
        'Step 3 of 5: Psychomotor vigilance test PVT. Complete the standardized 3-minute reaction-time test responding to random visual stimuli.',
        'Step 4 of 5: Theta and beta wave spectral analysis. The system automatically computes cumulative cognitive fatigue index and gaze fixation duration.',
        'Step 5 of 5: Readiness index sign-off. Verify the final Cognitive Readiness score and attach the report to the mission schedule.'
      ]
    }
  ],
  "scheduleData": {
    "nextTestCountdownSeconds": 2720,
    "upcomingTests": [
      {
        "id": 'up-1',
        "title": 'Blood Pressure and SpO2 Measurement',
        "astronaut": 'Adam Kolosa',
        "timeUtc": 'Today 17:15 UTC',
        "procId": 'proc-cisnienie'
      },
      {
        "id": 'up-2',
        "title": 'ECG and HRV Variability Recording',
        "astronaut": 'Jan Hopperl',
        "timeUtc": 'Today 19:30 UTC',
        "procId": 'proc-ekg'
      },
      {
        "id": 'up-3',
        "title": 'EEG Brainwaves and Eye-Tracking Focus Test',
        "astronaut": 'Wojciech Skrzypczak',
        "timeUtc": 'Tomorrow 07:00 UTC',
        "procId": 'proc-cns'
      },
      {
        "id": 'up-4',
        "title": 'Biochemical Sweat Analysis: Calcium and CRP',
        "astronaut": 'Krzysztof Mysior',
        "timeUtc": 'Tomorrow 11:00 UTC',
        "procId": 'proc-pot'
      }
    ],
    "overdueFifoQueue": [
      {
        "id": 'fifo-1',
        "title": 'Biochemical Sweat Analysis: Electrolytes and Cortisol',
        "astronaut": 'Krzysztof Mysior',
        "dueTime": 'Yesterday 20:30 UTC',
        "delay": '20 h ago',
        "orderIndex": 1,
        "procId": 'proc-pot'
      },
      {
        "id": 'fifo-2',
        "title": 'Neuromuscular sEMG Assessment on ARED',
        "astronaut": 'Michał Pawlak',
        "dueTime": 'Today 08:00 UTC',
        "delay": '8 h ago',
        "orderIndex": 2,
        "procId": 'proc-semg'
      }
    ]
  },
  "prophylaxisGuidelines": [
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Elevated resting heart rate HR or sudden daytime spike',
      "guideline": 'Rest, cease current exertion, rehydrate, and complete a stress-reducing breathing session.'
    },
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Morning rise in resting heart rate combined with decreased HRV variability',
      "guideline": 'Sign of incomplete overnight recovery. Automatically lower scheduled task intensity and swap heavy duties for lighter work.'
    },
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Multi-day downward HRV trend',
      "guideline": 'Indicator of cumulative fatigue or overtraining. Schedule a recovery day, extend sleep duration, and restrict high-intensity exercise.'
    },
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Sudden arterial blood pressure drop during activity or EVA spacewalk',
      "guideline": 'Immediately halt physical work, replenish fluids and electrolytes, monitor orthostatic symptoms, and notify the flight surgeon.'
    },
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Gradual arterial blood pressure increase over time',
      "guideline": 'Reduce psychophysical workload, apply relaxation techniques, and review fluid-electrolyte balance especially sodium intake.'
    },
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Cardiac rhythm disturbances arrhythmia detected during exercise or rest',
      "guideline": 'Stop task immediately, rest, retrieve full ECG waveform from biometric vest or dermal patch, and request urgent medical consult.'
    },
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Blood oxygen saturation SpO2 drop below baseline or downward trend during exertion',
      "guideline": 'Halt activity, check ventilation and O2 concentration in suit or cabin, and practice calm deep breathing.'
    },
    {
      "category": 'Cardiovascular and Recovery',
      "symptom": 'Gradual or sudden rise in body temperature',
      "guideline": 'Early sign of overheating or developing infection. Cool the body, adjust cabin or spacesuit temperature, hydrate, rest, and cross-verify sweat CRP protein levels.'
    },
    {
      "category": 'Sleep and Central Nervous System',
      "symptom": 'Overnight deficit in deep sleep or REM sleep stages',
      "guideline": 'Defer high-precision tasks such as delicate repairs or experiments and schedule a short daytime restorative power nap.'
    },
    {
      "category": 'Sleep and Central Nervous System',
      "symptom": 'Multi-day deficit in total sleep time and quality: actigraphy and EEG',
      "guideline": 'Lower Cognitive Readiness operational score, assign routine tasks only, and tune pre-sleep cabin environment by reducing temperature and CO2 levels.'
    },
    {
      "category": 'Sleep and Central Nervous System',
      "symptom": 'EEG brainwave pattern shift indicating mounting cognitive fatigue on duty',
      "guideline": 'Introduce a brief 10-minute recovery break and rotate to lower cognitive-load tasks.'
    },
    {
      "category": 'Sleep and Central Nervous System',
      "symptom": 'Focus drop captured via eye-tracking: prolonged fixation time and slower responses',
      "guideline": 'Trigger haptic break alert and step back from critical flight or equipment controls until full attention returns.'
    },
    {
      "category": 'Sleep and Central Nervous System',
      "symptom": 'Concurrent drop in EEG and eye-tracking focus alongside rising ambient CO2',
      "guideline": 'Immediately ventilate compartment or module, exit poor-airflow zone, and take a recovery rest period.'
    },
    {
      "category": 'Musculoskeletal System',
      "symptom": 'Decline in sEMG median frequency MDF during exercise sets or physical work',
      "guideline": 'Early muscle fatigue signal, transitional state. Dynamically reduce training load on ARED or T2 or shorten task block.'
    },
    {
      "category": 'Musculoskeletal System',
      "symptom": 'Increase in sEMG zero-crossing rate ZCR indicating muscle micro-tremors',
      "guideline": 'Sign of critical exhaustion and injury risk: Cluster 3 Fatigue and Overload. Immediately cease exertion, stretch, and take extended rest.'
    },
    {
      "category": 'Musculoskeletal System',
      "symptom": 'Drop in joint power and torque measured via IMU, goniometer, and Fibre-WBAN garment vs previous days',
      "guideline": 'Modify exercise prescription and enable EMS neuromuscular stimulation to aid recovery and prevent atrophy.'
    },
    {
      "category": 'Musculoskeletal System',
      "symptom": 'Prolonged restriction in lumbar-hip range of motion and activity: IMU and tactile sensors',
      "guideline": 'Add targeted lumbar-hip stretching and mobility routines to counteract stiffness and muscle atrophy in microgravity.'
    },
    {
      "category": 'Musculoskeletal System',
      "symptom": 'Muscle recruitment asymmetry or improper joint flexion angles during lifting or suit work',
      "guideline": 'Correct movement form in real time and lower resistance load to prevent joint overload.'
    },
    {
      "category": 'Biochemistry and Stress: Sweat Analysis',
      "symptom": 'Elevated morning cortisol level: circadian rhythm disruption',
      "guideline": 'Trim daily workload schedule and perform guided breathing or relaxation exercises.'
    },
    {
      "category": 'Biochemistry and Stress: Sweat Analysis',
      "symptom": 'Sudden daytime cortisol spike: acute stress response',
      "guideline": 'Take a short break from current duties, practice calming techniques, and re-verify heart rate and blood pressure.'
    },
    {
      "category": 'Biochemistry and Stress: Sweat Analysis',
      "symptom": 'Rapid increase in sweat lactate concentration during exertion',
      "guideline": 'Signal of anaerobic threshold breach and lactic buildup. Slow work or exercise pace and take a 10-minute rest and hydration break.'
    },
    {
      "category": 'Biochemistry and Stress: Sweat Analysis',
      "symptom": 'Rising sodium Na plus and potassium K plus concentrations in sweat',
      "guideline": 'Sign of progressive dehydration. Immediate alert to replenish fluids and electrolytes.'
    },
    {
      "category": 'Biochemistry and Stress: Sweat Analysis',
      "symptom": 'Persistent weekly or monthly rise in sweat calcium Ca 2 plus excretion',
      "guideline": 'Indicator of accelerated bone demineralization: space osteopenia. Review vitamin D and calcium supplementation and adjust resistance loads.'
    },
    {
      "category": 'Biochemistry and Stress: Sweat Analysis',
      "symptom": 'Elevated CRP protein and pro-inflammatory cytokines in sweat',
      "guideline": 'Early detection of inflammation, muscle micro-trauma, or nascent infection prior to fever onset. Mandatory rest, cancel exercise, and start clinical monitoring.'
    },
    {
      "category": 'Cabin and Suit Environment',
      "symptom": 'Rising carbon dioxide CO2 concentration in module or spacesuit',
      "guideline": 'Prevent headaches, drowsiness, and focus drops by automatically boosting ECLSS scrubbing throughput or replacing CO2 cartridges.'
    },
    {
      "category": 'Cabin and Suit Environment',
      "symptom": 'Elevated ambient temperature and humidity during physical work or sleep',
      "guideline": 'Pre-cool crew cabin before sleep to enhance NREM and REM architecture, and regulate EVA liquid cooling loop to avoid dehydration and overheating.'
    },
    {
      "category": 'Cabin and Suit Environment',
      "symptom": 'Elevated nitric oxide NO detected by garment sensors',
      "guideline": 'Indicator of airway irritation or inflammation. Inspect cabin air for particulates and aerosols, hydrate mucous membranes, and rest.'
    },
    {
      "category": 'Cabin and Suit Environment',
      "symptom": 'Rising cumulative ionizing radiation dose recorded by dosimeters',
      "guideline": 'Minimize stay in lightly shielded modules or abort EVA sortie, shelter in high-shielding volume, and monitor oxidative stress and CRP markers.'
    }
  ],
  "criticalScenarios": [
    {
      "category": 'Cardiovascular and Life Threat',
      "title": 'Severe or sustained arrhythmia detected on ECG or PPG during EVA or rest',
      "action": 'Immediate EVA termination by crewmate and escort back to airlock. Urgent flight surgeon teleconsultation and Earth return evaluation if rhythm fails to stabilize.'
    },
    {
      "category": 'Cardiovascular and Life Threat',
      "title": 'Rapid severe drop in blood pressure BP paired with elevated HR and dizziness',
      "action": 'Syncope risk amplified by cephalad fluid shift and cardiac deconditioning in microgravity. Requires immediate crewmate stabilization, IV/oral fluids, and flight surgeon intervention.'
    },
    {
      "category": 'Cardiovascular and Life Threat',
      "title": 'Critical SpO2 desaturation unresponsive to oxygen adjustment in suit or cabin',
      "action": 'Suspected pulmonary edema, embolism, or respiratory system failure. Immediate crew assistance: 100 percent oxygen delivery, CPR readiness, flight surgeon alert, and evacuation staging.'
    },
    {
      "category": 'Cardiovascular and Life Threat',
      "title": 'High fever with abrupt body temperature surge combined with cardiac instability',
      "action": 'Indicator of severe systemic infection or sepsis. Isolate in medical bay under crew care, start flight surgeon pharmacotherapy, and evaluate medical evacuation.'
    },
    {
      "category": 'Central Nervous System and Cognitive Function',
      "title": 'Sudden loss of attention on eye-tracking and pathological EEG during critical operations',
      "action": 'Risk of loss of consciousness or critical error during docking, repair, or EVA. Immediate duty handover and crewmate securing of the astronaut.'
    },
    {
      "category": 'Central Nervous System and Cognitive Function',
      "title": 'Severe multi-day sleep and circadian disruption causing hallucinations or deep disorientation',
      "action": 'Cognitive Readiness collapse driven by stress, isolation, and overload. Requires mission psychologist or flight surgeon intervention, continuous crew watch, and possible early return to Earth.'
    },
    {
      "category": 'Central Nervous System and Cognitive Function',
      "title": 'Acute motor coordination deficit via IMU or goniometer combined with EEG abnormalities',
      "action": 'Suspected stroke or acute neurological event such as cosmic radiation insult. Immediate crew care, flight surgeon emergency alert, and urgent evacuation to Earth.'
    },
    {
      "category": 'Muscles, Musculoskeletal System and Trauma',
      "title": 'Abrupt uncontrolled muscle micro-tremors ZCR spike in sEMG and sudden IMU force or torque drop during EVA',
      "action": 'Total muscular exhaustion risking grip loss, untethered drift, or injury. Immediate EVA buddy rescue to return to station and secure hardware.'
    },
    {
      "category": 'Muscles, Musculoskeletal System and Trauma',
      "title": 'Acute joint flexion asymmetry and sudden muscle power loss accompanied by pain',
      "action": 'Suspected muscle tear, ligament rupture, or fracture given 1 to 2 percent monthly bone loss risk. Crew immobilization, ground orthopedic surgical consult, and Earth return if surgery is indicated.'
    },
    {
      "category": 'Muscles, Musculoskeletal System and Trauma',
      "title": 'Loss of lumbar-hip stability and mobility tracked by IMU and hip tactile sensors',
      "action": 'Acute disc herniation or severe spinal pain syndrome caused by microgravity spinal unloading. Requires crew transport assistance, bedside care, and specialist consult.'
    },
    {
      "category": 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      "title": 'Abrupt spike in sweat CRP protein and pro-inflammatory cytokines via microfluidic patch',
      "action": 'Acute inflammation, severe infection such as pneumonia or appendicitis, or massive muscle breakdown: rhabdomyolysis. Demands immediate flight surgeon intervention, onboard diagnostics, and evacuation evaluation.'
    },
    {
      "category": 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      "title": 'Critical electrolyte derangement: extreme sweat Na plus and K plus swings with HR/HRV arrhythmia',
      "action": 'Severe dehydration or potassium imbalance risking cardiac arrest. Intravenous fluid resuscitation required by trained crewmate under flight surgeon direction.'
    },
    {
      "category": 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      "title": 'Extremely elevated lactate persisting after cessation of exertion',
      "action": 'Indicator of lactic acidosis or tissue hypoxia. Requires urgent ground specialist assessment and oxygen therapy supervised by crew.'
    },
    {
      "category": 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      "title": 'Persistently critical sweat calcium ion Ca 2 plus levels',
      "action": 'Signal of rapid bone demineralization posing acute renal stone and pathological fracture risk. Requires endocrinologist or flight surgeon intervention, therapy update, and early Earth return assessment.'
    },
    {
      "category": 'Cabin and Suit Environmental Hazards',
      "title": 'Sudden CO2 surge or O2 drop in EVA suit or isolated module paired with falling SpO2 and EEG anomalies',
      "action": 'Acute hypercapnia or hypoxia: CO2 toxicity or oxygen starvation. Immediate crewmate rescue: connect backup O2 supply, evacuate hazard zone, and administer emergency care.'
    },
    {
      "category": 'Cabin and Suit Environmental Hazards',
      "title": 'Nitric oxide NO spike detected by garment sensors during system failure or fire',
      "action": 'Acute chemical airway irritation or edema. Don oxygen masks immediately, evacuate casualty, consult pulmonology or toxicology, and evacuate to Earth if respiratory failure develops.'
    },
    {
      "category": 'Cabin and Suit Environmental Hazards',
      "title": 'Critical ionizing radiation dose exceeded on dosimeters, e.g. during solar storm on EVA',
      "action": 'Risk of acute radiation syndrome ARS. Seek immediate shelter in radiation-hardened module with crew aid, initiate specialist ground protocol, and expedite Earth return.'
    },
    {
      "category": 'Cabin and Suit Environmental Hazards',
      "title": 'EVA suit cooling loop failure driving extreme hyperthermia and tachycardia',
      "action": 'Heat stroke risk. Immediate EVA abort initiated by partner, rapid cooling inside the airlock by crew, and continuous flight surgeon supervision.'
    }
  ],
}

# Telemetry stream configuration
stream_config = {
    "active": True,
    "interval": 2.0,
    "scenario": "resting",
    "packet_counter": 1280,
    "last_packet_time": datetime.now(timezone.utc).strftime("%H:%M:%S")
}

SCENARIOS = {
    "resting": {
        "hr_target": 68, "hr_range": 4,
        "spo2_target": 99,
        "bp_sys_target": 120, "bp_dia_target": 80,
        "resp_target": 14, "stress_target": 22,
        "rad_rate": 0.001, "temp_target": 36.6
    },
    "training": {
        "hr_target": 148, "hr_range": 8,
        "spo2_target": 97,
        "bp_sys_target": 152, "bp_dia_target": 88,
        "resp_target": 26, "stress_target": 56,
        "rad_rate": 0.001, "temp_target": 37.3
    },
    "eva": {
        "hr_target": 96, "hr_range": 6,
        "spo2_target": 98,
        "bp_sys_target": 130, "bp_dia_target": 84,
        "resp_target": 18, "stress_target": 46,
        "rad_rate": 0.012, "temp_target": 36.7
    },
    "anomaly": {
        "hr_target": 136, "hr_range": 10,
        "spo2_target": 93,
        "bp_sys_target": 162, "bp_dia_target": 96,
        "resp_target": 24, "stress_target": 82,
        "rad_rate": 0.002, "temp_target": 37.5
    }
}

CREW_RESTING_BASELINE = {
    "tetno": (68.0, 25.0),
    "hrv_rmssd": (65.0, 64.0),
    "spo2": (98.8, 0.5),
    "oddech": (14.0, 2.2),
    "cisnienie_skurczowe": (120.0, 30.0),
    "cisnienie_rozkurczowe": (80.0, 20.0),
    "temperatura_ciala": (36.6, 0.04),
    "sen_godziny": (7.8, 0.25),
    "sleep_score": (86.0, 25.0),
    "stres_opaska": (24.0, 36.0),
    "body_battery": (84.0, 49.0),
    "kortyzol_pot": (4.2, 0.6),
    "mleczany_pot": (1.6, 0.16),
    "gotowosc_poznawcza": (92.0, 20.0),
    "cisnienie_kabiny": (101.3, 0.25),
    "o2_kabiny": (20.9, 0.08),
}

model_centra: dict[str, Centrum] = {}


def _safe_id(astro_id: str) -> str:
    cleaned = "".join(ch for ch in str(astro_id) if ch.isalnum() or ch in "-_")
    return cleaned or "default"


def get_or_create_centrum(astro_id: str) -> Centrum:
    key = _safe_id(astro_id)
    if key not in model_centra:
        BAZY_OSOBISTE_DIR.mkdir(parents=True, exist_ok=True)
        c = Centrum(
            katalog=BAZY_OSOBISTE_DIR / key,
            plik_sieci=PLIK_SIECI,
            loguj_csv=False,
        )
        for pkey, bdata in STATION_BASELINE.items():
            if isinstance(bdata, dict) and "sr" in bdata:
                c.baza.zasiej_jezeli_puste(
                    pkey,
                    float(bdata["sr"]),
                    float(bdata.get("war", 0.0)),
                    max(int(bdata.get("n", 30)), 30),
                )
        for pkey, (sr, war) in CREW_RESTING_BASELINE.items():
            c.baza.zasiej_jezeli_puste(pkey, sr, war)
        model_centra[key] = c
    return model_centra[key]


def build_pomiary_for_astronaut(astro: dict, eclss: dict) -> list[dict]:
    v = astro.get("vitals", {})
    teraz = time.time()
    pary = [
        ("temperatura_kabiny", eclss.get("temp"), "eclss"),
        ("wilgotnosc_kabiny", eclss.get("humidity"), "eclss"),
        ("co2_kabiny", eclss.get("co2"), "eclss"),
        ("cisnienie_kabiny", eclss.get("pressure"), "eclss"),
        ("o2_kabiny", eclss.get("o2"), "eclss"),
        ("promieniowanie_dobowe", eclss.get("dailyRadiation", 0.21), "eclss"),
        ("tetno", v.get("hr"), "biometria"),
        ("hrv_rmssd", v.get("hrv", 65), "biometria"),
        ("spo2", v.get("spo2"), "biometria"),
        ("oddech", v.get("resp", 14), "biometria"),
        ("cisnienie_skurczowe", v.get("bpSys"), "biometria"),
        ("cisnienie_rozkurczowe", v.get("bpDia"), "biometria"),
        ("temperatura_ciala", v.get("temp", 36.6), "biometria"),
        ("sen_godziny", v.get("sleepHours", 7.8), "sen"),
        ("sleep_score", v.get("sleepScore", 85), "sen"),
        ("stres_opaska", v.get("stressLevel", 24), "garmin"),
        ("body_battery", v.get("bodyBattery", 85), "garmin"),
        ("kortyzol_pot", v.get("cortisol", 4.2), "biopatch"),
        ("mleczany_pot", v.get("lactate", 1.6), "biopatch"),
        ("gotowosc_poznawcza", v.get("cognitiveReadiness", 90), "eeg"),
    ]
    out = []
    for param, val, zrodlo in pary:
        if val is not None:
            try:
                num = float(val)
                if math.isfinite(num):
                    out.append({
                        "parametr": param,
                        "wartosc": num,
                        "zrodlo": zrodlo,
                        "czas_danych": teraz,
                    })
            except (TypeError, ValueError):
                pass
    return out


def feed_astronaut_to_model(astro: dict, eclss: dict, natychmiast: bool = False) -> dict:
    c = get_or_create_centrum(astro["id"])
    pomiary = build_pomiary_for_astronaut(astro, eclss)
    if pomiary:
        c.dodaj(pomiary)
    c.krok(natychmiast=natychmiast)
    snap = c.migawka()
    astro["modelSummary"] = snap

    ui_status = status_na_ui(snap.get("ogolny", {}).get("status"))
    astro["overallStatus"] = ui_status
    if ui_status == "critical":
        astro["statusLabel"] = "Elevated Risk"
    elif ui_status == "warning":
        astro["statusLabel"] = "Observation Required"
    else:
        astro["statusLabel"] = "Stable Condition"

    indeks = snap.get("ogolny", {}).get("indeks")
    anom_val = snap.get("anomalia", {}).get("wynik")
    odchylone = snap.get("raport", {}).get("odchylone", [])
    idx_txt = f"{indeks:.0f}/100" if indeks is not None else "N/A"
    if odchylone:
        first_dev = odchylone[0]
        if first_dev.startswith("1. "):
            first_dev = first_dev[3:]
        astro["statusDescription"] = f"Model index {idx_txt}. {first_dev}"
    elif anom_val is not None and anom_val >= 75:
        astro["statusDescription"] = f"Model index {idx_txt}, anomaly network {anom_val:.0f}/100. Monitor signal profile."
    else:
        astro["statusDescription"] = f"Model index {idx_txt}. All domains remain within reference and personal baselines."
    return snap


def compute_crew_summary(astronauts: list, eclss: dict) -> dict:
    total = len(astronauts)
    normal = sum(1 for a in astronauts if a.get("overallStatus") == "normal")
    warning = sum(1 for a in astronauts if a.get("overallStatus") == "warning")
    critical = sum(1 for a in astronauts if a.get("overallStatus") == "critical")

    indices = []
    anomalies = []
    priority = []
    area_agg: dict[str, dict] = {}
    alerts = []
    recs = []
    seen_recs = set()

    for a in astronauts:
        snap = a.get("modelSummary") or {}
        og = snap.get("ogolny") or {}
        an = snap.get("anomalia") or {}
        rap = snap.get("raport") or {}

        idx = og.get("indeks")
        if idx is not None:
            indices.append(float(idx))
        an_w = an.get("wynik")
        if an_w is not None:
            anomalies.append(float(an_w))

        dev_areas = [o for o in snap.get("odchylenia", []) if o.get("odchylony")]
        for o in snap.get("odchylenia", []):
            ak = o.get("obszar") or o.get("klucz")
            if not ak:
                continue
            cur = area_agg.setdefault(ak, {
                "obszar": ak,
                "klucz": ak,
                "nazwa": o.get("nazwa", ak),
                "maxWynik": 0.0,
                "odchyleni": 0,
            })
            cur["maxWynik"] = max(cur["maxWynik"], float(o.get("wynik", 0.0)))
            if o.get("odchylony"):
                cur["odchyleni"] += 1

        astro_recs = rap.get("zalecenia") or []
        for r in astro_recs:
            if r not in seen_recs:
                seen_recs.add(r)
                recs.append(r)

        for al in (snap.get("alerty") or [])[:3]:
            alerts.append({
                "astroId": a.get("id"),
                "astroName": a.get("name"),
                "t": al.get("t", 0.0),
                "poziom": al.get("poziom", "uwaga"),
                "tekst": al.get("tekst", ""),
            })

        priority.append({
            "id": a.get("id"),
            "name": a.get("name"),
            "overallStatus": a.get("overallStatus", "normal"),
            "statusLabel": a.get("statusLabel", "Stable Condition"),
            "index": round(float(idx), 1) if idx is not None else None,
            "anomaly": round(float(an_w), 1) if an_w is not None else None,
            "topDeviations": [o.get("nazwa") for o in dev_areas[:3]],
            "topRecommendation": astro_recs[0] if astro_recs else "Maintain current schedule and routine observation.",
        })

    priority.sort(key=lambda item: (item["index"] if item["index"] is not None else 999.0))
    alerts.sort(key=lambda item: -float(item.get("t", 0.0)))
    top_areas = sorted(area_agg.values(), key=lambda x: (-x["odchyleni"], -x["maxWynik"]))

    crew_index = round(sum(indices) / len(indices), 1) if indices else 100.0
    avg_anom = round(sum(anomalies) / len(anomalies), 1) if anomalies else None

    if critical > 0:
        overall = "critical"
        label = "Elevated Risk"
        noun_c = "crew member" if critical == 1 else "crew members"
        summary_text = (
            f"Average crew readiness index is {crew_index:.1f}/100. "
            f"Model indicates critical status for {critical} {noun_c} and requires urgent deviation review."
        )
    elif warning > 0:
        overall = "warning"
        label = "Observation Required"
        noun_w = "crew member" if warning == 1 else "crew members"
        summary_text = (
            f"Average crew readiness index is {crew_index:.1f}/100. "
            f"Parameter deviations from reference or personal baselines detected for {warning} {noun_w}."
        )
    elif total == 0:
        overall = "normal"
        label = "No crew"
        summary_text = "No active crew members in the current mission. Add astronauts in the Settings tab."
    else:
        overall = "normal"
        label = "Stable Condition"
        summary_text = (
            f"Average crew readiness index is {crew_index:.1f}/100. "
            "Summarizing model confirms a stable biometric and environmental profile across the entire crew."
        )

    return {
        "crewIndex": crew_index,
        "overallStatus": overall,
        "statusLabel": label,
        "avgAnomaly": avg_anom,
        "co2": eclss.get("co2", 2641),
        "temp": eclss.get("temp", 24.1),
        "dailyRadiation": eclss.get("dailyRadiation", 0.21),
        "counts": {
            "total": total,
            "normal": normal,
            "warning": warning,
            "critical": critical,
        },
        "priorityAstronauts": priority,
        "topDeviatedAreas": top_areas[:5],
        "alerts": alerts[:8],
        "recommendations": recs[:6],
        "summaryText": summary_text,
        "updatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


def sync_all_models(natychmiast: bool = False):
    eclss = app_state.get("eclssCabin") or build_initial_eclss()
    for a in app_state.get("astronauts", []):
        feed_astronaut_to_model(a, eclss, natychmiast=natychmiast)
    app_state["crewSummary"] = compute_crew_summary(app_state.get("astronauts", []), eclss)


sync_all_models(natychmiast=True)


def telemetry_background_thread():
    while not stop_event.is_set():
        time.sleep(stream_config["interval"])
        if not stream_config["active"]:
            continue

        with state_lock:
            eclss = app_state["eclssCabin"]
            if OSDR_RECORDS:
                osdr_cursor["idx"] = (osdr_cursor["idx"] + 1) % len(OSDR_RECORDS)
                rec = OSDR_RECORDS[osdr_cursor["idx"]]
                co2_val = float(rec.get("co2_iss", eclss.get("co2", 2641)))
                if stream_config["scenario"] == "anomaly":
                    co2_val = min(4800.0, co2_val + 450.0)
                eclss["temp"] = round(float(rec.get("temperature_iss", eclss.get("temp", 24.1))), 1)
                eclss["humidity"] = int(round(float(rec.get("humidity_iss", eclss.get("humidity", 39)))))
                eclss["co2"] = int(round(co2_val))
                eclss["sourceTime"] = rec.get("time", "OSDR RR-1")
            else:
                eclss["temp"] = round(22.4 + (random.random() * 0.4), 1)
                eclss["humidity"] = round(40 + (random.random() * 3), 0)
                eclss["co2"] = int(2500 + (random.random() * 200))

            eclss["pressure"] = round(101.2 + (random.random() * 0.2), 1)
            eclss["o2"] = round(20.8 + (random.random() * 0.2), 1)
            rad_base = float(STATION_BASELINE.get("promieniowanie_dobowe", {}).get("sr", 0.21))
            if stream_config["scenario"] == "eva":
                rad_base = 0.65
            elif stream_config["scenario"] == "anomaly":
                rad_base = 0.92
            eclss["dailyRadiation"] = round(max(0.12, rad_base + (random.random() * 0.04 - 0.02)), 2)

            if not app_state["astronauts"]:
                app_state["crewSummary"] = compute_crew_summary([], eclss)
                continue

            stream_config["packet_counter"] += 1
            now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S")
            stream_config["last_packet_time"] = now_utc
            sc = SCENARIOS.get(stream_config["scenario"], SCENARIOS["resting"])

            for a in app_state["astronauts"]:
                v = a["vitals"]
                astro_sc = sc
                cortisol_target = 4.2
                lactate_target = 1.6
                cog_target = 92

                if stream_config["scenario"] == "training":
                    cortisol_target = 7.2
                    lactate_target = 3.2
                    cog_target = 86
                elif stream_config["scenario"] == "eva":
                    cortisol_target = 6.2
                    lactate_target = 2.4
                    cog_target = 84

                keep_clinical_demo = (
                    app_state.get("mode") == "demo"
                    and stream_config["scenario"] in ("resting", "anomaly")
                )
                if keep_clinical_demo and a["id"] == "astro-4":
                    is_anom = stream_config["scenario"] == "anomaly"
                    astro_sc = {
                        "hr_target": 106 if is_anom else 104, "hr_range": 6,
                        "spo2_target": 94,
                        "bp_sys_target": 148 if is_anom else 146, "bp_dia_target": 96 if is_anom else 94,
                        "resp_target": 21 if is_anom else 20, "stress_target": 82,
                        "rad_rate": 0.002, "temp_target": 37.5 if is_anom else 37.4
                    }
                    cortisol_target = 15.2
                    lactate_target = 4.1
                    cog_target = 58
                elif keep_clinical_demo and a["id"] == "astro-3":
                    astro_sc = {
                        "hr_target": 86, "hr_range": 4,
                        "spo2_target": 97,
                        "bp_sys_target": 138, "bp_dia_target": 88,
                        "resp_target": 17, "stress_target": 56,
                        "rad_rate": 0.001, "temp_target": 37.1
                    }
                    cortisol_target = 8.8
                    lactate_target = 2.9
                    cog_target = 74

                hr_drift = (random.random() * 2 - 1) * astro_sc.get("hr_range", 4) * 0.4
                hr_step = round((astro_sc["hr_target"] - v["hr"]) * 0.22 + hr_drift)
                v["hr"] = max(45, min(200, v["hr"] + hr_step))

                v["rr"] = round(60000 / v["hr"])
                hrv_target = max(20, min(95, round(86 - (v["stressLevel"] * 0.8))))
                v["hrv"] = max(15, min(120, round(v.get("hrv", 65) + (hrv_target - v.get("hrv", 65)) * 0.22 + (random.random() * 1.4 - 0.7))))

                spo2_step = round((astro_sc["spo2_target"] - v["spo2"]) * 0.35)
                spo2_rand = -1 if (random.random() < 0.08 and v["spo2"] >= astro_sc["spo2_target"]) else 0
                v["spo2"] = max(85, min(100, v["spo2"] + spo2_step + spo2_rand))

                bp_sys_step = round((astro_sc["bp_sys_target"] - v["bpSys"]) * 0.18 + (random.random() * 2 - 1))
                v["bpSys"] = max(80, min(210, v["bpSys"] + bp_sys_step))

                bp_dia_step = round((astro_sc["bp_dia_target"] - v["bpDia"]) * 0.18 + (random.random() * 2 - 1))
                v["bpDia"] = max(50, min(130, v["bpDia"] + bp_dia_step))

                resp_step = round((astro_sc["resp_target"] - v["resp"]) * 0.2 + (random.random() * 1.5 - 0.75))
                v["resp"] = max(8, min(36, v["resp"] + resp_step))

                stress_step = round((astro_sc["stress_target"] - v["stressLevel"]) * 0.18 + (random.random() * 2 - 1))
                v["stressLevel"] = max(5, min(99, v["stressLevel"] + stress_step))

                if "bodyBattery" in v:
                    bb_delta = -0.1 if v["stressLevel"] > 50 else 0.05
                    v["bodyBattery"] = max(5, min(100, round(v["bodyBattery"] + bb_delta + (random.random() * 0.2 - 0.1), 1)))

                v["radDose"] = round(v["radDose"] + astro_sc["rad_rate"], 3)

                temp_delta = round((astro_sc["temp_target"] - v["temp"]) * 0.15, 1)
                v["temp"] = max(35.5, min(39.5, round(v["temp"] + temp_delta + (random.random() * 0.06 - 0.03), 1)))

                cur_cort = float(v.get("cortisol", 4.2))
                v["cortisol"] = round(max(1.5, min(25.0, cur_cort + (cortisol_target - cur_cort) * 0.18 + (random.random() * 0.2 - 0.1))), 1)
                cur_lact = float(v.get("lactate", 1.6))
                v["lactate"] = round(max(0.8, min(8.0, cur_lact + (lactate_target - cur_lact) * 0.18 + (random.random() * 0.12 - 0.06))), 1)
                cur_cog = float(v.get("cognitiveReadiness", 92))
                v["cognitiveReadiness"] = max(35, min(100, round(cur_cog + (cog_target - cur_cog) * 0.18 + (random.random() * 2 - 1))))

                feed_astronaut_to_model(a, eclss, natychmiast=False)

                if "liveTelemetry" not in a:
                    a["liveTelemetry"] = []
                a["liveTelemetry"].append({
                    "time": now_utc,
                    "day": now_utc,
                    "hr": v["hr"],
                    "spo2": v["spo2"],
                    "bpSys": v["bpSys"],
                    "stress": v["stressLevel"],
                    "rad": v["radDose"]
                })
                if len(a["liveTelemetry"]) > 20:
                    a["liveTelemetry"].pop(0)

            app_state["crewSummary"] = compute_crew_summary(app_state["astronauts"], eclss)


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)


@app.route("/api/state", methods=["GET"])
def get_state():
    with state_lock:
        return jsonify({
            "mode": app_state["mode"],
            "currentUser": app_state["currentUser"],
            "users": app_state["users"],
            "astronauts": app_state["astronauts"],
            "eclssCabin": app_state.get("eclssCabin", {}),
            "crewSummary": app_state.get("crewSummary", {}),
            "stepProcedures": app_state.get("stepProcedures", []),
            "scheduleData": app_state.get("scheduleData", {}),
            "prophylaxisGuidelines": app_state.get("prophylaxisGuidelines", []),
            "criticalScenarios": app_state.get("criticalScenarios", []),
            "stream": {
                "active": stream_config["active"],
                "interval": stream_config["interval"],
                "scenario": stream_config["scenario"],
                "packet": stream_config["packet_counter"],
                "time": stream_config["last_packet_time"]
            }
        })


@app.route("/api/telemetry/live", methods=["GET"])
def get_telemetry_live():
    with state_lock:
        astros = app_state["astronauts"]
        total = len(astros)
        normal = sum(1 for a in astros if a.get("overallStatus") == "normal")
        warning = sum(1 for a in astros if a.get("overallStatus") == "warning")
        critical = sum(1 for a in astros if a.get("overallStatus") == "critical")

        total_hr = sum(a["vitals"]["hr"] for a in astros)
        total_spo2 = sum(a["vitals"]["spo2"] for a in astros)
        total_rad = sum(a["vitals"]["radDose"] for a in astros)

        avg_hr = round(total_hr / total) if total > 0 else 0
        avg_spo2 = round(total_spo2 / total) if total > 0 else 0
        avg_rad = round((total_rad / total), 1) if total > 0 else 0

        return jsonify({
            "packet": stream_config["packet_counter"],
            "time": stream_config["last_packet_time"],
            "active": stream_config["active"],
            "scenario": stream_config["scenario"],
            "astronauts": astros,
            "eclssCabin": app_state.get("eclssCabin", {}),
            "crewSummary": app_state.get("crewSummary", {}),
            "stats": {
                "total": total,
                "normal": normal,
                "warning": warning,
                "critical": critical,
                "avgHr": avg_hr,
                "avgSpo2": avg_spo2,
                "avgRad": avg_rad
            }
        })


@app.route("/api/telemetry/control", methods=["POST"])
def control_telemetry():
    data = request.get_json() or {}
    with state_lock:
        if "action" in data:
            if data["action"] == "toggle":
                stream_config["active"] = not stream_config["active"]
            elif data["action"] == "start":
                stream_config["active"] = True
            elif data["action"] == "stop":
                stream_config["active"] = False

        if "scenario" in data and data["scenario"] in SCENARIOS:
            stream_config["scenario"] = data["scenario"]

        if "interval" in data:
            try:
                stream_config["interval"] = float(data["interval"])
            except ValueError:
                pass

        return jsonify({
            "success": True,
            "active": stream_config["active"],
            "scenario": stream_config["scenario"],
            "interval": stream_config["interval"],
            "packet": stream_config["packet_counter"]
        })


@app.route("/api/telemetry/entry", methods=["POST"])
@app.route("/api/pomiary", methods=["POST"])
def post_telemetry_entry():
    data = request.get_json() or {}
    with state_lock:
        eclss = app_state["eclssCabin"]
        if isinstance(data.get("eclss"), dict):
            for ek, val in data["eclss"].items():
                if ek in eclss:
                    eclss[ek] = val

        astro_id = data.get("astroId") or data.get("astronautId") or (app_state["astronauts"][0]["id"] if app_state["astronauts"] else None)
        target = next((a for a in app_state["astronauts"] if a["id"] == astro_id), None)

        if target is not None:
            v = target["vitals"]
            payload_v = data.get("vitals") if isinstance(data.get("vitals"), dict) else data
            num_fields = {
                "hr": int,
                "bpSys": int,
                "bpDia": int,
                "spo2": int,
                "temp": float,
                "resp": int,
                "radDose": float,
                "stressLevel": int,
                "boneDensity": int,
                "muscleMass": int,
                "hydration": int,
                "bodyBattery": float,
                "hrv": int,
                "sleepHours": float,
                "sleepScore": int,
                "cortisol": float,
                "lactate": float,
                "cognitiveReadiness": int,
            }
            for fk, caster in num_fields.items():
                if fk in payload_v and payload_v[fk] is not None:
                    try:
                        v[fk] = caster(payload_v[fk])
                    except (TypeError, ValueError):
                        pass
            if v.get("hr"):
                v["rr"] = round(60000 / max(int(v["hr"]), 30))

            if isinstance(data.get("pomiary"), list):
                c = get_or_create_centrum(target["id"])
                c.dodaj(data["pomiary"])

            history = target.setdefault("telemetryHistory", [])
            history.append({
                "day": f"Day {184 + len(history)}",
                "hr": v["hr"],
                "bpSys": v["bpSys"],
                "spo2": v["spo2"],
                "stress": v["stressLevel"],
                "rad": v["radDose"],
            })
            feed_astronaut_to_model(target, eclss, natychmiast=True)

            forced_status = data.get("overallStatus") or data.get("status")
            if forced_status in ("normal", "warning", "critical"):
                target["overallStatus"] = forced_status
                if forced_status == "normal":
                    target["statusLabel"] = "Stable Condition"
                elif forced_status == "warning":
                    target["statusLabel"] = "Observation Required"
                else:
                    target["statusLabel"] = "Elevated Risk"
        elif isinstance(data.get("pomiary"), list):
            for a in app_state["astronauts"]:
                c = get_or_create_centrum(a["id"])
                c.dodaj(data["pomiary"])
                feed_astronaut_to_model(a, eclss, natychmiast=True)

        app_state["crewSummary"] = compute_crew_summary(app_state["astronauts"], eclss)
        return jsonify({
            "success": True,
            "astronaut": target,
            "eclssCabin": eclss,
            "crewSummary": app_state["crewSummary"],
        })


@app.route("/api/model/summary", methods=["GET"])
def get_model_summary():
    astro_id = request.args.get("astro_id")
    with state_lock:
        if astro_id:
            target = next((a for a in app_state["astronauts"] if a["id"] == astro_id), None)
            if not target:
                return jsonify({"error": "Astronaut not found"}), 404
            return jsonify({
                "astroId": target["id"],
                "name": target["name"],
                "overallStatus": target.get("overallStatus"),
                "statusLabel": target.get("statusLabel"),
                "modelSummary": target.get("modelSummary", {}),
                "crewSummary": app_state.get("crewSummary", {}),
            })
        return jsonify({
            "crewSummary": app_state.get("crewSummary", {}),
            "eclssCabin": app_state.get("eclssCabin", {}),
            "astronauts": [
                {
                    "id": a["id"],
                    "name": a["name"],
                    "overallStatus": a.get("overallStatus"),
                    "statusLabel": a.get("statusLabel"),
                    "modelSummary": a.get("modelSummary", {}),
                }
                for a in app_state["astronauts"]
            ],
        })


@app.route("/api/raport.txt", methods=["GET"])
def get_raport_txt():
    astro_id = request.args.get("astro_id")
    with state_lock:
        astros = app_state.get("astronauts", [])
        if astro_id:
            target = next((a for a in astros if a["id"] == astro_id), None)
            if target and target.get("modelSummary", {}).get("raport"):
                txt = f"Astronaut: {target['name']}\n\n" + raport_jako_tekst(target["modelSummary"]["raport"])
            else:
                txt = "No model data available for the specified astronaut."
        else:
            cs = app_state.get("crewSummary", {})
            lines = [
                f"HMS-of-A Crew Summary Report : {cs.get('updatedAt', '')}",
                cs.get("summaryText", ""),
                "",
            ]
            for a in astros:
                lines.append(f"=== {a['name']} ===")
                rap = (a.get("modelSummary") or {}).get("raport")
                if rap:
                    lines.append(raport_jako_tekst(rap))
                lines.append("")
            txt = "\n".join(lines)
        return Response(
            txt,
            mimetype="text/plain; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=hms_report.txt"},
        )


@app.route("/api/garmin/import", methods=["POST"])
def import_garmin():
    data = request.get_json(silent=True) or {}
    with state_lock:
        existing = next((a for a in app_state["astronauts"] if a.get("source") == "Garmin Health Telemetry Link"), None)
        if existing:
            return jsonify({"success": False, "error": "Garmin profile has already been integrated.", "astronaut": existing}), 409

        new_id = f"astro-garmin-{int(time.time() * 1000)}"
        name = data.get("name", "Marek Orbit")
        initials = "".join([part[0] for part in name.strip().split()[:2]]).upper() or "MO"
        new_user = {
            "id": new_id,
            "login": f"garmin{int(time.time())}",
            "password": "kosmos2026",
            "name": name,
            "role": "",
            "title": "",
            "accessLevel": "Personal account",
            "avatarCode": initials,
        }
        new_astro = {
            "id": new_id,
            "name": name,
            "role": "",
            "avatarCode": initials,
            "age": int(data.get("age", 34)),
            "bloodType": data.get("bloodType", "0 Rh plus"),
            "missionDay": 184,
            "evaHours": 8,
            "overallStatus": "normal",
            "statusLabel": "Stable Condition",
            "statusDescription": "Real-time biometric stream captured from Garmin Elevate optical sensors.",
            "source": "Garmin Health Telemetry Link",
            "vitals": {
                "hr": 68, "hrUnit": "bpm",
                "rr": 882, "rrUnit": "ms",
                "hrv": 66, "hrvUnit": "ms",
                "bpSys": 118, "bpDia": 76, "bpUnit": "mmHg",
                "spo2": 99, "spo2Unit": "%",
                "temp": 36.6, "tempUnit": "deg C",
                "resp": 14, "respUnit": "breaths/min",
                "radDose": 3.2, "radUnit": "mSv",
                "boneDensity": 99, "boneUnit": "% norm",
                "muscleMass": 100, "muscleUnit": "% norm",
                "hydration": 96, "hydrationUnit": "%",
                "sleepHours": 7.9, "sleepUnit": "h",
                "sleepScore": 88, "sleepScoreUnit": "pts",
                "stressLevel": 21, "stressUnit": "pts",
                "bodyBattery": 88, "bodyBatteryUnit": "pts",
                "cortisol": 4.1, "cortisolUnit": "ng/ml",
                "lactate": 1.5, "lactateUnit": "mmol/l",
                "cognitiveReadiness": 93, "cognitiveUnit": "%",
            },
            "periodicTests": [],
            "telemetryHistory": [
                {"day": "Day 179", "hr": 67, "bpSys": 117, "spo2": 99, "stress": 22, "rad": 2.8},
                {"day": "Day 180", "hr": 69, "bpSys": 118, "spo2": 98, "stress": 24, "rad": 2.9},
                {"day": "Day 181", "hr": 66, "bpSys": 116, "spo2": 99, "stress": 20, "rad": 3.0},
                {"day": "Day 182", "hr": 70, "bpSys": 119, "spo2": 99, "stress": 23, "rad": 3.1},
                {"day": "Day 183", "hr": 68, "bpSys": 118, "spo2": 99, "stress": 21, "rad": 3.1},
                {"day": "Day 184", "hr": 68, "bpSys": 118, "spo2": 99, "stress": 21, "rad": 3.2},
            ],
            "orders": [
                {
                    "id": "ord-g1",
                    "date": "2026-11-14",
                    "author": "Marek Marczak",
                    "text": "Garmin sensor measurements integrated cleanly into the main HMS-of-A telemetry bus.",
                    "priority": "standard",
                }
            ],
            "dailyChecks": [],
        }
        app_state["users"].append(new_user)
        app_state["astronauts"].insert(0, new_astro)
        feed_astronaut_to_model(new_astro, app_state["eclssCabin"], natychmiast=True)
        app_state["crewSummary"] = compute_crew_summary(app_state["astronauts"], app_state["eclssCabin"])
        if app_state["mode"] == "real":
            app_state["realUsers"] = list(app_state["users"])
            app_state["realAstronauts"] = list(app_state["astronauts"])
        else:
            app_state["demoUsers"] = list(app_state["users"])
            app_state["demoAstronauts"] = list(app_state["astronauts"])
        return jsonify({
            "success": True,
            "astronaut": new_astro,
            "user": new_user,
            "crewSummary": app_state["crewSummary"],
        })


@app.route("/api/mode", methods=["POST"])
def set_mode():
    data = request.get_json() or {}
    target_mode = data.get("mode")
    with state_lock:
        if target_mode == "demo":
            app_state["realUsers"] = list(app_state["users"])
            app_state["realAstronauts"] = list(app_state["astronauts"])
            app_state["mode"] = "demo"
            app_state["users"] = list(app_state["demoUsers"])
            app_state["astronauts"] = list(app_state["demoAstronauts"])
        elif target_mode == "real":
            app_state["demoUsers"] = list(app_state["users"])
            app_state["demoAstronauts"] = list(app_state["astronauts"])
            app_state["mode"] = "real"
            app_state["users"] = list(app_state["realUsers"])
            app_state["astronauts"] = list(app_state["realAstronauts"])
            if not any(u["id"] == app_state["currentUser"] for u in app_state["users"]):
                app_state["currentUser"] = None

        sync_all_models(natychmiast=True)
        return jsonify({
            "success": True,
            "mode": app_state["mode"],
            "crew_count": len(app_state["astronauts"]),
            "astronauts": app_state["astronauts"],
            "users": app_state["users"],
            "crewSummary": app_state["crewSummary"],
        })


@app.route("/api/mission/reset", methods=["POST"])
def reset_mission():
    data = request.get_json(silent=True) or {}
    target = data.get("target", "demo")
    with state_lock:
        model_centra.clear()
        app_state["eclssCabin"] = build_initial_eclss()
        osdr_cursor["idx"] = 0
        if target == "clear":
            kierownik = copy.deepcopy(DEMO_USERS[0])
            app_state["mode"] = "real"
            app_state["users"] = [kierownik]
            app_state["astronauts"] = []
            app_state["realUsers"] = [kierownik]
            app_state["realAstronauts"] = []
            app_state["currentUser"] = None
        else:
            app_state["mode"] = "demo"
            app_state["demoUsers"] = copy.deepcopy(DEMO_USERS)
            app_state["demoAstronauts"] = copy.deepcopy(DEMO_ASTRONAUTS)
            app_state["users"] = copy.deepcopy(DEMO_USERS)
            app_state["astronauts"] = copy.deepcopy(DEMO_ASTRONAUTS)
            app_state["currentUser"] = None
        sync_all_models(natychmiast=True)
        return jsonify({
            "success": True,
            "mode": app_state["mode"],
            "users": app_state["users"],
            "astronauts": app_state["astronauts"],
            "eclssCabin": app_state["eclssCabin"],
            "crewSummary": app_state["crewSummary"],
        })


@app.route("/api/astronauts", methods=["POST"])
def add_astronaut():
    data = request.get_json() or {}
    with state_lock:
        name = data.get("name", "New Astronaut")
        role = data.get("role", "")
        title = data.get("title", "")
        login = data.get("login", f"astro{int(time.time())}")
        password = data.get("password", "kosmos2026")
        type_role = data.get("type", "astro")

        if type_role == "kierownik" and not role:
            role = "Commander"

        new_id = f"{'kierownik' if type_role == 'kierownik' else 'astro'}-{int(time.time() * 1000)}"
        initials = "".join([part[0] for part in name.strip().split()[:2]]).upper() or "AS"

        new_user = {
            "id": new_id,
            "login": login,
            "password": password,
            "name": name,
            "role": role,
            "title": title,
            "accessLevel": "Full oversight" if type_role == "kierownik" else "Personal account",
            "avatarCode": initials
        }
        app_state["users"].append(new_user)

        new_astro = None
        if type_role == "astro":
            hr = int(data.get("hr", 72))
            bp_sys = int(data.get("bpSys", 120))
            bp_dia = int(data.get("bpDia", 80))
            spo2 = int(data.get("spo2", 99))
            temp = float(data.get("temp", 36.6))
            resp = int(data.get("resp", 14))

            new_astro = {
                "id": new_id,
                "name": name,
                "role": "",
                "avatarCode": initials,
                "age": int(data.get("age", 35)),
                "bloodType": data.get("bloodType", "0 Rh plus"),
                "missionDay": 184,
                "evaHours": 0,
                "overallStatus": "normal",
                "statusLabel": "Stable Condition",
                "statusDescription": "Newly onboarded crew member. Baseline parameters loaded into the system.",
                "vitals": {
                    "hr": hr, "hrUnit": "bpm",
                    "rr": round(60000 / max(hr, 30)), "rrUnit": "ms",
                    "hrv": 65, "hrvUnit": "ms",
                    "bpSys": bp_sys, "bpDia": bp_dia, "bpUnit": "mmHg",
                    "spo2": spo2, "spo2Unit": "%",
                    "temp": temp, "tempUnit": "deg C",
                    "resp": resp, "respUnit": "breaths/min",
                    "stressLevel": 15, "stressUnit": "pts",
                    "bodyBattery": 90, "bodyBatteryUnit": "pts",
                    "radDose": 0.5, "radUnit": "mSv",
                    "boneDensity": 100, "boneUnit": "% norm",
                    "muscleMass": 100, "muscleUnit": "% norm",
                    "hydration": 98, "hydrationUnit": "%",
                    "sleepHours": 8.0, "sleepUnit": "h",
                    "sleepScore": 88, "sleepScoreUnit": "pts",
                    "cortisol": 4.0, "cortisolUnit": "ng/ml",
                    "lactate": 1.5, "lactateUnit": "mmol/l",
                    "cognitiveReadiness": 92, "cognitiveUnit": "%",
                },
                "periodicTests": [],
                "telemetryHistory": [
                    {"day": "Day 184", "hr": hr, "bpSys": bp_sys, "spo2": spo2, "stress": 15, "rad": 0.5}
                ],
                "orders": [],
                "dailyChecks": []
            }
            app_state["astronauts"].append(new_astro)
            feed_astronaut_to_model(new_astro, app_state["eclssCabin"], natychmiast=True)

        app_state["crewSummary"] = compute_crew_summary(app_state["astronauts"], app_state["eclssCabin"])
        if app_state["mode"] == "real":
            app_state["realUsers"] = list(app_state["users"])
            app_state["realAstronauts"] = list(app_state["astronauts"])
        else:
            app_state["demoUsers"] = list(app_state["users"])
            app_state["demoAstronauts"] = list(app_state["astronauts"])

        return jsonify({
            "success": True,
            "id": new_id,
            "user": new_user,
            "astronaut": new_astro,
            "crewSummary": app_state["crewSummary"],
        })


@app.route("/api/astronauts/<astro_id>", methods=["DELETE"])
def delete_astronaut(astro_id):
    with state_lock:
        app_state["users"] = [u for u in app_state["users"] if u["id"] != astro_id]
        app_state["astronauts"] = [a for a in app_state["astronauts"] if a["id"] != astro_id]
        model_centra.pop(_safe_id(astro_id), None)
        app_state["crewSummary"] = compute_crew_summary(app_state["astronauts"], app_state["eclssCabin"])
        if app_state["mode"] == "real":
            app_state["realUsers"] = list(app_state["users"])
            app_state["realAstronauts"] = list(app_state["astronauts"])
        else:
            app_state["demoUsers"] = list(app_state["users"])
            app_state["demoAstronauts"] = list(app_state["astronauts"])
        return jsonify({"success": True, "crewSummary": app_state["crewSummary"]})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting HMS-of-A server on port {port}...")
    print(f"Server URL: http://localhost:{port}/")

    thread = threading.Thread(target=telemetry_background_thread, daemon=True)
    thread.start()

    try:
        app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
    except KeyboardInterrupt:
        stop_event.set()
        print("HMS-of-A server stopped.")
