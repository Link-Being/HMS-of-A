// HMS-of-A system data
// Health Monitoring System of Astronauts
// Note: no parentheses, no emojis, no long dashes in UI strings

const DEMO_USERS = [
  {
    id: 'kierownik',
    login: 'marczak',
    password: 'marczak2026',
    name: 'Marek Marczak',
    role: 'Commander',
    title: '',
    accessLevel: 'Full oversight',
    avatarCode: 'MM'
  },
  {
    id: 'astro-1',
    login: 'kolosa',
    password: 'kolosa1',
    name: 'Adam Kolosa',
    role: '',
    title: '',
    accessLevel: 'Personal account',
    avatarCode: 'AK'
  },
  {
    id: 'astro-2',
    login: 'pawlak',
    password: 'pawlak2',
    name: 'Michał Pawlak',
    role: '',
    title: '',
    accessLevel: 'Personal account',
    avatarCode: 'MP'
  },
  {
    id: 'astro-3',
    login: 'mysior',
    password: 'mysior3',
    name: 'Krzysztof Mysior',
    role: '',
    title: '',
    accessLevel: 'Personal account',
    avatarCode: 'KM'
  },
  {
    id: 'astro-4',
    login: 'hopperl',
    password: 'hopperl4',
    name: 'Jan Hopperl',
    role: '',
    title: '',
    accessLevel: 'Personal account',
    avatarCode: 'JH'
  },
  {
    id: 'astro-5',
    login: 'skrzypczak',
    password: 'skrzypczak5',
    name: 'Wojciech Skrzypczak',
    role: '',
    title: '',
    accessLevel: 'Personal account',
    avatarCode: 'WS'
  }
];

const DEMO_ASTRONAUTS = [
  {
    id: 'astro-1',
    name: 'Adam Kolosa',
    role: '',
    avatarCode: 'AK',
    age: 42,
    bloodType: 'A Rh plus',
    missionDay: 184,
    evaHours: 34,
    overallStatus: 'normal',
    statusLabel: 'Stable Condition',
    statusDescription: 'All biometric indicators remain within the defined safety envelope.',
    vitals: {
      hr: 68,
      hrUnit: 'bpm',
      rr: 882,
      rrUnit: 'ms',
      hrv: 64,
      hrvUnit: 'ms',
      bpSys: 120,
      bpDia: 80,
      bpUnit: 'mmHg',
      spo2: 99,
      spo2Unit: '%',
      temp: 36.6,
      tempUnit: 'deg C',
      resp: 14,
      respUnit: 'breaths/min',
      stressLevel: 24,
      stressUnit: 'pts',
      bodyBattery: 85,
      bodyBatteryUnit: 'pts',
      radDose: 14.2,
      radUnit: 'mSv',
      boneDensity: 97,
      boneUnit: '% norm',
      muscleMass: 98,
      muscleUnit: '% norm',
      hydration: 95,
      hydrationUnit: '%',
      sleepHours: 7.8,
      sleepUnit: 'h',
      sleepScore: 88,
      sleepScoreUnit: 'pts',
      cortisol: 4.2,
      cortisolUnit: 'ng/ml',
      lactate: 1.8,
      lactateUnit: 'mmol/l',
      cognitiveReadiness: 92,
      cognitiveUnit: '%'
    },
    periodicTests: [
      {
        id: 'pt-101',
        category: 'Cardiology and Blood Pressure',
        parameter: 'Arterial blood pressure and 3-lead ECG',
        equipment: 'Astroskin Bio-Monitor Vest',
        result: '120/80 mmHg, regular sinus rhythm, no signs of ischemia',
        date: '14.11.2026',
        time: '07:15',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-102',
        category: 'Sleep Analysis',
        parameter: 'Sleep duration, sleep stages, and Sleep Score',
        equipment: 'Actiwatch Biometric Band',
        result: '7.8 h total sleep, deep 21 %, REM 24 %, light 55 %, Sleep Score: 88/100 pts',
        date: '14.11.2026',
        time: '06:30',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-103',
        category: 'Physical Performance',
        parameter: 'VO2 max aerobic capacity and energy expenditure',
        equipment: 'Garmin Performance Heart Rate Monitor',
        result: '52.4 ml/kg/min, very high fitness, morning Body Battery 88 pts',
        date: '13.11.2026',
        time: '16:45',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-104',
        category: 'Resistance and Aerobic Training',
        parameter: 'ARED resistance and T2 treadmill session',
        equipment: 'ISS ARED and T2 Training Station',
        result: 'Squats and deadlift 142 kg, treadmill 210 W, duration 120 min, avg HR 138 bpm',
        date: '14.11.2026',
        time: '11:30',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-105',
        category: 'Sweat Biochemistry',
        parameter: 'Sweat biomarkers: Cortisol, lactate, Na, K, Ca, CRP',
        equipment: 'Bio-Patch Microfluidic Biosensor',
        result: 'Cortisol 4.2 ng/ml, lactate 1.8 mmol/l, Na 48 mmol/l, K 4.6 mmol/l, Ca 1.2 mmol/l, CRP 0.8 mg/l',
        date: '14.11.2026',
        time: '12:45',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-106',
        category: 'sEMG Muscle Activity',
        parameter: 'Muscle fatigue and micro-tremor sEMG Fibre-WBAN',
        equipment: 'Fibre-WBAN Sensor Straps',
        result: 'Optimal state, no fatigue, MDF 78 Hz, band 10 - 200 Hz, ZCR at resting baseline',
        date: '14.11.2026',
        time: '11:50',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-107',
        category: 'Central Nervous System CNS',
        parameter: 'Cognitive readiness index and EEG brainwaves',
        equipment: 'EEG Neuro-Sensor Headband',
        result: 'Cognitive readiness index 92 %, high focus level, balanced alpha rhythm',
        date: '14.11.2026',
        time: '09:20',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-108',
        category: 'Radiation Dosimetry',
        parameter: 'Daily and cumulative radiation exposure',
        equipment: 'Onboard RAD-ISS Dosimeter',
        result: 'Daily dose 0.42 mSv, total cumulative dose 14.2 mSv, below operational limit',
        date: '14.11.2026',
        time: '12:00',
        status: 'Normal',
        statusType: 'normal'
      }
    ],
    telemetryHistory: [
      { day: 'Day 179', hr: 69, bpSys: 121, spo2: 99, stress: 26, rad: 13.7 },
      { day: 'Day 180', hr: 71, bpSys: 122, spo2: 98, stress: 30, rad: 13.8 },
      { day: 'Day 181', hr: 67, bpSys: 119, spo2: 99, stress: 22, rad: 13.9 },
      { day: 'Day 182', hr: 70, bpSys: 120, spo2: 99, stress: 25, rad: 14.0 },
      { day: 'Day 183', hr: 66, bpSys: 118, spo2: 99, stress: 21, rad: 14.1 },
      { day: 'Day 184', hr: 68, bpSys: 120, spo2: 99, stress: 24, rad: 14.2 }
    ],
    orders: [
      {
        id: 'ord-101',
        date: '2026-11-12',
        author: 'Marek Marczak',
        text: 'Maintain standard ARED training profile. Check electrolyte balance after treadmill session.',
        priority: 'standard'
      },
      {
        id: 'ord-102',
        date: '2026-11-05',
        author: 'Marek Marczak',
        text: 'Increase electrolyte fluid intake by 300 ml per day.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Very good' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Good' }
    ]
  },
  {
    id: 'astro-2',
    name: 'Michał Pawlak',
    role: '',
    avatarCode: 'MP',
    age: 39,
    bloodType: '0 Rh plus',
    missionDay: 184,
    evaHours: 26,
    overallStatus: 'normal',
    statusLabel: 'Optimal Condition',
    statusDescription: 'Excellent metabolic and cardiovascular adaptation. Energy reserves remain high.',
    vitals: {
      hr: 65,
      hrUnit: 'bpm',
      rr: 923,
      rrUnit: 'ms',
      hrv: 72,
      hrvUnit: 'ms',
      bpSys: 118,
      bpDia: 78,
      bpUnit: 'mmHg',
      spo2: 99,
      spo2Unit: '%',
      temp: 36.5,
      tempUnit: 'deg C',
      resp: 13,
      respUnit: 'breaths/min',
      stressLevel: 20,
      stressUnit: 'pts',
      bodyBattery: 88,
      bodyBatteryUnit: 'pts',
      radDose: 15.1,
      radUnit: 'mSv',
      boneDensity: 98,
      boneUnit: '% norm',
      muscleMass: 97,
      muscleUnit: '% norm',
      hydration: 96,
      hydrationUnit: '%',
      sleepHours: 8.0,
      sleepUnit: 'h',
      sleepScore: 92,
      sleepScoreUnit: 'pts',
      cortisol: 3.8,
      cortisolUnit: 'ng/ml',
      lactate: 1.4,
      lactateUnit: 'mmol/l',
      cognitiveReadiness: 95,
      cognitiveUnit: '%'
    },
    periodicTests: [
      {
        id: 'pt-201',
        category: 'Cardiology and Blood Pressure',
        parameter: 'Arterial blood pressure and 3-lead ECG',
        equipment: 'Astroskin Bio-Monitor Vest',
        result: '118/78 mmHg, regular rhythm, normal waveforms',
        date: '14.11.2026',
        time: '07:20',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-202',
        category: 'Sleep Analysis',
        parameter: 'Sleep duration, sleep stages, and Sleep Score',
        equipment: 'Actiwatch Biometric Band',
        result: '8.0 h total sleep, deep 23 %, REM 25 %, awakenings 0, Sleep Score: 92/100 pts',
        date: '14.11.2026',
        time: '06:35',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-203',
        category: 'Physical Performance',
        parameter: 'VO2 max aerobic capacity and energy expenditure',
        equipment: 'Garmin Performance Heart Rate Monitor',
        result: '54.1 ml/kg/min, athletic capacity, recovery status Balanced',
        date: '13.11.2026',
        time: '17:00',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-204',
        category: 'Resistance and Aerobic Training',
        parameter: 'ARED resistance and CEVIS ergometer session',
        equipment: 'ARED Station and CEVIS Cycle Ergometer',
        result: 'Strength training 135 kg, ergometer 195 W, duration 120 min, avg HR 132 bpm',
        date: '14.11.2026',
        time: '10:45',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-205',
        category: 'Sweat Biochemistry',
        parameter: 'Sweat biomarkers: Cortisol, lactate, electrolytes, CRP',
        equipment: 'Bio-Patch Microfluidic Biosensor',
        result: 'Cortisol 3.8 ng/ml, lactate 1.4 mmol/l, Na 46 mmol/l, K 4.4 mmol/l, CRP 0.5 mg/l',
        date: '14.11.2026',
        time: '12:50',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-206',
        category: 'sEMG Muscle Activity',
        parameter: 'Muscle fatigue and sEMG Fibre-WBAN',
        equipment: 'Fibre-WBAN Sensor Straps',
        result: 'Optimal state, no fatigue, MDF 81 Hz, no micro-tremor fluctuations',
        date: '14.11.2026',
        time: '11:10',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-207',
        category: 'Central Nervous System CNS',
        parameter: 'Cognitive readiness index and EEG attention',
        equipment: 'EEG Neuro-Sensor Headband',
        result: 'Cognitive readiness index 95 %, very high focus, reaction time 198 ms',
        date: '14.11.2026',
        time: '09:25',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-208',
        category: 'Radiation Dosimetry',
        parameter: 'Daily and cumulative radiation exposure',
        equipment: 'Onboard RAD-ISS Dosimeter',
        result: 'Daily dose 0.44 mSv, cumulative 15.1 mSv, within mission plan corridor',
        date: '14.11.2026',
        time: '12:00',
        status: 'Normal',
        statusType: 'normal'
      }
    ],
    telemetryHistory: [
      { day: 'Day 179', hr: 66, bpSys: 119, spo2: 99, stress: 21, rad: 14.6 },
      { day: 'Day 180', hr: 64, bpSys: 117, spo2: 99, stress: 19, rad: 14.7 },
      { day: 'Day 181', hr: 65, bpSys: 118, spo2: 99, stress: 22, rad: 14.8 },
      { day: 'Day 182', hr: 67, bpSys: 120, spo2: 99, stress: 24, rad: 14.9 },
      { day: 'Day 183', hr: 63, bpSys: 116, spo2: 99, stress: 18, rad: 15.0 },
      { day: 'Day 184', hr: 65, bpSys: 118, spo2: 99, stress: 20, rad: 15.1 }
    ],
    orders: [
      {
        id: 'ord-201',
        date: '2026-11-10',
        author: 'Marek Marczak',
        text: 'Performance indicators at benchmark levels. Continue countermeasure training against atrophy.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Excellent' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Excellent' }
    ]
  },
  {
    id: 'astro-3',
    name: 'Krzysztof Mysior',
    role: '',
    avatarCode: 'KM',
    age: 36,
    bloodType: 'B Rh plus',
    missionDay: 184,
    evaHours: 42,
    overallStatus: 'warning',
    statusLabel: 'Observation Required',
    statusDescription: 'Elevated blood pressure and shortened deep sleep phase recorded after EVA session.',
    vitals: {
      hr: 82,
      hrUnit: 'bpm',
      rr: 731,
      rrUnit: 'ms',
      hrv: 38,
      hrvUnit: 'ms',
      bpSys: 136,
      bpDia: 86,
      bpUnit: 'mmHg',
      spo2: 97,
      spo2Unit: '%',
      temp: 37.1,
      tempUnit: 'deg C',
      resp: 17,
      respUnit: 'breaths/min',
      stressLevel: 54,
      stressUnit: 'pts',
      bodyBattery: 52,
      bodyBatteryUnit: 'pts',
      radDose: 18.9,
      radUnit: 'mSv',
      boneDensity: 94,
      boneUnit: '% norm',
      muscleMass: 93,
      muscleUnit: '% norm',
      hydration: 89,
      hydrationUnit: '%',
      sleepHours: 5.6,
      sleepUnit: 'h',
      sleepScore: 64,
      sleepScoreUnit: 'pts',
      cortisol: 8.6,
      cortisolUnit: 'ng/ml',
      lactate: 2.9,
      lactateUnit: 'mmol/l',
      cognitiveReadiness: 74,
      cognitiveUnit: '%'
    },
    periodicTests: [
      {
        id: 'pt-301',
        category: 'Cardiology and Blood Pressure',
        parameter: 'Arterial blood pressure and 3-lead ECG',
        equipment: 'Astroskin Bio-Monitor Vest',
        result: '136/86 mmHg, sinus rhythm with tendency toward post-exertion tachycardia',
        date: '14.11.2026',
        time: '13:10',
        status: 'Needs Attention',
        statusType: 'warning'
      },
      {
        id: 'pt-302',
        category: 'Sleep Analysis',
        parameter: 'Sleep duration, sleep stages, and Sleep Score',
        equipment: 'Actiwatch Biometric Band',
        result: '5.6 h total sleep, deep 12 %, REM 18 %, 4 awakenings, Sleep Score: 64/100 pts',
        date: '14.11.2026',
        time: '06:15',
        status: 'Needs Attention',
        statusType: 'warning'
      },
      {
        id: 'pt-303',
        category: 'Physical Performance',
        parameter: 'VO2 max aerobic capacity and energy expenditure',
        equipment: 'Garmin Performance Heart Rate Monitor',
        result: '44.8 ml/kg/min, satisfactory capacity, Body Battery reserves reduced',
        date: '13.11.2026',
        time: '16:30',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-304',
        category: 'Resistance and Aerobic Training',
        parameter: 'ARED resistance and T2 treadmill session',
        equipment: 'ARED Station and T2 Treadmill',
        result: 'Reduced load 110 kg, treadmill 160 W, duration 90 min, exercise HR 146 bpm',
        date: '14.11.2026',
        time: '10:00',
        status: 'Needs Attention',
        statusType: 'warning'
      },
      {
        id: 'pt-305',
        category: 'Sweat Biochemistry',
        parameter: 'Sweat biomarkers: Cortisol, lactate, electrolytes, CRP',
        equipment: 'Bio-Patch Microfluidic Biosensor',
        result: 'Cortisol 8.6 ng/ml elevated, lactate 2.9 mmol/l, Na 56 mmol/l, CRP 1.6 mg/l',
        date: '14.11.2026',
        time: '12:40',
        status: 'Needs Attention',
        statusType: 'warning'
      },
      {
        id: 'pt-306',
        category: 'sEMG Muscle Activity',
        parameter: 'Muscle fatigue and sEMG Fibre-WBAN',
        equipment: 'Fibre-WBAN Sensor Straps',
        result: 'Transitional state, warning for erector spinae fatigue, MDF 58 Hz',
        date: '14.11.2026',
        time: '11:45',
        status: 'Needs Attention',
        statusType: 'warning'
      },
      {
        id: 'pt-307',
        category: 'Central Nervous System CNS',
        parameter: 'Cognitive readiness index and EEG attention',
        equipment: 'EEG Neuro-Sensor Headband',
        result: 'Cognitive readiness index 74 %, moderate focus, elevated cognitive load',
        date: '14.11.2026',
        time: '09:15',
        status: 'Needs Attention',
        statusType: 'warning'
      },
      {
        id: 'pt-308',
        category: 'Radiation Dosimetry',
        parameter: 'Daily and cumulative radiation exposure',
        equipment: 'EVA Suit RAD-EMU Dosimeter',
        result: 'Daily dose 0.88 mSv elevated after EVA sortie, cumulative total 18.9 mSv',
        date: '14.11.2026',
        time: '12:00',
        status: 'Needs Attention',
        statusType: 'warning'
      }
    ],
    telemetryHistory: [
      { day: 'Day 179', hr: 72, bpSys: 124, spo2: 98, stress: 34, rad: 18.0 },
      { day: 'Day 180', hr: 76, bpSys: 128, spo2: 98, stress: 40, rad: 18.2 },
      { day: 'Day 181', hr: 80, bpSys: 132, spo2: 97, stress: 48, rad: 18.4 },
      { day: 'Day 182', hr: 78, bpSys: 130, spo2: 97, stress: 46, rad: 18.5 },
      { day: 'Day 183', hr: 84, bpSys: 138, spo2: 96, stress: 56, rad: 18.7 },
      { day: 'Day 184', hr: 82, bpSys: 136, spo2: 97, stress: 54, rad: 18.9 }
    ],
    orders: [
      {
        id: 'ord-301',
        date: '2026-11-13',
        author: 'Marek Marczak',
        text: 'Mandatory post-EVA rest period. Reduce active duty shift by two hours.',
        priority: 'wysoki'
      },
      {
        id: 'ord-302',
        date: '2026-11-11',
        author: 'Marek Marczak',
        text: 'Initiate evening calming light therapy session and increase magnesium supplementation.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: false, vitalsLogged: true, wellbeing: 'Moderate muscle fatigue' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Post-EVA dehydration' }
    ]
  },
  {
    id: 'astro-4',
    name: 'Jan Hopperl',
    role: '',
    avatarCode: 'JH',
    age: 44,
    bloodType: 'B Rh minus',
    missionDay: 184,
    evaHours: 14,
    overallStatus: 'critical',
    statusLabel: 'Elevated Risk',
    statusDescription: 'Resting tachycardia, reduced bone mineral density, and elevated sweat cortisol level.',
    vitals: {
      hr: 104,
      hrUnit: 'bpm',
      rr: 576,
      rrUnit: 'ms',
      hrv: 22,
      hrvUnit: 'ms',
      bpSys: 146,
      bpDia: 94,
      bpUnit: 'mmHg',
      spo2: 95,
      spo2Unit: '%',
      temp: 37.4,
      tempUnit: 'deg C',
      resp: 20,
      respUnit: 'breaths/min',
      stressLevel: 78,
      stressUnit: 'pts',
      bodyBattery: 28,
      bodyBatteryUnit: 'pts',
      radDose: 24.6,
      radUnit: 'mSv',
      boneDensity: 89,
      boneUnit: '% norm',
      muscleMass: 88,
      muscleUnit: '% norm',
      hydration: 85,
      hydrationUnit: '%',
      sleepHours: 4.2,
      sleepUnit: 'h',
      sleepScore: 46,
      sleepScoreUnit: 'pts',
      cortisol: 15.2,
      cortisolUnit: 'ng/ml',
      lactate: 4.1,
      lactateUnit: 'mmol/l',
      cognitiveReadiness: 58,
      cognitiveUnit: '%'
    },
    periodicTests: [
      {
        id: 'pt-401',
        category: 'Cardiology and Blood Pressure',
        parameter: 'Arterial blood pressure and 3-lead ECG',
        equipment: 'Astroskin Bio-Monitor Vest',
        result: '146/94 mmHg, sinus tachycardia episodes, shortened RR interval',
        date: '14.11.2026',
        time: '13:30',
        status: 'Elevated Risk',
        statusType: 'critical'
      },
      {
        id: 'pt-402',
        category: 'Sleep Analysis',
        parameter: 'Sleep duration, sleep stages, and Sleep Score',
        equipment: 'Actiwatch Biometric Band',
        result: '4.2 h total sleep, deep 7 %, REM 14 %, 6 awakenings, Sleep Score: 46/100 pts',
        date: '14.11.2026',
        time: '06:00',
        status: 'Elevated Risk',
        statusType: 'critical'
      },
      {
        id: 'pt-403',
        category: 'Physical Performance',
        parameter: 'VO2 max aerobic capacity and energy expenditure',
        equipment: 'Garmin Performance Heart Rate Monitor',
        result: '36.2 ml/kg/min, low capacity, Body Battery depleted at 28 pts',
        date: '13.11.2026',
        time: '16:00',
        status: 'Elevated Risk',
        statusType: 'critical'
      },
      {
        id: 'pt-404',
        category: 'Resistance and Aerobic Training',
        parameter: 'ARED resistance and T2 treadmill session',
        equipment: 'ARED Station and T2 Treadmill',
        result: 'Session aborted after 40 min due to dizziness and HR 172 bpm',
        date: '14.11.2026',
        time: '09:40',
        status: 'Elevated Risk',
        statusType: 'critical'
      },
      {
        id: 'pt-405',
        category: 'Sweat Biochemistry',
        parameter: 'Sweat biomarkers: Cortisol, lactate, electrolytes, CRP',
        equipment: 'Bio-Patch Microfluidic Biosensor',
        result: 'Cortisol 15.2 ng/ml alert level, lactate 4.1 mmol/l, CRP 2.8 mg/l, Na loss',
        date: '14.11.2026',
        time: '12:35',
        status: 'Elevated Risk',
        statusType: 'critical'
      },
      {
        id: 'pt-406',
        category: 'sEMG Muscle Activity',
        parameter: 'Muscle fatigue and sEMG Fibre-WBAN',
        equipment: 'Fibre-WBAN Sensor Straps',
        result: 'Fatigue and overload state, elevated ZCR micro-tremors, MDF dropped to 44 Hz',
        date: '14.11.2026',
        time: '11:35',
        status: 'Elevated Risk',
        statusType: 'critical'
      },
      {
        id: 'pt-407',
        category: 'Central Nervous System CNS',
        parameter: 'Cognitive readiness index and EEG attention',
        equipment: 'EEG Neuro-Sensor Headband',
        result: 'Cognitive readiness index 58 %, significant attention drop, theta wave dominance and slowed reaction time',
        date: '14.11.2026',
        time: '09:10',
        status: 'Elevated Risk',
        statusType: 'critical'
      },
      {
        id: 'pt-408',
        category: 'Radiation Dosimetry',
        parameter: 'Daily and cumulative radiation exposure',
        equipment: 'Onboard RAD-ISS Dosimeter',
        result: 'Daily dose 0.62 mSv, cumulative total 24.6 mSv, approaching quarterly limit',
        date: '14.11.2026',
        time: '12:00',
        status: 'Elevated Risk',
        statusType: 'critical'
      }
    ],
    telemetryHistory: [
      { day: 'Day 179', hr: 88, bpSys: 136, spo2: 97, stress: 62, rad: 23.8 },
      { day: 'Day 180', hr: 92, bpSys: 139, spo2: 96, stress: 68, rad: 24.0 },
      { day: 'Day 181', hr: 96, bpSys: 142, spo2: 96, stress: 71, rad: 24.2 },
      { day: 'Day 182', hr: 98, bpSys: 141, spo2: 95, stress: 74, rad: 24.3 },
      { day: 'Day 183', hr: 106, bpSys: 148, spo2: 95, stress: 82, rad: 24.5 },
      { day: 'Day 184', hr: 104, bpSys: 146, spo2: 95, stress: 78, rad: 24.6 }
    ],
    orders: [
      {
        id: 'ord-401',
        date: '2026-11-14',
        author: 'Marek Marczak',
        text: 'Urgent continuous telemetry ECG check. No anaerobic exertion until further notice. Telemedicine consult at 16:00.',
        priority: 'krytyczny'
      },
      {
        id: 'ord-402',
        date: '2026-11-12',
        author: 'Marek Marczak',
        text: 'Supplement with calcium phosphate preparation and omega-3 fatty acids.',
        priority: 'wysoki'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: false, trainedT2: false, vitalsLogged: true, wellbeing: 'Severe fatigue and neck pain' },
      { date: '2026-11-13', trainedAred: true, trainedT2: false, vitalsLogged: true, wellbeing: 'Dizziness' }
    ]
  },
  {
    id: 'astro-5',
    name: 'Wojciech Skrzypczak',
    role: '',
    avatarCode: 'WS',
    age: 35,
    bloodType: 'AB Rh plus',
    missionDay: 184,
    evaHours: 20,
    overallStatus: 'normal',
    statusLabel: 'Stable Condition',
    statusDescription: 'Exemplary adaptation to microgravity. Cognitive readiness index within optimal range.',
    vitals: {
      hr: 66,
      hrUnit: 'bpm',
      rr: 909,
      rrUnit: 'ms',
      hrv: 68,
      hrvUnit: 'ms',
      bpSys: 118,
      bpDia: 78,
      bpUnit: 'mmHg',
      spo2: 99,
      spo2Unit: '%',
      temp: 36.6,
      tempUnit: 'deg C',
      resp: 14,
      respUnit: 'breaths/min',
      stressLevel: 22,
      stressUnit: 'pts',
      bodyBattery: 84,
      bodyBatteryUnit: 'pts',
      radDose: 14.8,
      radUnit: 'mSv',
      boneDensity: 97,
      boneUnit: '% norm',
      muscleMass: 98,
      muscleUnit: '% norm',
      hydration: 95,
      hydrationUnit: '%',
      sleepHours: 7.9,
      sleepUnit: 'h',
      sleepScore: 89,
      sleepScoreUnit: 'pts',
      cortisol: 4.0,
      cortisolUnit: 'ng/ml',
      lactate: 1.6,
      lactateUnit: 'mmol/l',
      cognitiveReadiness: 94,
      cognitiveUnit: '%'
    },
    periodicTests: [
      {
        id: 'pt-501',
        category: 'Cardiology and Blood Pressure',
        parameter: 'Arterial blood pressure and 3-lead ECG',
        equipment: 'Astroskin Bio-Monitor Vest',
        result: '118/78 mmHg, regular rhythm, normal P-QRS complexes',
        date: '14.11.2026',
        time: '07:10',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-502',
        category: 'Sleep Analysis',
        parameter: 'Sleep duration, sleep stages, and Sleep Score',
        equipment: 'Actiwatch Biometric Band',
        result: '7.9 h total sleep, deep 22 %, REM 24 %, Sleep Score: 89/100 pts',
        date: '14.11.2026',
        time: '06:20',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-503',
        category: 'Physical Performance',
        parameter: 'VO2 max aerobic capacity and energy expenditure',
        equipment: 'Garmin Performance Heart Rate Monitor',
        result: '51.8 ml/kg/min, very high fitness, high energy reserve',
        date: '13.11.2026',
        time: '16:15',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-504',
        category: 'Resistance and Aerobic Training',
        parameter: 'ARED resistance and T2 treadmill session',
        equipment: 'ARED Station and T2 Treadmill',
        result: 'Resistance training 140 kg, treadmill 205 W, duration 120 min, HR 136 bpm',
        date: '14.11.2026',
        time: '11:00',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-505',
        category: 'Sweat Biochemistry',
        parameter: 'Sweat biomarkers: Cortisol, lactate, electrolytes, CRP',
        equipment: 'Bio-Patch Microfluidic Biosensor',
        result: 'Cortisol 4.0 ng/ml, lactate 1.6 mmol/l, Na 49 mmol/l, K 4.5 mmol/l, CRP 0.6 mg/l',
        date: '14.11.2026',
        time: '12:48',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-506',
        category: 'sEMG Muscle Activity',
        parameter: 'Muscle fatigue and sEMG Fibre-WBAN',
        equipment: 'Fibre-WBAN Sensor Straps',
        result: 'Optimal state, no fatigue, MDF 79 Hz, no tremor indicators',
        date: '14.11.2026',
        time: '11:40',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-507',
        category: 'Central Nervous System CNS',
        parameter: 'Cognitive readiness index and EEG attention',
        equipment: 'EEG Neuro-Sensor Headband',
        result: 'Cognitive readiness index 94 %, high divided attention and navigational concentration',
        date: '14.11.2026',
        time: '09:30',
        status: 'Normal',
        statusType: 'normal'
      },
      {
        id: 'pt-508',
        category: 'Radiation Dosimetry',
        parameter: 'Daily and cumulative radiation exposure',
        equipment: 'Onboard RAD-ISS Dosimeter',
        result: 'Daily dose 0.43 mSv, total cumulative dose 14.8 mSv',
        date: '14.11.2026',
        time: '12:00',
        status: 'Normal',
        statusType: 'normal'
      }
    ],
    telemetryHistory: [
      { day: 'Day 179', hr: 67, bpSys: 119, spo2: 99, stress: 23, rad: 14.3 },
      { day: 'Day 180', hr: 65, bpSys: 117, spo2: 99, stress: 21, rad: 14.4 },
      { day: 'Day 181', hr: 68, bpSys: 120, spo2: 99, stress: 24, rad: 14.5 },
      { day: 'Day 182', hr: 66, bpSys: 118, spo2: 99, stress: 22, rad: 14.6 },
      { day: 'Day 183', hr: 64, bpSys: 117, spo2: 99, stress: 20, rad: 14.7 },
      { day: 'Day 184', hr: 66, bpSys: 118, spo2: 99, stress: 22, rad: 14.8 }
    ],
    orders: [
      {
        id: 'ord-501',
        date: '2026-11-10',
        author: 'Marek Marczak',
        text: 'All biometric and cognitive parameters normal. Maintain current operational regimen.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Very good' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Very good' }
    ]
  }
];

const INITIAL_DATA = {
  currentUser: null,
  mode: 'demo',
  users: DEMO_USERS,
  astronauts: DEMO_ASTRONAUTS,
  realUsers: [
    {
      id: 'kierownik',
      login: 'marczak',
      password: 'marczak2026',
      name: 'Marek Marczak',
      role: 'Commander',
      title: '',
      accessLevel: 'Full oversight',
      avatarCode: 'MM'
    }
  ],
  realAstronauts: [],
  demoUsers: DEMO_USERS,
  demoAstronauts: DEMO_ASTRONAUTS,
  eclssCabin: {
    temp: 24.1,
    pressure: 101.3,
    humidity: 39,
    o2: 20.9,
    co2: 2641,
    waterTanks: 94,
    dailyRadiation: 0.21,
    sourceTime: 'OSDR RR-1'
  },
  stepProcedures: [
    {
      id: 'proc-cisnienie',
      code: 'HMS-PR-BP-01',
      name: 'Blood Pressure and SpO2 Measurement',
      category: 'Cardiovascular and Recovery',
      description: 'Standardized arterial blood pressure and oxygen saturation protocol in microgravity',
      steps: [
        'Step 1 of 5: Body stabilization. Sit firmly in the diagnostic chair, fasten waist restraints, and rest motionless for five minutes.',
        'Step 2 of 5: Cuff placement. Position the tensiometer cuff on the left upper arm, exactly two centimeters above the elbow crease at heart level.',
        'Step 3 of 5: Pulse oximeter connection. Attach the optical SpO2 sensor to the right index finger and wait for the pulse waveform to stabilize.',
        'Step 4 of 5: Triple blood pressure capture. Start the automated cycle of three measurements spaced ninety seconds apart between inflations.',
        'Step 5 of 5: Verification and synchronization. Confirm SpO2 exceeds 96 percent and blood pressure is within baseline limits, then commit telemetry upload.'
      ]
    },
    {
      id: 'proc-ekg',
      code: 'HMS-PR-EKG-02',
      name: 'ECG and HRV Variability Recording',
      category: 'Cardiovascular and Recovery',
      description: '12-lead Holter recording and calculation of autonomic nervous system reserve indices',
      steps: [
        'Step 1 of 5: Skin preparation. Clean designated chest electrode sites with an alcohol swab and let dry completely.',
        'Step 2 of 5: Sensor application. Put on the biometric vest or apply the multi-point dermal ECG electrode patch.',
        'Step 3 of 5: Contact quality test. Check skin impedance in the medical console and verify signal noise stays below the error threshold.',
        'Step 4 of 5: Baseline resting capture. Recline calmly for five minutes while breathing steadily to compute heart rate variability HRV.',
        'Step 5 of 5: Recording and arrhythmia check. End session capture, confirm zero extrasystoles in the automated report, and transmit protocol to control.'
      ]
    },
    {
      id: 'proc-pot',
      code: 'HMS-PR-SWEAT-03',
      name: 'Microfluidic Sweat Patch Biochemical Analysis',
      category: 'Biochemistry and Stress: Sweat Analysis',
      description: 'Quantification of sodium, potassium, lactate, calcium ions, and CRP protein',
      steps: [
        'Step 1 of 5: Sensor preparation. Clean the inner forearm and unseal the hermetically packaged capillary microfluidic biosensor.',
        'Step 2 of 5: Patch application. Place the flexible patch onto the skin and press the perimeter evenly for twenty seconds to ensure an airtight seal.',
        'Step 3 of 5: Stimulating micro-iontophoresis. Activate the 3-minute low-current pilocarpine iontophoresis cycle to stimulate eccrine sweat glands.',
        'Step 4 of 5: Biomarker capture. Wait for the enzymatic micro-channel to fill and log sodium, potassium, lactate, calcium electrolytes, and CRP cytokines.',
        'Step 5 of 5: Telemetry transfer. Perform wireless NFC sync with the onboard terminal and dispose of the spent cartridge in medical waste.'
      ]
    },
    {
      id: 'proc-semg',
      code: 'HMS-PR-SEMG-04',
      name: 'Neuromuscular sEMG Fatigue and Dynamometry Assessment',
      category: 'Musculoskeletal System',
      description: 'Median frequency MDF and zero-crossing rate ZCR measurement on the ARED device',
      steps: [
        'Step 1 of 5: Electrode placement. Apply surface sEMG electrodes along the rectus femoris belly and gastrocnemius calf muscle.',
        'Step 2 of 5: Zero calibration. Record a 10-second resting baseline to determine background noise and resting muscle tone.',
        'Step 3 of 5: Maximal isometric contraction. Perform a 5-second test contraction on the ARED unit to establish peak reference force.',
        'Step 4 of 5: Monitored training set. Complete the squat set while tracking real-time median signal frequency MDF.',
        'Step 5 of 5: ZCR micro-tremor analysis. Verify zero-crossing rate ZCR shows no spike indicating extreme overload clustering and save the result.'
      ]
    },
    {
      id: 'proc-cns',
      code: 'HMS-PR-CNS-05',
      name: 'EEG Brainwaves and Eye-Tracking Focus Examination',
      category: 'Sleep and Central Nervous System',
      description: 'Assessment of cognitive fatigue, psychomotor reaction time, and Cognitive Readiness index',
      steps: [
        'Step 1 of 5: EEG headband placement. Fit the dry-electrode headband over forehead and occiput, adjusting tension until signal indicators turn green.',
        'Step 2 of 5: Eye-tracker calibration. Gaze sequentially at 5 illuminated reference points on the primary workstation console display.',
        'Step 3 of 5: Psychomotor vigilance test PVT. Complete the standardized 3-minute reaction-time test responding to random visual stimuli.',
        'Step 4 of 5: Theta and beta wave spectral analysis. The system automatically computes cumulative cognitive fatigue index and gaze fixation duration.',
        'Step 5 of 5: Readiness index sign-off. Verify the final Cognitive Readiness score and attach the report to the mission schedule.'
      ]
    }
  ],
  scheduleData: {
    nextTestCountdownSeconds: 2720,
    upcomingTests: [
      {
        id: 'up-1',
        title: 'Blood Pressure and SpO2 Measurement',
        astronaut: 'Adam Kolosa',
        timeUtc: 'Today 17:15 UTC',
        procId: 'proc-cisnienie'
      },
      {
        id: 'up-2',
        title: 'ECG and HRV Variability Recording',
        astronaut: 'Jan Hopperl',
        timeUtc: 'Today 19:30 UTC',
        procId: 'proc-ekg'
      },
      {
        id: 'up-3',
        title: 'EEG Brainwaves and Eye-Tracking Focus Test',
        astronaut: 'Wojciech Skrzypczak',
        timeUtc: 'Tomorrow 07:00 UTC',
        procId: 'proc-cns'
      },
      {
        id: 'up-4',
        title: 'Biochemical Sweat Analysis: Calcium and CRP',
        astronaut: 'Krzysztof Mysior',
        timeUtc: 'Tomorrow 11:00 UTC',
        procId: 'proc-pot'
      }
    ],
    overdueFifoQueue: [
      {
        id: 'fifo-1',
        title: 'Biochemical Sweat Analysis: Electrolytes and Cortisol',
        astronaut: 'Krzysztof Mysior',
        dueTime: 'Yesterday 20:30 UTC',
        delay: '20 h ago',
        orderIndex: 1,
        procId: 'proc-pot'
      },
      {
        id: 'fifo-2',
        title: 'Neuromuscular sEMG Assessment on ARED',
        astronaut: 'Michał Pawlak',
        dueTime: 'Today 08:00 UTC',
        delay: '8 h ago',
        orderIndex: 2,
        procId: 'proc-semg'
      }
    ]
  },
  prophylaxisGuidelines: [
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Elevated resting heart rate HR or sudden daytime spike',
      guideline: 'Rest, cease current exertion, rehydrate, and complete a stress-reducing breathing session.'
    },
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Morning rise in resting heart rate combined with decreased HRV variability',
      guideline: 'Sign of incomplete overnight recovery. Automatically lower scheduled task intensity and swap heavy duties for lighter work.'
    },
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Multi-day downward HRV trend',
      guideline: 'Indicator of cumulative fatigue or overtraining. Schedule a recovery day, extend sleep duration, and restrict high-intensity exercise.'
    },
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Sudden arterial blood pressure drop during activity or EVA spacewalk',
      guideline: 'Immediately halt physical work, replenish fluids and electrolytes, monitor orthostatic symptoms, and notify the flight surgeon.'
    },
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Gradual arterial blood pressure increase over time',
      guideline: 'Reduce psychophysical workload, apply relaxation techniques, and review fluid-electrolyte balance especially sodium intake.'
    },
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Cardiac rhythm disturbances arrhythmia detected during exercise or rest',
      guideline: 'Stop task immediately, rest, retrieve full ECG waveform from biometric vest or dermal patch, and request urgent medical consult.'
    },
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Blood oxygen saturation SpO2 drop below baseline or downward trend during exertion',
      guideline: 'Halt activity, check ventilation and O2 concentration in suit or cabin, and practice calm deep breathing.'
    },
    {
      category: 'Cardiovascular and Recovery',
      symptom: 'Gradual or sudden rise in body temperature',
      guideline: 'Early sign of overheating or developing infection. Cool the body, adjust cabin or spacesuit temperature, hydrate, rest, and cross-verify sweat CRP protein levels.'
    },
    {
      category: 'Sleep and Central Nervous System',
      symptom: 'Overnight deficit in deep sleep or REM sleep stages',
      guideline: 'Defer high-precision tasks such as delicate repairs or experiments and schedule a short daytime restorative power nap.'
    },
    {
      category: 'Sleep and Central Nervous System',
      symptom: 'Multi-day deficit in total sleep time and quality: actigraphy and EEG',
      guideline: 'Lower Cognitive Readiness operational score, assign routine tasks only, and tune pre-sleep cabin environment by reducing temperature and CO2 levels.'
    },
    {
      category: 'Sleep and Central Nervous System',
      symptom: 'EEG brainwave pattern shift indicating mounting cognitive fatigue on duty',
      guideline: 'Introduce a brief 10-minute recovery break and rotate to lower cognitive-load tasks.'
    },
    {
      category: 'Sleep and Central Nervous System',
      symptom: 'Focus drop captured via eye-tracking: prolonged fixation time and slower responses',
      guideline: 'Trigger haptic break alert and step back from critical flight or equipment controls until full attention returns.'
    },
    {
      category: 'Sleep and Central Nervous System',
      symptom: 'Concurrent drop in EEG and eye-tracking focus alongside rising ambient CO2',
      guideline: 'Immediately ventilate compartment or module, exit poor-airflow zone, and take a recovery rest period.'
    },
    {
      category: 'Musculoskeletal System',
      symptom: 'Decline in sEMG median frequency MDF during exercise sets or physical work',
      guideline: 'Early muscle fatigue signal, transitional state. Dynamically reduce training load on ARED or T2 or shorten task block.'
    },
    {
      category: 'Musculoskeletal System',
      symptom: 'Increase in sEMG zero-crossing rate ZCR indicating muscle micro-tremors',
      guideline: 'Sign of critical exhaustion and injury risk: Cluster 3 Fatigue and Overload. Immediately cease exertion, stretch, and take extended rest.'
    },
    {
      category: 'Musculoskeletal System',
      symptom: 'Drop in joint power and torque measured via IMU, goniometer, and Fibre-WBAN garment vs previous days',
      guideline: 'Modify exercise prescription and enable EMS neuromuscular stimulation to aid recovery and prevent atrophy.'
    },
    {
      category: 'Musculoskeletal System',
      symptom: 'Prolonged restriction in lumbar-hip range of motion and activity: IMU and tactile sensors',
      guideline: 'Add targeted lumbar-hip stretching and mobility routines to counteract stiffness and muscle atrophy in microgravity.'
    },
    {
      category: 'Musculoskeletal System',
      symptom: 'Muscle recruitment asymmetry or improper joint flexion angles during lifting or suit work',
      guideline: 'Correct movement form in real time and lower resistance load to prevent joint overload.'
    },
    {
      category: 'Biochemistry and Stress: Sweat Analysis',
      symptom: 'Elevated morning cortisol level: circadian rhythm disruption',
      guideline: 'Trim daily workload schedule and perform guided breathing or relaxation exercises.'
    },
    {
      category: 'Biochemistry and Stress: Sweat Analysis',
      symptom: 'Sudden daytime cortisol spike: acute stress response',
      guideline: 'Take a short break from current duties, practice calming techniques, and re-verify heart rate and blood pressure.'
    },
    {
      category: 'Biochemistry and Stress: Sweat Analysis',
      symptom: 'Rapid increase in sweat lactate concentration during exertion',
      guideline: 'Signal of anaerobic threshold breach and lactic buildup. Slow work or exercise pace and take a 10-minute rest and hydration break.'
    },
    {
      category: 'Biochemistry and Stress: Sweat Analysis',
      symptom: 'Rising sodium Na plus and potassium K plus concentrations in sweat',
      guideline: 'Sign of progressive dehydration. Immediate alert to replenish fluids and electrolytes.'
    },
    {
      category: 'Biochemistry and Stress: Sweat Analysis',
      symptom: 'Persistent weekly or monthly rise in sweat calcium Ca 2 plus excretion',
      guideline: 'Indicator of accelerated bone demineralization: space osteopenia. Review vitamin D and calcium supplementation and adjust resistance loads.'
    },
    {
      category: 'Biochemistry and Stress: Sweat Analysis',
      symptom: 'Elevated CRP protein and pro-inflammatory cytokines in sweat',
      guideline: 'Early detection of inflammation, muscle micro-trauma, or nascent infection prior to fever onset. Mandatory rest, cancel exercise, and start clinical monitoring.'
    },
    {
      category: 'Cabin and Suit Environment',
      symptom: 'Rising carbon dioxide CO2 concentration in module or spacesuit',
      guideline: 'Prevent headaches, drowsiness, and focus drops by automatically boosting ECLSS scrubbing throughput or replacing CO2 cartridges.'
    },
    {
      category: 'Cabin and Suit Environment',
      symptom: 'Elevated ambient temperature and humidity during physical work or sleep',
      guideline: 'Pre-cool crew cabin before sleep to enhance NREM and REM architecture, and regulate EVA liquid cooling loop to avoid dehydration and overheating.'
    },
    {
      category: 'Cabin and Suit Environment',
      symptom: 'Elevated nitric oxide NO detected by garment sensors',
      guideline: 'Indicator of airway irritation or inflammation. Inspect cabin air for particulates and aerosols, hydrate mucous membranes, and rest.'
    },
    {
      category: 'Cabin and Suit Environment',
      symptom: 'Rising cumulative ionizing radiation dose recorded by dosimeters',
      guideline: 'Minimize stay in lightly shielded modules or abort EVA sortie, shelter in high-shielding volume, and monitor oxidative stress and CRP markers.'
    }
  ],
  criticalScenarios: [
    {
      category: 'Cardiovascular and Life Threat',
      title: 'Severe or sustained arrhythmia detected on ECG or PPG during EVA or rest',
      action: 'Immediate EVA termination by crewmate and escort back to airlock. Urgent flight surgeon teleconsultation and Earth return evaluation if rhythm fails to stabilize.'
    },
    {
      category: 'Cardiovascular and Life Threat',
      title: 'Rapid severe drop in blood pressure BP paired with elevated HR and dizziness',
      action: 'Syncope risk amplified by cephalad fluid shift and cardiac deconditioning in microgravity. Requires immediate crewmate stabilization, IV/oral fluids, and flight surgeon intervention.'
    },
    {
      category: 'Cardiovascular and Life Threat',
      title: 'Critical SpO2 desaturation unresponsive to oxygen adjustment in suit or cabin',
      action: 'Suspected pulmonary edema, embolism, or respiratory system failure. Immediate crew assistance: 100 percent oxygen delivery, CPR readiness, flight surgeon alert, and evacuation staging.'
    },
    {
      category: 'Cardiovascular and Life Threat',
      title: 'High fever with abrupt body temperature surge combined with cardiac instability',
      action: 'Indicator of severe systemic infection or sepsis. Isolate in medical bay under crew care, start flight surgeon pharmacotherapy, and evaluate medical evacuation.'
    },
    {
      category: 'Central Nervous System and Cognitive Function',
      title: 'Sudden loss of attention on eye-tracking and pathological EEG during critical operations',
      action: 'Risk of loss of consciousness or critical error during docking, repair, or EVA. Immediate duty handover and crewmate securing of the astronaut.'
    },
    {
      category: 'Central Nervous System and Cognitive Function',
      title: 'Severe multi-day sleep and circadian disruption causing hallucinations or deep disorientation',
      action: 'Cognitive Readiness collapse driven by stress, isolation, and overload. Requires mission psychologist or flight surgeon intervention, continuous crew watch, and possible early return to Earth.'
    },
    {
      category: 'Central Nervous System and Cognitive Function',
      title: 'Acute motor coordination deficit via IMU or goniometer combined with EEG abnormalities',
      action: 'Suspected stroke or acute neurological event such as cosmic radiation insult. Immediate crew care, flight surgeon emergency alert, and urgent evacuation to Earth.'
    },
    {
      category: 'Muscles, Musculoskeletal System and Trauma',
      title: 'Abrupt uncontrolled muscle micro-tremors ZCR spike in sEMG and sudden IMU force or torque drop during EVA',
      action: 'Total muscular exhaustion risking grip loss, untethered drift, or injury. Immediate EVA buddy rescue to return to station and secure hardware.'
    },
    {
      category: 'Muscles, Musculoskeletal System and Trauma',
      title: 'Acute joint flexion asymmetry and sudden muscle power loss accompanied by pain',
      action: 'Suspected muscle tear, ligament rupture, or fracture given 1 to 2 percent monthly bone loss risk. Crew immobilization, ground orthopedic surgical consult, and Earth return if surgery is indicated.'
    },
    {
      category: 'Muscles, Musculoskeletal System and Trauma',
      title: 'Loss of lumbar-hip stability and mobility tracked by IMU and hip tactile sensors',
      action: 'Acute disc herniation or severe spinal pain syndrome caused by microgravity spinal unloading. Requires crew transport assistance, bedside care, and specialist consult.'
    },
    {
      category: 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      title: 'Abrupt spike in sweat CRP protein and pro-inflammatory cytokines via microfluidic patch',
      action: 'Acute inflammation, severe infection such as pneumonia or appendicitis, or massive muscle breakdown: rhabdomyolysis. Demands immediate flight surgeon intervention, onboard diagnostics, and evacuation evaluation.'
    },
    {
      category: 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      title: 'Critical electrolyte derangement: extreme sweat Na plus and K plus swings with HR/HRV arrhythmia',
      action: 'Severe dehydration or potassium imbalance risking cardiac arrest. Intravenous fluid resuscitation required by trained crewmate under flight surgeon direction.'
    },
    {
      category: 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      title: 'Extremely elevated lactate persisting after cessation of exertion',
      action: 'Indicator of lactic acidosis or tissue hypoxia. Requires urgent ground specialist assessment and oxygen therapy supervised by crew.'
    },
    {
      category: 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis',
      title: 'Persistently critical sweat calcium ion Ca 2 plus levels',
      action: 'Signal of rapid bone demineralization posing acute renal stone and pathological fracture risk. Requires endocrinologist or flight surgeon intervention, therapy update, and early Earth return assessment.'
    },
    {
      category: 'Cabin and Suit Environmental Hazards',
      title: 'Sudden CO2 surge or O2 drop in EVA suit or isolated module paired with falling SpO2 and EEG anomalies',
      action: 'Acute hypercapnia or hypoxia: CO2 toxicity or oxygen starvation. Immediate crewmate rescue: connect backup O2 supply, evacuate hazard zone, and administer emergency care.'
    },
    {
      category: 'Cabin and Suit Environmental Hazards',
      title: 'Nitric oxide NO spike detected by garment sensors during system failure or fire',
      action: 'Acute chemical airway irritation or edema. Don oxygen masks immediately, evacuate casualty, consult pulmonology or toxicology, and evacuate to Earth if respiratory failure develops.'
    },
    {
      category: 'Cabin and Suit Environmental Hazards',
      title: 'Critical ionizing radiation dose exceeded on dosimeters, e.g. during solar storm on EVA',
      action: 'Risk of acute radiation syndrome ARS. Seek immediate shelter in radiation-hardened module with crew aid, initiate specialist ground protocol, and expedite Earth return.'
    },
    {
      category: 'Cabin and Suit Environmental Hazards',
      title: 'EVA suit cooling loop failure driving extreme hyperthermia and tachycardia',
      action: 'Heat stroke risk. Immediate EVA abort initiated by partner, rapid cooling inside the airlock by crew, and continuous flight surgeon supervision.'
    }
  ],
  instructions: [
    {
      id: 'inst-1',
      category: 'Musculoskeletal System',
      title: 'Daily ARED Resistance Training Protocol',
      severity: 'Mandatory Procedure',
      steps: [
        'Step one: Accurately calibrate vacuum cylinders to current body mass.',
        'Step two: Perform four sets of ten squats with progressive resistance loading.',
        'Step three: Deadlifts and heel raises to stimulate lower-leg bone density.',
        'Step four: Log resistance loads in the medical terminal immediately after finishing sets.'
      ],
      rationale: 'In microgravity, absence of axial loading drives bone demineralization up to one percent per month. Resistance training counters this loss.'
    },
    {
      id: 'inst-2',
      category: 'Radiation Protection',
      title: 'Solar Particle Event Alert Protocol',
      severity: 'Safety Procedure',
      steps: [
        'Step one: Immediately halt all operations in external station sections.',
        'Step two: Read personal dosimeters and report accumulated dose to the central HMS system.',
        'Step three: Relocate crew to the central shielded core surrounded by water storage tanks.',
        'Step four: Take prescribed radioprotective antioxidants as ordered by the commander.'
      ],
      rationale: 'Cosmic radiation and solar wind can trigger acute cellular damage and hematopoietic suppression.'
    },
    {
      id: 'inst-3',
      category: 'Cardiovascular and Fluid Balance',
      title: 'Fluid Shift Syndrome Prevention',
      severity: 'Daily Prevention',
      steps: [
        'Step one: Apply Chibis lower-body negative pressure suit for forty minutes each morning.',
        'Step two: Consume at least two and a half liters of isotonic hydration solution daily.',
        'Step three: Perform isometric calf contractions during stationary workstation tasks.',
        'Step four: Check neck circumference and intraocular pressure during weekly screening.'
      ],
      rationale: 'Microgravity shifts two liters of fluid toward chest and head, which can induce optic disc edema.'
    },
    {
      id: 'inst-4',
      category: 'Sleep Hygiene and Circadian Rhythm',
      title: 'Sleep Stage and Lighting Cycle Synchronization',
      severity: 'Biological Hygiene',
      steps: [
        'Step one: Switch cabin lighting to amber spectrum ninety minutes prior to sleep.',
        'Step two: Power off all touchscreen displays strictly after 22:00 onboard time.',
        'Step three: Wear sleep mask and earplugs to damp ventilation blower acoustic noise.',
        'Step four: Maintain cabin ambient temperature steadily at eighteen degrees Celsius.'
      ],
      rationale: 'Orbiting Earth every ninety minutes exposes crew to sixteen sunrises daily, requiring scheduled circadian melatonin support.'
    },
    {
      id: 'inst-5',
      category: 'Sensory Adaptation SAS',
      title: 'Space Adaptation Sickness Management',
      severity: 'Adaptation Guideline',
      steps: [
        'Step one: Avoid rapid rotational head movements along pitch and yaw axes.',
        'Step two: Anchor gaze onto designated structural reference markers on module walls.',
        'Step three: Administer antihistamine medication in coordination with flight control medical.',
        'Step four: Eat small, low-fat meals with neutral aroma throughout shift.'
      ],
      rationale: 'Sensory conflict between vestibular system and vision causes discomfort in over sixty percent of astronauts during early flight days.'
    }
  ],
  motivation: {
    missionName: 'Orbital Mission Horizon One',
    missionDay: 184,
    totalPlannedDays: 365,
    safeDaysWithoutIncident: 184,
    teamMilestones: [
      {
        id: 'm-1',
        title: 'Mission Midpoint Reached',
        description: 'Crew completed over half of the planned expedition duration at full operational readiness.',
        achieved: true,
        date: '2026-11-10'
      },
      {
        id: 'm-2',
        title: 'One Thousand Strength Hours',
        description: 'Cumulative crew hours logged on ARED and T2 exercise stations surpassed the target milestone.',
        achieved: true,
        date: '2026-10-28'
      },
      {
        id: 'm-3',
        title: 'Zero Radiation Incidents',
        description: 'Effective preventive shielding protocols kept the entire crew well below radiation limits.',
        achieved: true,
        date: '2026-11-01'
      },
      {
        id: 'm-4',
        title: 'Orbital Docking Hub Exploration',
        description: 'Execution of complex docking maneuvers with zero elevation in crew stress parameters.',
        achieved: false,
        date: 'Scheduled for Day 240'
      }
    ],
    quotes: [
      {
        id: 'q-1',
        author: 'Mission Control Center Houston',
        text: 'Every day of your orbital discipline lays the foundation for a safe return to Earth. You exemplify calm professionalism.'
      },
      {
        id: 'q-2',
        author: 'Space Medicine Team Oberpfaffenhofen',
        text: 'Your bodies transcend limits set by nature. Every workout is a victory won against microgravity.'
      },
      {
        id: 'q-3',
        author: 'Director of Orbital Operations',
        text: 'Weightlessness demands extraordinary resilience. Your dedication inspires millions watching the station from Earth.'
      },
      {
        id: 'q-4',
        author: 'Earth Psychological Support',
        text: 'The quiet of space is never empty. It is the frontier where humanity\'s future is forged.'
      }
    ],
    dailyTips: [
      'Five minutes of daily mindfulness lowers resting heart rate and sweat cortisol.',
      'A short personal conversation with a crewmate reduces feelings of isolation by forty percent.',
      'Drinking an extra warm herbal infusion before bed eases transition into deep sleep.',
      'Looking through the Cupola toward Earth\'s blue horizon triggers a restorative dopamine and endorphin boost.'
    ],
    dailyCheckupLabels: [
      'Resting ECG and heart rate check',
      'SpO2 saturation reading',
      'Blood pressure check',
      'HRV variability analysis',
      'Bio-Patch cortisol reading',
      'Post-workout lactate reading',
      'EEG cognitive readiness scan',
      'Sleep quality and duration log',
      'Hydration balance verification',
      'EVA dosimetry check and daily report'
    ],
    rewardsCatalog: [
      {
        id: 'rew-talk-earth',
        title: '+15 min Earth private call',
        cost: 3000,
        category: 'Private Comms',
        description: 'Additional dedicated family video bandwidth exempt from telemetry caps.'
      },
      {
        id: 'rew-video-family',
        title: 'Priority HD video call',
        cost: 2200,
        category: 'Private Comms',
        description: 'Encrypted off-shift communication channel reservation.'
      },
      {
        id: 'rew-cupola',
        title: 'Extra observation time in Cupola',
        cost: 1500,
        category: 'Recovery',
        description: 'Thirty minutes of private Earth observation session after shift.'
      },
      {
        id: 'rew-protocol-skip',
        title: 'Simplified housekeeping report',
        cost: 1200,
        category: 'Work Comfort',
        description: 'Defer routine station log review to the next watch rotation.'
      },
      {
        id: 'rew-menu',
        title: 'Special dinner menu selection',
        cost: 900,
        category: 'Wellbeing',
        description: 'Priority selection of weekend meal kit from mission stores.'
      }
    ],
    crewProfiles: {
      'astro-1': {
        completedIndices: [0, 1, 2, 3, 4, 5, 6, 7],
        points: 2480,
        streakDays: 14,
        punctualityPct: 96,
        windowStart: 7,
        history7d: [92, 95, 89, 94, 96, 98, 98],
        history30d: [88, 91, 93, 96],
        trend7d: '+4.2%',
        trend30d: '+5.1%',
        redeemed: []
      },
      'astro-2': {
        completedIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        points: 2790,
        streakDays: 18,
        punctualityPct: 98,
        windowStart: 6,
        history7d: [94, 96, 97, 95, 98, 99, 98],
        history30d: [92, 94, 96, 97],
        trend7d: '+3.8%',
        trend30d: '+4.6%',
        redeemed: []
      },
      'astro-3': {
        completedIndices: [0, 1, 2, 3, 4, 5, 6],
        points: 2140,
        streakDays: 9,
        punctualityPct: 89,
        windowStart: 8,
        history7d: [84, 81, 78, 76, 72, 68, 52],
        history30d: [85, 80, 74, 65],
        trend7d: '-3.4%',
        trend30d: '-4.8%',
        redeemed: []
      },
      'astro-4': {
        completedIndices: [0, 1, 2, 3, 4],
        points: 1620,
        streakDays: 4,
        punctualityPct: 78,
        windowStart: 9,
        history7d: [74, 68, 62, 55, 48, 39, 23],
        history30d: [76, 66, 54, 41],
        trend7d: '-7.2%',
        trend30d: '-9.5%',
        redeemed: []
      },
      'astro-5': {
        completedIndices: [0, 1, 2, 3, 4, 5, 6, 7],
        points: 2560,
        streakDays: 15,
        punctualityPct: 95,
        windowStart: 7,
        history7d: [91, 93, 94, 96, 95, 97, 98],
        history30d: [89, 92, 94, 96],
        trend7d: '+3.5%',
        trend30d: '+4.0%',
        redeemed: []
      }
    }
  },
  themeMode: 'night'
};
