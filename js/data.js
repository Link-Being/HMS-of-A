// Dane systemu HMS-of-A
// Health Monitoring System of Astronauts
// Uwaga: brak nawiasow, brak emotek, brak dlugich myslnikow w tekstach

const DEMO_USERS = [
  {
    id: 'kierownik',
    login: 'marczak',
    password: 'marczak2026',
    name: 'Marek Marczak',
    role: 'Kierownik',
    title: '',
    accessLevel: 'Nadzor pelny',
    avatarCode: 'MM'
  },
  {
    id: 'astro-1',
    login: 'kolosa',
    password: 'kolosa1',
    name: 'Adam Kolosa',
    role: '',
    title: '',
    accessLevel: 'Konto osobiste',
    avatarCode: 'AK'
  },
  {
    id: 'astro-2',
    login: 'pawlak',
    password: 'pawlak2',
    name: 'Michał Pawlak',
    role: '',
    title: '',
    accessLevel: 'Konto osobiste',
    avatarCode: 'MP'
  },
  {
    id: 'astro-3',
    login: 'mysior',
    password: 'mysior3',
    name: 'Krzysztof Mysior',
    role: '',
    title: '',
    accessLevel: 'Konto osobiste',
    avatarCode: 'KM'
  },
  {
    id: 'astro-4',
    login: 'hopperl',
    password: 'hopperl4',
    name: 'Jan Hopperl',
    role: '',
    title: '',
    accessLevel: 'Konto osobiste',
    avatarCode: 'JH'
  },
  {
    id: 'astro-5',
    login: 'skrzypczak',
    password: 'skrzypczak5',
    name: 'Wojciech Skrzypczak',
    role: '',
    title: '',
    accessLevel: 'Konto osobiste',
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
    statusLabel: 'Stan stabilny',
    statusDescription: 'Wszystkie biometryczne wskazniki pozostaja w zdefiniowanym korytarzu bezpieczenstwa.',
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
      tempUnit: 'st. C',
      resp: 14,
      respUnit: 'oddech/min',
      stressLevel: 24,
      stressUnit: 'pkt',
      bodyBattery: 85,
      bodyBatteryUnit: 'pkt',
      radDose: 14.2,
      radUnit: 'mSv',
      boneDensity: 97,
      boneUnit: '% normy',
      muscleMass: 98,
      muscleUnit: '% normy',
      hydration: 95,
      hydrationUnit: '%',
      sleepHours: 7.8,
      sleepUnit: 'godz.',
      sleepScore: 88,
      sleepScoreUnit: 'pkt',
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
        category: 'Kardiologia i cisnienie',
        parameter: 'Cisnienie tetnicze krwi i 3-kanalowe EKG',
        equipment: 'Kamizelka Astroskin Bio-Monitor',
        result: '120 na 80 mmHg, rytm zatokowy miarowy, bez cech niedokrwienia',
        date: '14.11.2026',
        time: '07:15',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-102',
        category: 'Analiza snu',
        parameter: 'Czas i fazy snu oraz Sleep Score',
        equipment: 'Opaska biometryczna Actiwatch',
        result: '7.8 godz. calkowitego snu, faza gleboka 21 %, REM 24 %, lekki 55 %, Sleep Score: 88 na 100 pkt',
        date: '14.11.2026',
        time: '06:30',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-103',
        category: 'Wydolnosc fizyczna',
        parameter: 'Pulap tlenowy VO2 max i wydatek energii',
        equipment: 'Garmin pulsometr wydolnosciowy',
        result: '52.4 ml/kg/min, wydolnosc bardzo wysoka, Body Battery poranny 88 pkt',
        date: '13.11.2026',
        time: '16:45',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-104',
        category: 'Trening oporowy i aerobowy',
        parameter: 'Sesja treningowa ARED oraz bieznik T2',
        equipment: 'Stanowisko treningowe ISS ARED i T2',
        result: 'Przysiady i ciag 142 kg, bieznik moc 210 W, czas 120 min, srednie tetno 138 bpm',
        date: '14.11.2026',
        time: '11:30',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-105',
        category: 'Biochemia potu',
        parameter: 'Biomarkery potu: Kortyzol, mleczany, Na, K, Ca, CRP',
        equipment: 'Plaster biometryczny Bio-Patch sensor',
        result: 'Kortyzol 4.2 ng/ml, mleczany 1.8 mmol/l, Na 48 mmol/l, K 4.6 mmol/l, Ca 1.2 mmol/l, CRP 0.8 mg/l',
        date: '14.11.2026',
        time: '12:45',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-106',
        category: 'Aktywnosc miesniowa sEMG',
        parameter: 'Zmeczenie miesni i mikrodrzenia sEMG Fibre-WBAN',
        equipment: 'Paski sensorowe Fibre-WBAN',
        result: 'Stan optymalny brak zmeczenia, MDF 78 Hz, pasmo 10 - 200 Hz, ZCR w normie spoczynkowej',
        date: '14.11.2026',
        time: '11:50',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-107',
        category: 'Uklad nerwowy CNS',
        parameter: 'Indeks gotowosci poznawczej i fale mozgu EEG',
        equipment: 'Opaska EEG neuro-sensor',
        result: 'Indeks gotowosci poznawczej 92 %, stopien skupienia wysoki, rytm alfa zrownowazony',
        date: '14.11.2026',
        time: '09:20',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-108',
        category: 'Dozymetria radiacyjna',
        parameter: 'Ekspozycja radiacyjna dobowa i skumulowana',
        equipment: 'Dozymetr pokladowy RAD-ISS',
        result: 'Dawka dobowa 0.42 mSv, laczna dawka skumulowana 14.2 mSv, ponizej limitu operacyjnego',
        date: '14.11.2026',
        time: '12:00',
        status: 'W normie',
        statusType: 'normal'
      }
    ],
    telemetryHistory: [
      { day: 'Dzien 179', hr: 69, bpSys: 121, spo2: 99, stress: 26, rad: 13.7 },
      { day: 'Dzien 180', hr: 71, bpSys: 122, spo2: 98, stress: 30, rad: 13.8 },
      { day: 'Dzien 181', hr: 67, bpSys: 119, spo2: 99, stress: 22, rad: 13.9 },
      { day: 'Dzien 182', hr: 70, bpSys: 120, spo2: 99, stress: 25, rad: 14.0 },
      { day: 'Dzien 183', hr: 66, bpSys: 118, spo2: 99, stress: 21, rad: 14.1 },
      { day: 'Dzien 184', hr: 68, bpSys: 120, spo2: 99, stress: 24, rad: 14.2 }
    ],
    orders: [
      {
        id: 'ord-101',
        date: '2026-11-12',
        author: 'Marek Marczak',
        text: 'Utrzymac standardowy profil treningowy ARED. Kontrola bilansu elektrolitowego po sesji biegowej.',
        priority: 'standard'
      },
      {
        id: 'ord-102',
        date: '2026-11-05',
        author: 'Marek Marczak',
        text: 'Zwiekszyc podaz plynow z elektrolitami o 300 ml na dobe.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Bardzo dobre' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Dobre' }
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
    statusLabel: 'Stan wzorowy',
    statusDescription: 'Znakomita adaptacja metaboliczna i sercowo naczyniowa. Rezerwy energii wysokie.',
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
      tempUnit: 'st. C',
      resp: 13,
      respUnit: 'oddech/min',
      stressLevel: 20,
      stressUnit: 'pkt',
      bodyBattery: 88,
      bodyBatteryUnit: 'pkt',
      radDose: 15.1,
      radUnit: 'mSv',
      boneDensity: 98,
      boneUnit: '% normy',
      muscleMass: 97,
      muscleUnit: '% normy',
      hydration: 96,
      hydrationUnit: '%',
      sleepHours: 8.0,
      sleepUnit: 'godz.',
      sleepScore: 92,
      sleepScoreUnit: 'pkt',
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
        category: 'Kardiologia i cisnienie',
        parameter: 'Cisnienie tetnicze krwi i 3-kanalowe EKG',
        equipment: 'Kamizelka Astroskin Bio-Monitor',
        result: '118 na 78 mmHg, rytm miarowy, zalamki prawidlowe',
        date: '14.11.2026',
        time: '07:20',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-202',
        category: 'Analiza snu',
        parameter: 'Czas i fazy snu oraz Sleep Score',
        equipment: 'Opaska biometryczna Actiwatch',
        result: '8.0 godz. snu, gleboki 23 %, REM 25 %, wybudzenia 0, Sleep Score: 92 na 100 pkt',
        date: '14.11.2026',
        time: '06:35',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-203',
        category: 'Wydolnosc fizyczna',
        parameter: 'Pulap tlenowy VO2 max i wydatek energii',
        equipment: 'Garmin pulsometr wydolnosciowy',
        result: '54.1 ml/kg/min, wydolnosc wyczynowa, status regeneracji Balanced',
        date: '13.11.2026',
        time: '17:00',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-204',
        category: 'Trening oporowy i aerobowy',
        parameter: 'Sesja treningowa ARED oraz rower CEVIS',
        equipment: 'Stanowisko treningowe ARED i cykloergometr CEVIS',
        result: 'Trening silowy 135 kg, moc ergometru 195 W, czas 120 min, tetno srednie 132 bpm',
        date: '14.11.2026',
        time: '10:45',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-205',
        category: 'Biochemia potu',
        parameter: 'Biomarkery potu: Kortyzol, mleczany, elektrolity, CRP',
        equipment: 'Plaster biometryczny Bio-Patch sensor',
        result: 'Kortyzol 3.8 ng/ml, mleczany 1.4 mmol/l, Na 46 mmol/l, K 4.4 mmol/l, CRP 0.5 mg/l',
        date: '14.11.2026',
        time: '12:50',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-206',
        category: 'Aktywnosc miesniowa sEMG',
        parameter: 'Zmeczenie miesni i sEMG Fibre-WBAN',
        equipment: 'Paski sensorowe Fibre-WBAN',
        result: 'Stan optymalny brak zmeczenia, MDF 81 Hz, brak mikrodrobnoustrojowych fluktuacji',
        date: '14.11.2026',
        time: '11:10',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-207',
        category: 'Uklad nerwowy CNS',
        parameter: 'Indeks gotowosci poznawczej i uwaga EEG',
        equipment: 'Opaska EEG neuro-sensor',
        result: 'Indeks gotowosci poznawczej 95 %, skupienie bardzo wysokie, czas reakcji 198 ms',
        date: '14.11.2026',
        time: '09:25',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-208',
        category: 'Dozymetria radiacyjna',
        parameter: 'Ekspozycja radiacyjna dobowa i skumulowana',
        equipment: 'Dozymetr pokladowy RAD-ISS',
        result: 'Dawka dobowa 0.44 mSv, skumulowana 15.1 mSv, w korytarzu planu misji',
        date: '14.11.2026',
        time: '12:00',
        status: 'W normie',
        statusType: 'normal'
      }
    ],
    telemetryHistory: [
      { day: 'Dzien 179', hr: 66, bpSys: 119, spo2: 99, stress: 21, rad: 14.6 },
      { day: 'Dzien 180', hr: 64, bpSys: 117, spo2: 99, stress: 19, rad: 14.7 },
      { day: 'Dzien 181', hr: 65, bpSys: 118, spo2: 99, stress: 22, rad: 14.8 },
      { day: 'Dzien 182', hr: 67, bpSys: 120, spo2: 99, stress: 24, rad: 14.9 },
      { day: 'Dzien 183', hr: 63, bpSys: 116, spo2: 99, stress: 18, rad: 15.0 },
      { day: 'Dzien 184', hr: 65, bpSys: 118, spo2: 99, stress: 20, rad: 15.1 }
    ],
    orders: [
      {
        id: 'ord-201',
        date: '2026-11-10',
        author: 'Marek Marczak',
        text: 'Wskazniki wydolnosciowe na poziomie wzorcowym. Kontynuowac profilaktyke przeciwzanikowa.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Doskonale' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Doskonale' }
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
    statusLabel: 'Wymagana obserwacja',
    statusDescription: 'Zanotowano podwyzszone cisnienie tetnicze oraz skrocony czas fazy snu glebokiego po sesji EVA.',
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
      tempUnit: 'st. C',
      resp: 17,
      respUnit: 'oddech/min',
      stressLevel: 54,
      stressUnit: 'pkt',
      bodyBattery: 52,
      bodyBatteryUnit: 'pkt',
      radDose: 18.9,
      radUnit: 'mSv',
      boneDensity: 94,
      boneUnit: '% normy',
      muscleMass: 93,
      muscleUnit: '% normy',
      hydration: 89,
      hydrationUnit: '%',
      sleepHours: 5.6,
      sleepUnit: 'godz.',
      sleepScore: 64,
      sleepScoreUnit: 'pkt',
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
        category: 'Kardiologia i cisnienie',
        parameter: 'Cisnienie tetnicze krwi i 3-kanalowe EKG',
        equipment: 'Kamizelka Astroskin Bio-Monitor',
        result: '136 na 86 mmHg, rytm zatokowy z tendencja do tachykardii powysilkowej',
        date: '14.11.2026',
        time: '13:10',
        status: 'Wymaga uwagi',
        statusType: 'warning'
      },
      {
        id: 'pt-302',
        category: 'Analiza snu',
        parameter: 'Czas i fazy snu oraz Sleep Score',
        equipment: 'Opaska biometryczna Actiwatch',
        result: '5.6 godz. snu, gleboki 12 %, REM 18 %, 4 wybudzenia, Sleep Score: 64 na 100 pkt',
        date: '14.11.2026',
        time: '06:15',
        status: 'Wymaga uwagi',
        statusType: 'warning'
      },
      {
        id: 'pt-303',
        category: 'Wydolnosc fizyczna',
        parameter: 'Pulap tlenowy VO2 max i wydatek energii',
        equipment: 'Garmin pulsometr wydolnosciowy',
        result: '44.8 ml/kg/min, wydolnosc zadowalajaca, rezerwy Body Battery obnizone',
        date: '13.11.2026',
        time: '16:30',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-304',
        category: 'Trening oporowy i aerobowy',
        parameter: 'Sesja treningowa ARED oraz bieznik T2',
        equipment: 'Stanowisko treningowe ARED i bieznik T2',
        result: 'Obciazenie zredukowane 110 kg, bieznik 160 W, czas 90 min, tetno wysilkowe 146 bpm',
        date: '14.11.2026',
        time: '10:00',
        status: 'Wymaga uwagi',
        statusType: 'warning'
      },
      {
        id: 'pt-305',
        category: 'Biochemia potu',
        parameter: 'Biomarkery potu: Kortyzol, mleczany, elektrolity, CRP',
        equipment: 'Plaster biometryczny Bio-Patch sensor',
        result: 'Kortyzol 8.6 ng/ml podwyzszony, mleczany 2.9 mmol/l, Na 56 mmol/l, CRP 1.6 mg/l',
        date: '14.11.2026',
        time: '12:40',
        status: 'Wymaga uwagi',
        statusType: 'warning'
      },
      {
        id: 'pt-306',
        category: 'Aktywnosc miesniowa sEMG',
        parameter: 'Zmeczenie miesni i sEMG Fibre-WBAN',
        equipment: 'Paski sensorowe Fibre-WBAN',
        result: 'Stan przejsciowy ostrzezenie o zmeczeniu prostownikow grzbietu, MDF 58 Hz',
        date: '14.11.2026',
        time: '11:45',
        status: 'Wymaga uwagi',
        statusType: 'warning'
      },
      {
        id: 'pt-307',
        category: 'Uklad nerwowy CNS',
        parameter: 'Indeks gotowosci poznawczej i uwaga EEG',
        equipment: 'Opaska EEG neuro-sensor',
        result: 'Indeks gotowosci poznawczej 74 %, skupienie srednie, podwyzszone obciazenie poznawcze',
        date: '14.11.2026',
        time: '09:15',
        status: 'Wymaga uwagi',
        statusType: 'warning'
      },
      {
        id: 'pt-308',
        category: 'Dozymetria radiacyjna',
        parameter: 'Ekspozycja radiacyjna dobowa i skumulowana',
        equipment: 'Dozymetr skafandra EVA RAD-EMU',
        result: 'Dawka dobowa 0.88 mSv wyzsza po wyjsciu EVA, laczna skumulowana 18.9 mSv',
        date: '14.11.2026',
        time: '12:00',
        status: 'Wymaga uwagi',
        statusType: 'warning'
      }
    ],
    telemetryHistory: [
      { day: 'Dzien 179', hr: 72, bpSys: 124, spo2: 98, stress: 34, rad: 18.0 },
      { day: 'Dzien 180', hr: 76, bpSys: 128, spo2: 98, stress: 40, rad: 18.2 },
      { day: 'Dzien 181', hr: 80, bpSys: 132, spo2: 97, stress: 48, rad: 18.4 },
      { day: 'Dzien 182', hr: 78, bpSys: 130, spo2: 97, stress: 46, rad: 18.5 },
      { day: 'Dzien 183', hr: 84, bpSys: 138, spo2: 96, stress: 56, rad: 18.7 },
      { day: 'Dzien 184', hr: 82, bpSys: 136, spo2: 97, stress: 54, rad: 18.9 }
    ],
    orders: [
      {
        id: 'ord-301',
        date: '2026-11-13',
        author: 'Marek Marczak',
        text: 'Bezwzgledny odpoczynek technologiczny po spacerze kosmicznym. Skrocenie dyzuru o dwie godziny.',
        priority: 'wysoki'
      },
      {
        id: 'ord-302',
        date: '2026-11-11',
        author: 'Marek Marczak',
        text: 'Wdrozenie wieczornej sesji fototerapii uspokajajacej oraz zwiekszenie dawki magnezu.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: false, vitalsLogged: true, wellbeing: 'Umiarkowane zmeczenie miesni' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Odwodnienie po EVA' }
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
    statusLabel: 'Podwyzszone ryzyko',
    statusDescription: 'Tachykardia spoczynkowa, spadek gestosci mineralnej kosci oraz wysoki poziom kortyzolu w pocie.',
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
      tempUnit: 'st. C',
      resp: 20,
      respUnit: 'oddech/min',
      stressLevel: 78,
      stressUnit: 'pkt',
      bodyBattery: 28,
      bodyBatteryUnit: 'pkt',
      radDose: 24.6,
      radUnit: 'mSv',
      boneDensity: 89,
      boneUnit: '% normy',
      muscleMass: 88,
      muscleUnit: '% normy',
      hydration: 85,
      hydrationUnit: '%',
      sleepHours: 4.2,
      sleepUnit: 'godz.',
      sleepScore: 46,
      sleepScoreUnit: 'pkt',
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
        category: 'Kardiologia i cisnienie',
        parameter: 'Cisnienie tetnicze krwi i 3-kanalowe EKG',
        equipment: 'Kamizelka Astroskin Bio-Monitor',
        result: '146 na 94 mmHg, epizody tachykardii zatokowej, skrocony odcinek RR',
        date: '14.11.2026',
        time: '13:30',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      },
      {
        id: 'pt-402',
        category: 'Analiza snu',
        parameter: 'Czas i fazy snu oraz Sleep Score',
        equipment: 'Opaska biometryczna Actiwatch',
        result: '4.2 godz. snu, gleboki 7 %, REM 14 %, 6 wybudzen, Sleep Score: 46 na 100 pkt',
        date: '14.11.2026',
        time: '06:00',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      },
      {
        id: 'pt-403',
        category: 'Wydolnosc fizyczna',
        parameter: 'Pulap tlenowy VO2 max i wydatek energii',
        equipment: 'Garmin pulsometr wydolnosciowy',
        result: '36.2 ml/kg/min, wydolnosc niska, Body Battery na wyczerpaniu 28 pkt',
        date: '13.11.2026',
        time: '16:00',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      },
      {
        id: 'pt-404',
        category: 'Trening oporowy i aerobowy',
        parameter: 'Sesja treningowa ARED oraz bieznik T2',
        equipment: 'Stanowisko treningowe ARED i bieznik T2',
        result: 'Trening przerwany po 40 min z powodu zawrotow glowy i tetna 172 bpm',
        date: '14.11.2026',
        time: '09:40',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      },
      {
        id: 'pt-405',
        category: 'Biochemia potu',
        parameter: 'Biomarkery potu: Kortyzol, mleczany, elektrolity, CRP',
        equipment: 'Plaster biometryczny Bio-Patch sensor',
        result: 'Kortyzol 15.2 ng/ml stan alarmowy, mleczany 4.1 mmol/l, CRP 2.8 mg/l, utrata Na',
        date: '14.11.2026',
        time: '12:35',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      },
      {
        id: 'pt-406',
        category: 'Aktywnosc miesniowa sEMG',
        parameter: 'Zmeczenie miesni i sEMG Fibre-WBAN',
        equipment: 'Paski sensorowe Fibre-WBAN',
        result: 'Stan zmeczenia i przeciazenia, mikrodrzenia ZCR podwyzszone, MDF spadek do 44 Hz',
        date: '14.11.2026',
        time: '11:35',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      },
      {
        id: 'pt-407',
        category: 'Uklad nerwowy CNS',
        parameter: 'Indeks gotowosci poznawczej i uwaga EEG',
        equipment: 'Opaska EEG neuro-sensor',
        result: 'Indeks gotowosci poznawczej 58 %, znaczny spadek uwagi, dominacja fal theta i spowolniony czas reakcji',
        date: '14.11.2026',
        time: '09:10',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      },
      {
        id: 'pt-408',
        category: 'Dozymetria radiacyjna',
        parameter: 'Ekspozycja radiacyjna dobowa i skumulowana',
        equipment: 'Dozymetr pokladowy RAD-ISS',
        result: 'Dawka dobowa 0.62 mSv, laczna skumulowana 24.6 mSv, zblizenie do kwartalnego limitu',
        date: '14.11.2026',
        time: '12:00',
        status: 'Podwyzszone ryzyko',
        statusType: 'critical'
      }
    ],
    telemetryHistory: [
      { day: 'Dzien 179', hr: 88, bpSys: 136, spo2: 97, stress: 62, rad: 23.8 },
      { day: 'Dzien 180', hr: 92, bpSys: 139, spo2: 96, stress: 68, rad: 24.0 },
      { day: 'Dzien 181', hr: 96, bpSys: 142, spo2: 96, stress: 71, rad: 24.2 },
      { day: 'Dzien 182', hr: 98, bpSys: 141, spo2: 95, stress: 74, rad: 24.3 },
      { day: 'Dzien 183', hr: 106, bpSys: 148, spo2: 95, stress: 82, rad: 24.5 },
      { day: 'Dzien 184', hr: 104, bpSys: 146, spo2: 95, stress: 78, rad: 24.6 }
    ],
    orders: [
      {
        id: 'ord-401',
        date: '2026-11-14',
        author: 'Marek Marczak',
        text: 'Pilne badanie EKG telemetrii ciaglej. Zakaz wysilku beztlenowego do odwolania. Konsultacja telemedyczna o godzinie 16.',
        priority: 'krytyczny'
      },
      {
        id: 'ord-402',
        date: '2026-11-12',
        author: 'Marek Marczak',
        text: 'Suplementacja preparatem wapniowo fosforanowym oraz kwasami omega trzy.',
        priority: 'wysoki'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: false, trainedT2: false, vitalsLogged: true, wellbeing: 'Silne zmeczenie i bol karku' },
      { date: '2026-11-13', trainedAred: true, trainedT2: false, vitalsLogged: true, wellbeing: 'Zawroty glowy' }
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
    statusLabel: 'Stan stabilny',
    statusDescription: 'Wzorowa adaptacja do stanu niewazkosci. Prawidlowy indeks gotowosci poznawczej.',
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
      tempUnit: 'st. C',
      resp: 14,
      respUnit: 'oddech/min',
      stressLevel: 22,
      stressUnit: 'pkt',
      bodyBattery: 84,
      bodyBatteryUnit: 'pkt',
      radDose: 14.8,
      radUnit: 'mSv',
      boneDensity: 97,
      boneUnit: '% normy',
      muscleMass: 98,
      muscleUnit: '% normy',
      hydration: 95,
      hydrationUnit: '%',
      sleepHours: 7.9,
      sleepUnit: 'godz.',
      sleepScore: 89,
      sleepScoreUnit: 'pkt',
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
        category: 'Kardiologia i cisnienie',
        parameter: 'Cisnienie tetnicze krwi i 3-kanalowe EKG',
        equipment: 'Kamizelka Astroskin Bio-Monitor',
        result: '118 na 78 mmHg, rytm miarowy, zalamki P-QRS w normie',
        date: '14.11.2026',
        time: '07:10',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-502',
        category: 'Analiza snu',
        parameter: 'Czas i fazy snu oraz Sleep Score',
        equipment: 'Opaska biometryczna Actiwatch',
        result: '7.9 godz. snu, gleboki 22 %, REM 24 %, Sleep Score: 89 na 100 pkt',
        date: '14.11.2026',
        time: '06:20',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-503',
        category: 'Wydolnosc fizyczna',
        parameter: 'Pulap tlenowy VO2 max i wydatek energii',
        equipment: 'Garmin pulsometr wydolnosciowy',
        result: '51.8 ml/kg/min, wydolnosc bardzo wysoka, wysoki poziom energii',
        date: '13.11.2026',
        time: '16:15',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-504',
        category: 'Trening oporowy i aerobowy',
        parameter: 'Sesja treningowa ARED oraz bieznik T2',
        equipment: 'Stanowisko treningowe ARED i bieznik T2',
        result: 'Trening oporowy 140 kg, bieznik 205 W, czas 120 min, tetno 136 bpm',
        date: '14.11.2026',
        time: '11:00',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-505',
        category: 'Biochemia potu',
        parameter: 'Biomarkery potu: Kortyzol, mleczany, elektrolity, CRP',
        equipment: 'Plaster biometryczny Bio-Patch sensor',
        result: 'Kortyzol 4.0 ng/ml, mleczany 1.6 mmol/l, Na 49 mmol/l, K 4.5 mmol/l, CRP 0.6 mg/l',
        date: '14.11.2026',
        time: '12:48',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-506',
        category: 'Aktywnosc miesniowa sEMG',
        parameter: 'Zmeczenie miesni i sEMG Fibre-WBAN',
        equipment: 'Paski sensorowe Fibre-WBAN',
        result: 'Stan optymalny brak zmeczenia, MDF 79 Hz, brak objawow tremorowych',
        date: '14.11.2026',
        time: '11:40',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-507',
        category: 'Uklad nerwowy CNS',
        parameter: 'Indeks gotowosci poznawczej i uwaga EEG',
        equipment: 'Opaska EEG neuro-sensor',
        result: 'Indeks gotowosci poznawczej 94 %, wysoka podzielnosc uwagi i koncentracja nawigacyjna',
        date: '14.11.2026',
        time: '09:30',
        status: 'W normie',
        statusType: 'normal'
      },
      {
        id: 'pt-508',
        category: 'Dozymetria radiacyjna',
        parameter: 'Ekspozycja radiacyjna dobowa i skumulowana',
        equipment: 'Dozymetr pokladowy RAD-ISS',
        result: 'Dawka dobowa 0.43 mSv, skumulowana dawka calkowita 14.8 mSv',
        date: '14.11.2026',
        time: '12:00',
        status: 'W normie',
        statusType: 'normal'
      }
    ],
    telemetryHistory: [
      { day: 'Dzien 179', hr: 67, bpSys: 119, spo2: 99, stress: 23, rad: 14.3 },
      { day: 'Dzien 180', hr: 65, bpSys: 117, spo2: 99, stress: 21, rad: 14.4 },
      { day: 'Dzien 181', hr: 68, bpSys: 120, spo2: 99, stress: 24, rad: 14.5 },
      { day: 'Dzien 182', hr: 66, bpSys: 118, spo2: 99, stress: 22, rad: 14.6 },
      { day: 'Dzien 183', hr: 64, bpSys: 117, spo2: 99, stress: 20, rad: 14.7 },
      { day: 'Dzien 184', hr: 66, bpSys: 118, spo2: 99, stress: 22, rad: 14.8 }
    ],
    orders: [
      {
        id: 'ord-501',
        date: '2026-11-10',
        author: 'Marek Marczak',
        text: 'Wszystkie parametry biometryczne i poznawcze prawidlowe. Podtrzymac biezacy rezim operacyjny.',
        priority: 'standard'
      }
    ],
    dailyChecks: [
      { date: '2026-11-14', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Bardzo dobre' },
      { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Bardzo dobre' }
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
      role: 'Kierownik',
      title: '',
      accessLevel: 'Nadzor pelny',
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
      name: 'Pomiar cisnienia tetniczego i saturacji SpO2',
      category: 'Uklad krazenia i regeneracja',
      description: 'Procedura standaryzowanego pomiaru cisnienia krwi oraz wysycenia tlenem w mikrograwitacji',
      steps: [
        'Krok 1 z 5: Stabilizacja ciala. Usiadz stabilnie w fotelu diagnostycznym, zapnij pasy biodrowe i odpocznij bez ruchu przez piec minut.',
        'Krok 2 z 5: Zalozenie mankietu. Umiesc mankiet tensjometru na lewym ramieniu, dokladnie dwa centymetry powyzej zgiecia lokciowego na poziomie serca.',
        'Krok 3 z 5: Podlaczenie pulsoksymetru. Zaloz czujnik optyczny SpO2 na palec wskazujacy prawej dloni i odczekaj na ustabilizowanie pulsu.',
        'Krok 4 z 5: Potrojna rejestracja cisnienia. Uruchom automatyczny cykl trzech pomiarow z odstepem dziewiecdziesieciu sekund pomiedzy inflacjami.',
        'Krok 5 z 5: Weryfikacja i synchronizacja. Sprawdz czy saturacja SpO2 przekracza 96 procent oraz czy cisnienie miesci sie w normie, nastepnie zatwierdz przeslanie do bazy telemetrii.'
      ]
    },
    {
      id: 'proc-ekg',
      code: 'HMS-PR-EKG-02',
      name: 'Rejestracja elektrokardiograficzna EKG oraz zmiennosci HRV',
      category: 'Uklad krazenia i regeneracja',
      description: 'Zapis holterowski 12-odprowadzeniowy oraz wyznaczenie wskaznikow rezerwy autonomicznej organizmu',
      steps: [
        'Krok 1 z 5: Odtluszczenie powierzchni skory. Przetrzyj gazikiem alkoholowym wyznaczone punkty na klatce piersiowej i poczekaj do pelnego wyschniecia.',
        'Krok 2 z 5: Aplikacja czujnikow. Zaloz kamizelke biometryczna lub naklej wielopunktowy plaster naskorny z elektrodami EKG.',
        'Krok 3 z 5: Test jakosci styku. Sprawdz w konsoli medycznej poziom impedancji naskorkowej i upewnij sie, ze poziom szumu jest ponizej progu bledu.',
        'Krok 4 z 5: Spoczynek rejestracyjny. Przyjmij pozycje lezaca na piec minut, oddychajac miarowo w celu wyznaczenia zmiennosci rytmu serca HRV.',
        'Krok 5 z 5: Zapis i weryfikacja arytmii. Zakoncz sesje zapisu, sprawdz automatyczny raport braku ekstrasystolii i przeslij protokol do centrum.'
      ]
    },
    {
      id: 'proc-pot',
      code: 'HMS-PR-SWEAT-03',
      name: 'Analiza biochemiczna potu z plastra mikroprzeplywowego',
      category: 'Biochemia i stres: analiza potu',
      description: 'Oznaczenie stezen jonow sodu, potasu, mleczanow, wapnia oraz bialka CRP',
      steps: [
        'Krok 1 z 5: Przygotowanie sensoryczne. Oczysc wewnetrzna czesc przedramienia i wyjmij hermetycznie zamkniety mikroprzeplywowy biosensor kapilarny.',
        'Krok 2 z 5: Aplikacja plastra. Umiesc elastyczny plaster na skorze, dociskajac rownomiernie brzegi przez dwadziescia sekund w celu uzyskania szczelnosci.',
        'Krok 3 z 5: Mikrojontoforeza stymulujaca. Aktywuj 3-minutowa jontoforeze pilokarpinowa o niskim natezeniu pradu w celu pobudzenia ekrynowych gruczolow potowych.',
        'Krok 4 z 5: Rejestracja biomarkerow. Poczekaj na napelnienie mikroukladu enzymatycznego i odczyt elektrolitow sodu, potasu, mleczanow, wapnia oraz cytokin CRP.',
        'Krok 5 z 5: Transfer telemetrii. Wykonaj bezprzewodowa synchronizacje NFC z terminalem pokladowym i zdeponuj zuzyty wklad w zasobniku medycznym.'
      ]
    },
    {
      id: 'proc-semg',
      code: 'HMS-PR-SEMG-04',
      name: 'Ocena zmeczenia neuromiesniowego SEMG i dynamometria',
      category: 'Miesnie i uklad ruchu',
      description: 'Pomiar mediany czestotliwosci MDF oraz wspolczynnika przejsc przez zero ZCR na urzadzeniu ARED',
      steps: [
        'Krok 1 z 5: Pozycjonowanie elektrod. Naklej elektrody powierzchniowe SEMG wzdluz brzuscca miesnia czworoglowego uda oraz miesnia brzuchatego lydki.',
        'Krok 2 z 5: Kalibracja zerowa. Przeprowadz 10-sekundowy odczyt spoczynkowy w celu wyznaczenia szumu bazowego i napiecia spoczynkowego.',
        'Krok 3 z 5: Maksymalny skurcz izometryczny. Wykonaj 5-sekundowe napiecie probne na maszynie ARED do wyznaczenia maksymalnej sily odniesienia.',
        'Krok 4 z 5: Seria treningowa z monitoringiem. Przeprowadz serie przysiadow z biezacym sledzeniem mediany czestotliwosci sygnalu MDF.',
        'Krok 5 z 5: Analiza mikrodrzen ZCR. Sprawdz czy wskaznik przejsc przez zero ZCR nie wykazuje skoku swiadczacego o klastrze skrajnego przeciazenia i zapisz wynik.'
      ]
    },
    {
      id: 'proc-cns',
      code: 'HMS-PR-CNS-05',
      name: 'Badanie fal mozgowych EEG i skupienia wzroku Eye-tracking',
      category: 'Sen i uklad nerwowy CNS',
      description: 'Ocena zmeczenia poznawczego, czasu reakcji psychomotorycznej oraz wskaznika Cognitive Readiness',
      steps: [
        'Krok 1 z 5: Zalozenie opaski EEG. Umiesc opaske z suchymi elektrodami na czole i potylicy, regulujac docisk do uzyskania zielonego wskaznika sygnalu.',
        'Krok 2 z 5: Kalibracja eyetrackera. Spojrz kolejno na 5 podswietlonych punktow referencyjnych na glownym monitorze konsoli roboczej.',
        'Krok 3 z 5: Test psychomotoryczny PVT. Wykonaj 3-minutowy standaryzowany test czasu reakcji na losowe bodzce wizualne pojawiajace sie na ekranie.',
        'Krok 4 z 5: Analiza widma fal theta i beta. System dokona automatycznej kalkulacji indeksu narastajacego zmeczenia poznawczego oraz czasu fiksacji wzroku.',
        'Krok 5 z 5: Zatwierdzenie indeksu gotowosci. Zweryfikuj koncowy wskaznik Gotowosci Poznawczej Cognitive Readiness i dolacz raport do harmonogramu misji.'
      ]
    }
  ],
  scheduleData: {
    nextTestCountdownSeconds: 2720,
    upcomingTests: [
      {
        id: 'up-1',
        title: 'Pomiar cisnienia tetniczego i saturacji SpO2',
        astronaut: 'Adam Kolosa',
        timeUtc: 'Dzisiaj 17:15 UTC',
        procId: 'proc-cisnienie'
      },
      {
        id: 'up-2',
        title: 'Zapis EKG i zmiennosci rytmu serca HRV',
        astronaut: 'Jan Hopperl',
        timeUtc: 'Dzisiaj 19:30 UTC',
        procId: 'proc-ekg'
      },
      {
        id: 'up-3',
        title: 'Badanie fal mozgowych EEG i skupienia Eye-tracking',
        astronaut: 'Wojciech Skrzypczak',
        timeUtc: 'Jutro 07:00 UTC',
        procId: 'proc-cns'
      },
      {
        id: 'up-4',
        title: 'Biochemiczna analiza potu: wapn i bialko CRP',
        astronaut: 'Krzysztof Mysior',
        timeUtc: 'Jutro 11:00 UTC',
        procId: 'proc-pot'
      }
    ],
    overdueFifoQueue: [
      {
        id: 'fifo-1',
        title: 'Biochemiczna analiza potu: elektrolity i kortyzol',
        astronaut: 'Krzysztof Mysior',
        dueTime: 'Wczoraj 20:30 UTC',
        delay: '20 godz. temu',
        orderIndex: 1,
        procId: 'proc-pot'
      },
      {
        id: 'fifo-2',
        title: 'Ocena neuromiesniowa SEMG na maszynie ARED',
        astronaut: 'Michał Pawlak',
        dueTime: 'Dzisiaj 08:00 UTC',
        delay: '8 godz. temu',
        orderIndex: 2,
        procId: 'proc-semg'
      }
    ]
  },
  prophylaxisGuidelines: [
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Za wysokie tetno HR w spoczynku lub nagly wzrost w ciagu dnia',
      guideline: 'Odpoczynek, przerwanie aktualnego wysilku, nawodnienie organizmu, sesja oddechowa redukujaca stres.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Poranny wzrost tetna spoczynkowego polaczony ze spadkiem zmiennosci rytmu serca HRV',
      guideline: 'Oznaka niepelnej regeneracji nocnej. Automatyczne obnizenie trudnosci zaplanowanych zadan w harmonogramie i zamiana ciezkich aktywnosci na lzejsze.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Dlugotrwaly trend spadkowy HRV w ujeciu wielodniowym',
      guideline: 'Sygnal kumulujacego sie przemeczenia lub przetrenowania. Wprowadzenie dnia regeneracyjnego, wydluzenie czasu snu i ograniczenie intensywnych treningow.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Nagly spadek cisnienia krwi BP w trakcie aktywnosci lub spaceru kosmicznego EVA',
      guideline: 'Natychmiastowe wstrzymanie pracy fizycznej, uzupelnienie plynow i elektrolitow, kontrola objawow ortostatycznych oraz powiadomienie lekarza misji.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Stopniowy wzrost cisnienia krwi BP w czasie',
      guideline: 'Redukcja obciazenia psychofizycznego, techniki relaksacyjne, kontrola bilansu wodno-elektrolitowego, szczegolnie sodu.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Wykryte zaburzenia rytmu serca arytmia podczas wysilku lub spoczynku',
      guideline: 'Natychmiastowe przerwanie zadania, odpoczynek, odczyt pelnego zapisu EKG z kamizelki biometrycznej lub plastra naskornego i pilna konsultacja medyczna.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Spadek saturacji krwi SpO2 ponizej normy lub trend spadkowy w trakcie wysilku',
      guideline: 'Przerwanie aktywnosci, kontrola wentylacji i stezenia tlenu O2 w skafandrze lub kabinie, spokojne glebokie oddychanie.'
    },
    {
      category: 'Uklad krazenia i regeneracja',
      symptom: 'Stopniowy lub nagly wzrost temperatury ciala',
      guideline: 'Wczesny sygnal przegrzania lub rozwijajacej sie infekcji. Schlodzenie organizmu, korekta temperatury kabiny lub skafandra, nawodnienie, odpoczynek i krzyzowa weryfikacja poziomu bialka CRP w pocie.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Niedobor snu glebokiego lub fazy REM w ujeciu nocnym',
      guideline: 'Przelozenie zadan wymagajacych wysokiej precyzji, na przyklad napraw lub eksperymentow, na inny termin oraz zaplanowanie w ciagu dnia krotkiej drzemki regeneracyjnej power nap.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Wielodniowy deficyt calkowitego czasu i jakosci snu: aktygrafia i EEG',
      guideline: 'Obnizenie wskaznika Gotowosci Poznawczej Cognitive Readiness, delegowanie wylacznie zadan rutynowych, korekta warunkow srodowiskowych kabiny przed kolejnym snem: obnizenie temperatury i poziomu CO2.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Zmiana wzorca fal mozgowych EEG wskazujaca na narastajace zmeczenie poznawcze w trakcie pracy',
      guideline: 'Wprowadzenie krotkiej, 10-minutowej przerwy regeneracyjnej, zmiana rodzaju aktywnosci na mniej obciazajaca umyslowo.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Spadek poziomu skupienia rejestrowany przez ruch galek ocznych: eye-tracking, wydluzony czas fiksacji, wolniejsze reakcje',
      guideline: 'Alert haptyczny przypominajacy o przerwie, odsuniecie od procedur krytycznych, na przyklad sterowania lub obslugi skomplikowanej aparatury, do czasu powrotu pelnej uwagi.'
    },
    {
      category: 'Sen i uklad nerwowy CNS',
      symptom: 'Jednoczesny spadek koncentracji EEG i eye-tracking oraz wzrost stezenia CO2 w otoczeniu',
      guideline: 'Natychmiastowa wentylacja pomieszczenia lub modulu, opuszczenie strefy o slabej cyrkulacji powietrza i chwila odpoczynku.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Spadek mediany czestotliwosci sygnalu miesniowego MDF w SEMG w trakcie serii cwiczen lub pracy fizycznej',
      guideline: 'Wczesny sygnal zmeczenia miesni, stan przejsciowy. Dynamiczne zmniejszenie obciazenia treningowego, na przyklad na maszynach ARED lub T2, lub skrocenie podzadania.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Wzrost wspolczynnika przejsc przez zero ZCR w SEMG oznaczajacy mikrodrzenia miesni',
      guideline: 'Oznaka krytycznego wyczerpania i ryzyka kontuzji: Klaster 3 Zmeczenie i Przeciazenie. Natychmiastowe przerwanie wysilku, rozciaganie i wydluzony odpoczynek.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Spadek mocy i momentu sily w stawach: IMU, goniometr, odziez Fibre-WBAN w porownaniu do wartosci bazowych z poprzednich dni',
      guideline: 'Modyfikacja planu treningowego, wlaczenie elektrostymulacji miesniowej EMS w celu wsparcia regeneracji i zapobiegania atrofii.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Dlugotrwale ograniczenie zakresu ruchu i aktywnosci okolic talii oraz bioder: czujniki IMU i dotykowe',
      guideline: 'Wprowadzenie dedykowanych cwiczen rozciagajacych i mobilizujacych odcinek ledzwiowo-biodrowy w celu przeciwdzialania sztywnosci i zanikom miesniowym w mikrograwitacji.'
    },
    {
      category: 'Miesnie i uklad ruchu',
      symptom: 'Asymetria pracy miesni lub nieprawidlowe katy zgiecia stawow podczas podnoszenia ciezarow lub pracy w skafandrze',
      guideline: 'Korekta techniki ruchu w czasie rzeczywistym, zmniejszenie obciazenia w celu unikniecia przeciazenia stawow.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Wysoki poziom kortyzolu rano: zaburzenie rytmu dobowego',
      guideline: 'Redukcja obciazenia zadaniami na dany dzien, wlaczenie sesji oddechowej lub treningu relaksacyjnego.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Nagly skok kortyzolu w ciagu dnia: ostra reakcja stresowa',
      guideline: 'Krotka przerwa od biezacych obowiazkow, techniki wyciszajace, weryfikacja tetna i cisnienia krwi.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Szybki wzrost stezenia mleczanow w pocie podczas wysilku',
      guideline: 'Sygnal przekroczenia progu beztlenowego i narastajacego zakwaszenia miesni. Zmniejszenie tempa pracy lub treningu, 10-minutowa przerwa na odpoczynek i nawodnienie.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Wzrost stezenia jonow sodu Na plus i potasu K plus w pocie',
      guideline: 'Oznaka postepujacego odwodnienia organizmu. Natychmiastowy alert o koniecznosci uzupelnienia plynow oraz elektrolitow.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Dlugotrwaly wzrost wydalania jonow wapnia Ca 2 plus w pocie w ujeciu tygodniowym lub miesiecznym',
      guideline: 'Sygnal przyspieszonej utraty masy kostnej: osteopenii kosmicznej. Weryfikacja suplementacji: witamina D, wapn, oraz korekta obciazen oporowych podczas treningow silowych.'
    },
    {
      category: 'Biochemia i stres: analiza potu',
      symptom: 'Wzrost poziomu bialka CRP oraz cytokin prozapalnych w pocie',
      guideline: 'Wczesne wykrycie stanu zapalnego, mikrourazow miesniowych lub rozwijajacej sie infekcji, czesto jeszcze przed wystapieniem goraczki. Bezwzgledny odpoczynek, odwolanie wysilku fizycznego i wdrozenie procedur medycznych.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Narastajace stezenie dwutlenku wegla CO2 w module lub skafandrze',
      guideline: 'Zapobieganie bolom glowy, sennosci i spadkowi koncentracji poprzez automatyczne zwiekszenie wydajnosci systemow podtrzymywania zycia ECLSS lub wymiane pochlaniaczy.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Wzrost temperatury i wilgotnosci otoczenia podczas pracy fizycznej lub snu',
      guideline: 'Automatyczne schlodzenie kabiny przed snem, dla poprawy jakosci faz NREM i REM, oraz regulacja chlodzenia cieczowego w skafandrze EVA w celu unikniecia odwodnienia i przegrzania.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Podwyzszony poziom tlenku azotu NO wykryty przez czujniki w odziezy',
      guideline: 'Sygnal podraznienia lub stanu zapalnego drog oddechowych. Kontrola czystosci powietrza pod katem pylow i aerozoli, nawilzenie sluzowek i odpoczynek.'
    },
    {
      category: 'Srodowisko kabiny i skafandra',
      symptom: 'Wzrost skumulowanej dawki promieniowania jonizujacego w czasie: dozymetry',
      guideline: 'Skrocenie czasu przebywania w slabiej oslonietych modulach lub przerwanie spaceru kosmicznego EVA, przejscie do strefy o zwiekszonej oslonie radiacyjnej oraz monitorowanie markerow stresu oksydacyjnego i stanu zapalnego CRP.'
    }
  ],
  criticalScenarios: [
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Powazna lub utrzymujaca sie arytmia wykryta w zapisie EKG lub PPG podczas EVA lub spoczynku',
      action: 'Natychmiastowe przerwanie spaceru kosmicznego EVA przez drugiego czlonka zalogi i odprowadzenie astronauty do sluzy. Konieczna pilna telekonsultacja z lekarzem misji oraz rozwazenie powrotu na Ziemie przy braku stabilizacji rytmu serca.'
    },
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Gwaltowny, gleboki spadek cisnienia krwi BP polaczony z przyspieszeniem tetna HR i zawrotami glowy',
      action: 'Ryzyko omdlenia, szczegolnie przez przesuniecie plynow ku glowie i spadek masy miesnia sercowego w mikrograwitacji. Wymagana bezposrednia asekuracja przez innego czlonka zalogi, podanie plynow i lekow pod nadzorem lekarza misji.'
    },
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Krytyczny spadek saturacji krwi SpO2 niereagujacy na korekte tlenu w skafandrze lub kabinie',
      action: 'Podejrzenie obrzeku pluc, zatorowosci lub awarii ukladu oddechowego. Natychmiastowa pomoc zalogi: podanie czystego tlenu, resuscytacja w razie utraty przytomnosci, alarm dla lekarza misji i przygotowanie do ewakuacji na Ziemie.'
    },
    {
      category: 'Uklad krazenia i zagrozenie zycia',
      title: 'Wysoka goraczka, gwaltowny wzrost temperatury ciala, polaczona z zaburzeniami pracy serca',
      action: 'Sygnal ciezkiej infekcji ogolnoustrojowej lub sepsy. Konieczna izolacja w module medycznym pod opieka zalogi, wdrozenie farmakoterapii zleconej przez lekarza misji oraz ocena zasadnosci ewakuacji.'
    },
    {
      category: 'Uklad nerwowy CNS i funkcje poznawcze',
      title: 'Gwaltowna utrata uwagi: eye-tracking, i patologiczny zapis fal mozgowych EEG w trakcie zadan krytycznych',
      action: 'Ryzyko utraty swiadomosci lub popelnienia katastrofalnego bledu podczas dokowania, napraw czy EVA. Natychmiastowe przejecie obowiazkow i zabezpieczenie astronauty przez innego czlonka zalogi.'
    },
    {
      category: 'Uklad nerwowy CNS i funkcje poznawcze',
      title: 'Skrajne, wielodniowe zaburzenia snu i rytmu dobowego prowadzace do halucynacji lub glebokiej dezorientacji',
      action: 'Zalamanie Gotowosci Poznawczej Cognitive Readiness na skutek stresu, izolacji i przeciazenia. Wymagana interwencja psychologa lub lekarza misji, staly nadzor zalogi i ewentualne skrocenie misji: powrot na Ziemie.'
    },
    {
      category: 'Uklad nerwowy CNS i funkcje poznawcze',
      title: 'Nagle zaburzenia koordynacji ruchowej: dane z IMU lub goniometru, polaczone z zaburzeniami pracy mozgu EEG',
      action: 'Podejrzenie udaru lub ostrego uszkodzenia neurologicznego, na przyklad w wyniku promieniowania kosmicznego. Natychmiastowa opieka zalogi, alarm dla lekarza misji i pilna ewakuacja na Ziemie.'
    },
    {
      category: 'Miesnie, uklad ruchu i urazy mechaniczne',
      title: 'Gwaltowne, niekontrolowane mikrodrzenia miesni: skok ZCR w SEMG, i nagly zanik sily lub momentu obrotowego IMU podczas EVA',
      action: 'Calkowite wyczerpanie miesniowe grozace utrata chwytu i dryfowaniem w przestrzeni lub kontuzja. Konieczna natychmiastowa pomoc partnera EVA w powrocie do stacji i zabezpieczeniu sprzetu.'
    },
    {
      category: 'Miesnie, uklad ruchu i urazy mechaniczne',
      title: 'Ostra asymetria katow zgiecia stawow i gwaltowny spadek mocy miesniowej polaczony z bolem',
      action: 'Podejrzenie zerwania miesnia, wiezadla lub zlamania: wysokie ryzyko ze wzgledu na utrate 1 do 2 procent masy kostnej miesiecznie. Pomoc zalogi w unieruchomieniu, konsultacja z chirurgiem lub ortopeda na Ziemi i powrot na Ziemie w przypadku zlaman wymagajacych operacji.'
    },
    {
      category: 'Miesnie, uklad ruchu i urazy mechaniczne',
      title: 'Utrata stabilnosci i mobilnosci odcinka ledzwiowo-biodrowego: czujniki IMU i dotykowe na biodrach',
      action: 'Ostre wypadniecie dysku lub silny zespol bolowy kregoslupa wywolany brakiem rozciagania w mikrograwitacji. Wymagana pomoc zalogi w transporcie i opiece oraz konsultacja ze specjalista.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Gwaltowny, skokowy wzrost bialka CRP i cytokin prozapalnych w pocie: plaster mikroprzeplywowy',
      action: 'Ostry stan zapalny, ciezka infekcja, na przyklad zapalenie pluc, wyrostka robaczkowego, lub masywny rozpad miesni: rabdomioliza. Wymaga natychmiastowej interwencji lekarza misji, diagnostyki pokladowej prowadzonej przez zaloge i potencjalnej ewakuacji na Ziemie.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Krytyczne zaburzenia elektrolitowe: skrajne wahania Na plus i K plus w pocie, polaczone z arytmia HR i HRV',
      action: 'Ciezkie odwodnienie lub zaburzenia gospodarki potasowej grozace zatrzymaniem krazenia. Konieczne podanie kroplowki: nawodnienie dozylne, przez przeszkolonego czlonka zalogi pod nadzorem lekarza misji.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Ekstremalnie wysokie stezenie mleczanow utrzymujace sie mimo zaprzestania wysilku',
      action: 'Sygnal kwasicy mleczanowej lub niedotlenienia tkanek. Wymaga pilnej oceny medycznej przez specjaliste z Ziemi i tlenoterapii pod nadzorem zalogi.'
    },
    {
      category: 'Biochemia, metabolizm i ostre stany zapalne: analiza potu',
      title: 'Krytycznie wysoki poziom jonow wapnia Ca 2 plus w pocie w ujeciu ciaglym',
      action: 'Sygnal gwaltownej demineralizacji kosci niosacej bezposrednie ryzyko kamicy nerkowej i zlaman patologicznych. Wymaga interwencji specjalisty endokrynologa lub lekarza misji, modyfikacji leczenia oraz rozwazenia wczesniejszego powrotu na Ziemie.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Gwaltowny wzrost stezenia CO2 lub spadek O2 w skafandrze EVA lub odizolowanym module z jednoczesnym spadkiem SpO2 i zaburzeniami EEG',
      action: 'Ostra hiperkapnia lub hipoksja: zatrucie dwutlenkiem wegla lub niedotlenienie. Natychmiastowa akcja ratunkowa drugiego astronauty: podlaczenie zapasowego zrodla tlenu, ewakuacja ze strefy zagrozenia, i interwencja medyczna.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Skokowy wzrost tlenku azotu NO wykryty przez czujniki w odziezy podczas awarii lub pozaru',
      action: 'Ostre chemiczne podraznienie lub obrzek drog oddechowych. Konieczne zalozenie masek tlenowych przez zaloge, ewakuacja poszkodowanego, konsultacja z pulmonologiem lub toksykologiem oraz powrot na Ziemie w razie niewydolnosci oddechowej.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Przekroczenie krytycznej dawki promieniowania jonizujacego: dozymetry, na przyklad podczas burzy slonecznej na EVA',
      action: 'Ryzyko ostrej choroby popromiennej ARS. Natychmiastowe schronienie w oslonietym module z pomoca zalogi, wdrozenie protokolu medycznego przez specjalistow z Ziemi oraz pilny powrot na Ziemie na leczenie hematologiczne lub onkologiczne.'
    },
    {
      category: 'Zagrozenia srodowiskowe kabiny i skafandra',
      title: 'Awaria chlodzenia w skafandrze EVA prowadzaca do skrajnego wzrostu temperatury ciala i tetna',
      action: 'Udar cieplny. Natychmiastowe przerwanie misji na zewnatrz stacji przez partnera, szybkie schlodzenie organizmu w sluzie przez zaloge i nadzor lekarza misji.'
    }
  ],
  instructions: [
    {
      id: 'inst-1',
      category: 'Uklad miesniowo szkieletowy',
      title: 'Protokol codziennego treningu oporowego ARED',
      severity: 'Procedura obowiazkowa',
      steps: [
        'Krok pierwszy: Dokladna kalibracja silownikow prozniowych urzadzenia do aktualnej masy ciala.',
        'Krok drugi: Wykonanie czterech serii przysiadow po dziesiec powtorzen z obciazeniem progresywnym.',
        'Krok trzeci: Martwy ciag oraz unoszenie piet w celu stymulacji gestosci kosci podudzia.',
        'Krok czwarty: Rejestracja obciazen w terminalu medycznym bezposrednio po zakonczeniu serii.'
      ],
      rationale: 'W warunkach mikrograwitacji brak nacisku osiowego prowadzi do demineralizacji kosci w tempie do jednego procenta na miesiac. Trening silowy hamuje ten proces.'
    },
    {
      id: 'inst-2',
      category: 'Ochrona radiacyjna',
      title: 'Procedura alarmu podwyzszonej aktywnosci slonecznej',
      severity: 'Procedura bezpieczenstwa',
      steps: [
        'Krok pierwszy: Natychmiastowe przerwanie wszelkich prac w zewnetrznych sekcjach stacji.',
        'Krok drugi: Odczyt wskazan dozymetrow osobistych i zgloszenie dawki do glownego systemu HMS.',
        'Krok trzeci: Przemieszczenie zalogi do centralnego modulu oslonowego otoczonego zasobnikami wody.',
        'Krok czwarty: Przyjecie zalecanych antyoksydantow radioochronnych zgodnie z dyspozycja kierownika.'
      ],
      rationale: 'Promieniowanie kosmiczne oraz wiatr sloneczny moga wywolac ostre uszkodzenia komorkowe oraz oslabienie ukladu krwiotworczego.'
    },
    {
      id: 'inst-3',
      category: 'Uklad krazenia i plyny',
      title: 'Profilaktyka zespolu przemieszczenia plynow ustrojowych',
      severity: 'Profilaktyka codzienna',
      steps: [
        'Krok pierwszy: Stosowanie spodni uciskowych podcisnieniowych chibis przez czterdziesci minut kazdego poranka.',
        'Krok drugi: Regularne spozywanie roztworow izotonicznych w ilosci minimum dwa i pol litra dziennie.',
        'Krok trzeci: Wykonywanie cwiczen izometrycznych miesni lydek podczas wykonywania zadan stacjonarnych.',
        'Krok czwarty: Kontrola obwodu szyi i cisnienia wewnatrzgalkowego w ramach cotygodniowego przegladu.'
      ],
      rationale: 'Brak grawitacji powoduje przesuniecie dwoch litrow plynow ustrojowych w strone klatki piersiowej i glowy co moze prowadzic do obrzeku tarczy nerwu wzrokowego.'
    },
    {
      id: 'inst-4',
      category: 'Higiena snu i rytm dobowy',
      title: 'Synchronizacja faz snu i cyklu oswietlenia',
      severity: 'Higiena biologiczna',
      steps: [
        'Krok pierwszy: Przelaczenie oswietlenia kajuty w tryb widma bursztynowego na dziewiecdziesiat minut przed spoczynkiem.',
        'Krok drugi: Bezwzgledne wygaszenie ekranow dotykowych po godzinie dwudziestej drugiej czasu pokladowego.',
        'Krok trzeci: Uzycie opaski zaciemniajacej oraz zatyczek redukujacych szum systemow wentylacyjnych.',
        'Krok czwarty: Utrzymanie temperatury kajuty na stalym poziomie osiemnascie stopni Celsjusza.'
      ],
      rationale: 'Stacja okrazajaca Ziemie co dziewiedziesiat minut doswiadcza szesnastu wschodow Slonca na dobe. Wymaga to sztucznej stymulacji wydzielania melatoniny.'
    },
    {
      id: 'inst-5',
      category: 'Adaptacja sensoryczna SAS',
      title: 'Postepowanie w chorobie adaptacji kosmicznej',
      severity: 'Zalecenie adaptacyjne',
      steps: [
        'Krok pierwszy: Unikanie szybkich ruchow rotacyjnych glowy w osi poprzecznej i pionowej.',
        'Krok drugi: Koncentracja wzroku na wyznaczonych punktach odniesienia na scianach modulu.',
        'Krok trzeci: Przyjecie leku przeciwhistaminowego w porozumieniu z centrum medycznym.',
        'Krok czwarty: Spozywanie posilkow malymi porcjami o neutralnym zapachu i niskiej zawartosci tluszczu.'
      ],
      rationale: 'Konflikt informacji pomiedzy blednikiem a ukladem wzrokowym wywoluje dyskomfort u ponad szescdziesieciu procent astronautow w ciagu pierwszych dni lotu.'
    }
  ],
  motivation: {
    missionName: 'Misja Orbitalna Horyzont Jeden',
    missionDay: 184,
    totalPlannedDays: 365,
    safeDaysWithoutIncident: 184,
    teamMilestones: [
      {
        id: 'm-1',
        title: 'Polmetek wyprawy',
        description: 'Zaloga zrealizowala ponad polowe zaplanowanego czasu ekspedycji w pelnej sprawnosci operacyjnej.',
        achieved: true,
        date: '2026-11-10'
      },
      {
        id: 'm-2',
        title: 'Tysiac godzin treningu silowego',
        description: 'Laczny czas spedzony przez czlonkow zalogi na urzadzeniach ARED i T2 przekroczyl wyznaczona granice.',
        achieved: true,
        date: '2026-10-28'
      },
      {
        id: 'm-3',
        title: 'Zero incydentow radiacyjnych',
        description: 'Skuteczne procedury prewencyjne uchronily zespol przed przekroczeniem bezpiecznych dawek promieniowania.',
        achieved: true,
        date: '2026-11-01'
      },
      {
        id: 'm-4',
        title: 'Eksploracja ladowiska orbitalnego',
        description: 'Przeprowadzenie serii zlozonych manewrow dokowania bez wplywu na parametry stresowe.',
        achieved: false,
        date: 'Planowane na dzien 240'
      }
    ],
    quotes: [
      {
        id: 'q-1',
        author: 'Centrum Kontroli Lotow Houston',
        text: 'Kazdy dzien waszej dyscypliny na orbicie to fundament bezpiecznego powrotu na Ziemie. Jestescie wzorem spokoju i profesjonalizmu.'
      },
      {
        id: 'q-2',
        author: 'Zespol Medycyny Kosmicznej Oberpfaffenhofen',
        text: 'Wasze ciala pokonuja granice wyznaczone przez prawa natury. Kazdy trening to wygrana bitwa z mikrograwitacja.'
      },
      {
        id: 'q-3',
        author: 'Dyrektor Operacji Orbitalnych',
        text: 'Niewazkosc wymaga niezwyklej sily ducha. Wasza determinacja inspiruje miliony ludzi obserwujacych stacje z powierzchni planety.'
      },
      {
        id: 'q-4',
        author: 'Wsparcie Psychologiczne Ziemi',
        text: 'Cisza przestrzeni kosmicznej nie jest pustka. To przestrzen w ktorej wykuwa sie nowa przyszlosc calej ludzkosci.'
      }
    ],
    dailyTips: [
      'Praktyka skupienia uwagi przez piec minut dziennie obniza tetno spoczynkowe i poziom kortyzolu.',
      'Krotka rozmowa z kolega z zalogi o tematach prywatnych redukuje poczucie izolacji o czterdziesci procent.',
      'Wypicie dodatkowego kubka cieplego naparu ziolowego przed snem ulatwia wejscie w faze snu glebokiego.',
      'Spojrzenie przez kopule obserwacyjna na blekit ziemskiej atmosfery wyzwala wyrzut dopaminy i endorfin.'
    ]
  }
};
