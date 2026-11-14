// Dane systemu HMS-of-A
// Health Monitoring System of Astronauts
// Uwaga: brak nawiasow, brak emotek, brak dlugich myslnikow w tekstach

const INITIAL_DATA = {
  currentUser: null,
  users: [
    {
      id: 'kierownik',
      login: 'kierownik',
      password: 'med2026',
      name: 'dr Helena Wejman',
      role: 'Kierownik medyczny misji',
      title: 'Naczelny Lekarz Orbitalny',
      accessLevel: 'Nadzor pelny',
      avatarCode: 'HW'
    },
    {
      id: 'astro-1',
      login: 'twardowski',
      password: 'kosmos1',
      name: 'Jan Twardowski',
      role: 'Dowodca zalogi',
      title: 'Glowny pilot orbitalny',
      accessLevel: 'Konto osobiste',
      avatarCode: 'JT'
    },
    {
      id: 'astro-2',
      login: 'rostowa',
      password: 'kosmos2',
      name: 'Elena Rostowa',
      role: 'Inzynier pokladowy',
      title: 'Specjalista systemow podtrzymywania zycia',
      accessLevel: 'Konto osobiste',
      avatarCode: 'ER'
    },
    {
      id: 'astro-3',
      login: 'vance',
      password: 'kosmos3',
      name: 'Marek Vance',
      role: 'Astrofizyk misji',
      title: 'Operator ladunku naukowego',
      accessLevel: 'Konto osobiste',
      avatarCode: 'MV'
    },
    {
      id: 'astro-4',
      login: 'lindqvist',
      password: 'kosmos4',
      name: 'Sara Lindqvist',
      role: 'Pilot modulu ladownika',
      title: 'Nawigator manewrowy',
      accessLevel: 'Konto osobiste',
      avatarCode: 'SL'
    }
  ],
  astronauts: [
    {
      id: 'astro-1',
      name: 'Jan Twardowski',
      role: 'Dowodca zalogi',
      avatarCode: 'JT',
      age: 42,
      bloodType: 'A Rh plus',
      missionDay: 184,
      evaHours: 32,
      overallStatus: 'normal',
      statusLabel: 'Stan stabilny',
      statusDescription: 'Wszystkie biometryczne wskazniki pozostaja w zdefiniowanym korytarzu bezpieczenstwa.',
      vitals: {
        hr: 68,
        hrUnit: 'bpm',
        bpSys: 120,
        bpDia: 80,
        bpUnit: 'mmHg',
        spo2: 99,
        spo2Unit: '%',
        temp: 36.6,
        tempUnit: 'st. C',
        resp: 14,
        respUnit: 'oddech/min',
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
        stressLevel: 24,
        stressUnit: '%'
      },
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
          author: 'dr Helena Wejman',
          text: 'Utrzymac standardowy profil treningowy ARED. Dodatkowa kontrola cisnienia po spacerze kosmicznym EVA.',
          priority: 'standard'
        },
        {
          id: 'ord-102',
          date: '2026-11-05',
          author: 'dr Helena Wejman',
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
      name: 'Elena Rostowa',
      role: 'Inzynier pokladowy',
      avatarCode: 'ER',
      age: 38,
      bloodType: '0 Rh plus',
      missionDay: 184,
      evaHours: 24,
      overallStatus: 'warning',
      statusLabel: 'Wymagana obserwacja',
      statusDescription: 'Zanotowano podwyzszone cisnienie tetnicze oraz skrocony czas fazy snu glebokiego.',
      vitals: {
        hr: 84,
        hrUnit: 'bpm',
        bpSys: 138,
        bpDia: 88,
        bpUnit: 'mmHg',
        spo2: 97,
        spo2Unit: '%',
        temp: 37.1,
        tempUnit: 'st. C',
        resp: 17,
        respUnit: 'oddech/min',
        radDose: 18.6,
        radUnit: 'mSv',
        boneDensity: 94,
        boneUnit: '% normy',
        muscleMass: 93,
        muscleUnit: '% normy',
        hydration: 89,
        hydrationUnit: '%',
        sleepHours: 5.4,
        sleepUnit: 'godz.',
        stressLevel: 56,
        stressUnit: '%'
      },
      telemetryHistory: [
        { day: 'Dzien 179', hr: 74, bpSys: 126, spo2: 98, stress: 35, rad: 17.9 },
        { day: 'Dzien 180', hr: 78, bpSys: 130, spo2: 98, stress: 42, rad: 18.1 },
        { day: 'Dzien 181', hr: 82, bpSys: 134, spo2: 97, stress: 49, rad: 18.3 },
        { day: 'Dzien 182', hr: 80, bpSys: 132, spo2: 97, stress: 48, rad: 18.4 },
        { day: 'Dzien 183', hr: 86, bpSys: 139, spo2: 96, stress: 58, rad: 18.5 },
        { day: 'Dzien 184', hr: 84, bpSys: 138, spo2: 97, stress: 56, rad: 18.6 }
      ],
      orders: [
        {
          id: 'ord-201',
          date: '2026-11-13',
          author: 'dr Helena Wejman',
          text: 'Bezwzgledny odpoczynek technologiczny. Skrocenie dyzuru przy panelu glownym o dwie godziny.',
          priority: 'wysoki'
        },
        {
          id: 'ord-202',
          date: '2026-11-11',
          author: 'dr Helena Wejman',
          text: 'Wdrozenie wieczornej sesji fototerapii uspokajajacej oraz zwiekszenie dawki magnezu.',
          priority: 'standard'
        }
      ],
      dailyChecks: [
        { date: '2026-11-14', trainedAred: true, trainedT2: false, vitalsLogged: true, wellbeing: 'Umiarkowane zmeczenie' },
        { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Niewyspanie' }
      ]
    },
    {
      id: 'astro-3',
      name: 'Marek Vance',
      role: 'Astrofizyk misji',
      avatarCode: 'MV',
      age: 45,
      bloodType: 'B Rh minus',
      missionDay: 184,
      evaHours: 12,
      overallStatus: 'critical',
      statusLabel: 'Podwyzszone ryzyko',
      statusDescription: 'Tachykardia spoczynkowa, spadek gestosci mineralnej kosci oraz wysoki poziom kortyzolu.',
      vitals: {
        hr: 102,
        hrUnit: 'bpm',
        bpSys: 144,
        bpDia: 94,
        bpUnit: 'mmHg',
        spo2: 95,
        spo2Unit: '%',
        temp: 37.5,
        tempUnit: 'st. C',
        resp: 19,
        respUnit: 'oddech/min',
        radDose: 24.3,
        radUnit: 'mSv',
        boneDensity: 90,
        boneUnit: '% normy',
        muscleMass: 89,
        muscleUnit: '% normy',
        hydration: 86,
        hydrationUnit: '%',
        sleepHours: 4.3,
        sleepUnit: 'godz.',
        stressLevel: 78,
        stressUnit: '%'
      },
      telemetryHistory: [
        { day: 'Dzien 179', hr: 88, bpSys: 136, spo2: 97, stress: 62, rad: 23.5 },
        { day: 'Dzien 180', hr: 92, bpSys: 139, spo2: 96, stress: 68, rad: 23.7 },
        { day: 'Dzien 181', hr: 96, bpSys: 142, spo2: 96, stress: 71, rad: 23.9 },
        { day: 'Dzien 182', hr: 98, bpSys: 141, spo2: 95, stress: 74, rad: 24.0 },
        { day: 'Dzien 183', hr: 104, bpSys: 146, spo2: 95, stress: 80, rad: 24.2 },
        { day: 'Dzien 184', hr: 102, bpSys: 144, spo2: 95, stress: 78, rad: 24.3 }
      ],
      orders: [
        {
          id: 'ord-301',
          date: '2026-11-14',
          author: 'dr Helena Wejman',
          text: 'Pilne badanie ekg telemetrii ciaglej. Zakaz wysilku beztlenowego do odwolania. Konsultacja telemedyczna o godzinie 16.',
          priority: 'krytyczny'
        },
        {
          id: 'ord-302',
          date: '2026-11-12',
          author: 'dr Helena Wejman',
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
      id: 'astro-4',
      name: 'Sara Lindqvist',
      role: 'Pilot modulu ladownika',
      avatarCode: 'SL',
      age: 33,
      bloodType: 'AB Rh plus',
      missionDay: 184,
      evaHours: 18,
      overallStatus: 'normal',
      statusLabel: 'Stan wzorowy',
      statusDescription: 'Znakomita adaptacja sercowo naczyniowa. Wskazniki wydolnosci na najwyzszym poziomie.',
      vitals: {
        hr: 64,
        hrUnit: 'bpm',
        bpSys: 116,
        bpDia: 76,
        bpUnit: 'mmHg',
        spo2: 99,
        spo2Unit: '%',
        temp: 36.5,
        tempUnit: 'st. C',
        resp: 13,
        respUnit: 'oddech/min',
        radDose: 13.9,
        radUnit: 'mSv',
        boneDensity: 98,
        boneUnit: '% normy',
        muscleMass: 99,
        muscleUnit: '% normy',
        hydration: 96,
        hydrationUnit: '%',
        sleepHours: 8.2,
        sleepUnit: 'godz.',
        stressLevel: 18,
        stressUnit: '%'
      },
      telemetryHistory: [
        { day: 'Dzien 179', hr: 65, bpSys: 117, spo2: 99, stress: 19, rad: 13.4 },
        { day: 'Dzien 180', hr: 63, bpSys: 115, spo2: 99, stress: 17, rad: 13.5 },
        { day: 'Dzien 181', hr: 66, bpSys: 118, spo2: 99, stress: 20, rad: 13.6 },
        { day: 'Dzien 182', hr: 64, bpSys: 116, spo2: 99, stress: 18, rad: 13.7 },
        { day: 'Dzien 183', hr: 62, bpSys: 115, spo2: 99, stress: 16, rad: 13.8 },
        { day: 'Dzien 184', hr: 64, bpSys: 116, spo2: 99, stress: 18, rad: 13.9 }
      ],
      orders: [
        {
          id: 'ord-401',
          date: '2026-11-10',
          author: 'dr Helena Wejman',
          text: 'Podtrzymac dotychczasowy plan aktywnosci fizycznej. Wszystkie wskazniki wzorcowe.',
          priority: 'standard'
        }
      ],
      dailyChecks: [
        { date: '2026-11-14', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Doskonale' },
        { date: '2026-11-13', trainedAred: true, trainedT2: true, vitalsLogged: true, wellbeing: 'Doskonale' }
      ]
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
        'Krok czwarty: Przyjecie zalecanych antyoksydantow radioochronnych zgodnie z dyspozycja lekarza misji.'
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
      'Praktyka skupienia uwagi przez piec minut dziennie obniza tętno spoczynkowe i poziom kortyzolu.',
      'Krotka rozmowa z kolega z zalogi o tematach prywatnych redukuje poczucie izolacji o czterdziesci procent.',
      'Wypicie dodatkowego kubka cieplego naparu ziolowego przed snem ulatwia wejscie w faze snu glebokiego.',
      'Spojrzenie przez kopule obserwacyjna na blekit ziemskiej atmosfery wyzwala wyrzut dopaminy i endorfin.'
    ]
  }
};
