// Glowny plik logiki aplikacji HMS-of-A
// Health Monitoring System of Astronauts
// Scisly zakaz uzywania emotek, nawiasow i dlugich myslnikow w interfejsie

(function() {
  'use strict';

  // Inicjalizacja stanu z localStorage lub danych poczatkowych
  const STORAGE_KEY = 'HMS_OF_A_STATE_V9';

  function loadState() {
    try {
      localStorage.removeItem('HMS_OF_A_STATE_V1');
      localStorage.removeItem('HMS_OF_A_STATE_V2');
      localStorage.removeItem('HMS_OF_A_STATE_V3');
      localStorage.removeItem('HMS_OF_A_STATE_V4');
      localStorage.removeItem('HMS_OF_A_STATE_V5');
      localStorage.removeItem('HMS_OF_A_STATE_V6');
      localStorage.removeItem('HMS_OF_A_STATE_V7');
      localStorage.removeItem('HMS_OF_A_STATE_V8');

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Blad odczytu localStorage:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  function saveState(state) {
    try {
      if (state.mode === 'real') {
        state.realUsers = JSON.parse(JSON.stringify(state.users));
        state.realAstronauts = JSON.parse(JSON.stringify(state.astronauts));
      } else if (state.mode === 'demo') {
        state.demoUsers = JSON.parse(JSON.stringify(state.users));
        state.demoAstronauts = JSON.parse(JSON.stringify(state.astronauts));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Blad zapisu localStorage:', e);
    }
  }

  const appState = loadState();
  if (!appState.mode) {
    appState.mode = 'real';
  }
  if (!appState.demoUsers) {
    appState.demoUsers = JSON.parse(JSON.stringify(DEMO_USERS));
  }
  if (!appState.demoAstronauts) {
    appState.demoAstronauts = JSON.parse(JSON.stringify(DEMO_ASTRONAUTS));
  }
  if (!appState.realUsers) {
    appState.realUsers = [JSON.parse(JSON.stringify(DEMO_USERS[0]))];
  }
  if (!appState.realAstronauts) {
    appState.realAstronauts = [];
  }

  // Wymuszenie usuniecia calej domyslnej zalogi w trybie rzeczywistym
  if (appState.mode === 'real') {
    appState.astronauts = (appState.astronauts || []).filter(function(a) {
      return !['astro-1', 'astro-2', 'astro-3', 'astro-4', 'astro-5'].includes(a.id);
    });
    appState.realAstronauts = appState.astronauts;
    appState.users = (appState.users || []).filter(function(u) {
      return u.id === 'kierownik' || !['astro-1', 'astro-2', 'astro-3', 'astro-4', 'astro-5'].includes(u.id);
    });
    if (!appState.users.some(function(u) { return u.id === 'kierownik'; })) {
      appState.users.unshift(JSON.parse(JSON.stringify(DEMO_USERS[0])));
    }
    appState.realUsers = appState.users;
    if (appState.currentUser && !appState.users.some(function(u) { return u.id === appState.currentUser; })) {
      appState.currentUser = null;
    }
  }

  function extractInitials(name) {
    if (!name) return 'AS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Aktywna zakladka i aktywny wybrany astronauta w podgladzie
  let activeTab = 'pulpit';
  let selectedAstroId = 'astro-1';
  let activeChartMetric = 'hr';
  let filterCategory = 'all';
  let searchQuery = '';

  // Stan licznika cwiczen oddechowych
  let breathingInterval = null;
  let breathingPhaseIndex = 0;
  let breathingSecond = 0;
  let breathingActive = false;

  const breathingPhases = [
    { name: 'Faza wdechu', duration: 4, instruction: 'Wdychaj spokojnie powietrze przez nos' },
    { name: 'Wstrzymanie oddechu', duration: 4, instruction: 'Zatrzymaj powietrze w plucach zachowujac pelny spokoj' },
    { name: 'Faza wydechu', duration: 4, instruction: 'Wypuszczaj powoli powietrze przez usta' },
    { name: 'Spoczynek pluc', duration: 4, instruction: 'Rozluznij miesnie klatki piersiowej przed kolejnym cyklem' }
  ];

  // Narzedzia pomocnicze
  function getCurrentUser() {
    if (!appState.currentUser) return null;
    return appState.users.find(function(u) { return u.id === appState.currentUser; }) || null;
  }

  function isLoggedIn() {
    return Boolean(appState.currentUser && getCurrentUser());
  }

  function isCommander() {
    return appState.currentUser === 'kierownik';
  }

  function getAstronautById(id) {
    return appState.astronauts.find(function(a) { return a.id === id; });
  }

  // Sanityzator usuwajacy nawiasy, emotki i dlugie myslniki z wyrenderowanego DOM
  function enforceConstraints(rootElement) {
    if (!rootElement) return;

    // Przeszukiwanie wezlow tekstowych
    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    const nodesToFix = [];
    while ((node = walker.nextNode())) {
      // Sprawdzenie czy zawiera nawiasy, dlugie myslniki lub znaki emoji
      if (/[\(\)\u2013\u2014\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/.test(node.nodeValue)) {
        nodesToFix.push(node);
      }
    }

    nodesToFix.forEach(function(n) {
      let val = n.nodeValue;
      // Zamiana nawiasow na bezpieczne separatory
      val = val.replace(/\(/g, ' - ').replace(/\)/g, '');
      // Zamiana dlugich myslnikow na krotki dywiz
      val = val.replace(/[\u2013\u2014]/g, ' - ');
      // Usuniecie emotek
      val = val.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/g, '');
      // Czyszczenie podwojnych spacji
      val = val.replace(/\s+/g, ' ');
      n.nodeValue = val;
    });
  }

  // Generowanie naglowka aplikacji
  function renderHeader() {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;

    const logged = isLoggedIn();
    const currentUser = getCurrentUser();
    const commanderFlag = isCommander();

    let userSectionHtml = '';
    let navSectionHtml = '';

    if (logged && currentUser) {
      userSectionHtml = `
        <div class="user-profile-badge">
          <div class="user-avatar-tag">${currentUser.avatarCode}</div>
          <div class="user-meta">
            <div class="user-name">${currentUser.name}</div>
            ${currentUser.role ? `<div class="user-role-badge ${commanderFlag ? 'badge-commander' : 'badge-astro'}">${currentUser.role}</div>` : ''}
          </div>
          <button id="btn-logout" class="btn btn-outline btn-sm" aria-label="Wyloguj z systemu">
            Wyloguj
          </button>
        </div>
      `;

      navSectionHtml = `
        <nav class="main-nav" aria-label="Nawigacja glowna">
          <button class="nav-tab ${activeTab === 'pulpit' ? 'active' : ''}" data-tab="pulpit">
            Pulpit Glowny
          </button>
          <button class="nav-tab ${activeTab === 'telemetria' ? 'active' : ''}" data-tab="telemetria">
            ${commanderFlag ? 'Zaloga i Telemetria' : 'Moje Dane Medyczne'}
          </button>
          <button class="nav-tab ${activeTab === 'instrukcje' ? 'active' : ''}" data-tab="instrukcje">
            Instrukcje i Profilaktyka
          </button>
          <button class="nav-tab ${activeTab === 'motywacja' ? 'active' : ''}" data-tab="motywacja">
            Modul Motywacji
          </button>
          <button class="nav-tab ${activeTab === 'dziennik' ? 'active' : ''}" data-tab="dziennik">
            Dziennik Zdarzen
          </button>
          <button class="nav-tab ${activeTab === 'ustawienia' ? 'active' : ''}" data-tab="ustawienia">
            Ustawienia
          </button>
        </nav>
      `;
    }

    headerEl.innerHTML = `
      <div class="header-inner">
        <div class="brand-group">
          <div class="logo-box">
            <img src="assets/logo.svg" alt="Logo HMS-of-A" class="brand-logo-img" />
          </div>
          <div class="brand-text">
            <span class="brand-title">HMS-of-A</span>
            <span class="brand-subtitle">Health Monitoring System of Astronauts</span>
          </div>
        </div>

        <div class="header-right-action">
          ${userSectionHtml}
        </div>
      </div>

      ${navSectionHtml}
    `;

    // Nasluch wylogowania
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        appState.currentUser = null;
        saveState(appState);
        renderApp();
      });
    }

    // Nasluch zakladek nawigacji
    const tabs = headerEl.querySelectorAll('.nav-tab');
    tabs.forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeTab = btn.getAttribute('data-tab');
        renderApp();
      });
    });
  }

  // WIDOK 0: Panel logowania
  function renderLoginPanel(container) {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo-box">
              <img src="assets/logo.svg" alt="Logo HMS-of-A" class="login-logo-img" />
            </div>
            <h1 class="login-title">HMS-of-A</h1>
            <p class="login-sub">Health Monitoring System of Astronauts</p>
            <p class="login-desc">Panel autoryzacji personelu stacji orbitalnej</p>
          </div>

          <form id="login-form" class="form-vertical">
            <div class="form-group">
              <label for="input-login" class="form-label">Identyfikator logowania:</label>
              <input type="text" id="input-login" class="form-input" placeholder="Wpisz login" required autocomplete="username" />
            </div>

            <div class="form-group">
              <label for="input-password" class="form-label">Haslo dostepowe:</label>
              <input type="password" id="input-password" class="form-input" placeholder="Wpisz haslo" required autocomplete="current-password" />
            </div>

            <div id="login-error-msg" class="login-error-box" style="display: none;"></div>

            <button type="submit" class="btn btn-primary btn-block btn-lg">
              Zaloguj do systemu telemetrii
            </button>
          </form>
        </div>
      </div>
    `;

    // Nasluch formularza logowania
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const loginVal = document.getElementById('input-login').value.trim();
        const passVal = document.getElementById('input-password').value.trim();
        const errBox = document.getElementById('login-error-msg');

        const foundUser = appState.users.find(function(u) {
          const matchLogin = u.login.toLowerCase() === loginVal.toLowerCase() || u.id.toLowerCase() === loginVal.toLowerCase();
          return matchLogin && u.password === passVal;
        });

        if (foundUser) {
          appState.currentUser = foundUser.id;
          if (!isCommander()) {
            selectedAstroId = foundUser.id;
          }
          activeTab = 'pulpit';
          saveState(appState);
          renderApp();
        } else {
          errBox.textContent = 'Blad logowania: Nieprawidlowy identyfikator uzytkownika lub haslo dostepowe.';
          errBox.style.display = 'block';
        }
      });
    }
  }

  // Zegar czasu UTC na zywo
  function startUtcClock() {
    function tick() {
      const clockEl = document.getElementById('live-utc-clock');
      if (clockEl) {
        const now = new Date();
        const h = String(now.getUTCHours()).padStart(2, '0');
        const m = String(now.getUTCMinutes()).padStart(2, '0');
        const s = String(now.getUTCSeconds()).padStart(2, '0');
        clockEl.textContent = `${h}:${m}:${s}`;
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  // WIDOK 1: Pulpit glowny
  function renderPulpit() {
    const mainEl = document.getElementById('app-main');
    if (isCommander()) {
      renderPulpitCommander(mainEl);
    } else {
      renderPulpitAstronaut(mainEl);
    }
  }

  // Pulpit dla Kierownika Misji
  function renderPulpitCommander(container) {
    const totalAstro = appState.astronauts.length;
    let normalCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    let totalHr = 0;
    let totalSpo2 = 0;
    let totalRad = 0;

    appState.astronauts.forEach(function(a) {
      if (a.overallStatus === 'normal') normalCount++;
      else if (a.overallStatus === 'warning') warningCount++;
      else if (a.overallStatus === 'critical') criticalCount++;

      totalHr += a.vitals.hr;
      totalSpo2 += a.vitals.spo2;
      totalRad += a.vitals.radDose;
    });

    const avgHr = totalAstro > 0 ? Math.round(totalHr / totalAstro) : 0;
    const avgSpo2 = totalAstro > 0 ? Math.round(totalSpo2 / totalAstro) : 0;
    const avgRad = totalAstro > 0 ? Math.round((totalRad / totalAstro) * 10) / 10 : 0;

    let astronautsCardsHtml = '';
    if (totalAstro === 0) {
      astronautsCardsHtml = '<div class="empty-state-box">Brak zdefiniowanych astronautow w misji. Przejdz do zakladki Ustawienia aby dodac czlonkow zalogi.</div>';
    } else {
      appState.astronauts.forEach(function(a) {
      let statusClass = 'card-normal';
      let statusBadgeClass = 'badge-normal';
      if (a.overallStatus === 'warning') {
        statusClass = 'card-warning';
        statusBadgeClass = 'badge-warning';
      } else if (a.overallStatus === 'critical') {
        statusClass = 'card-critical';
        statusBadgeClass = 'badge-critical';
      }

      const latestTest = (a.periodicTests && a.periodicTests.length > 0) ? a.periodicTests[0] : null;
      const latestTestHtml = latestTest ? `
        <div class="last-test-preview">
          <span class="last-test-preview-label">Ostatnie badanie okresowe:</span>
          <span class="last-test-preview-text">${latestTest.date} ${latestTest.time} UTC : ${latestTest.parameter} : ${latestTest.status}</span>
        </div>
      ` : '';

      astronautsCardsHtml += `
        <div class="astro-summary-card ${statusClass}" data-astroid="${a.id}">
          <div class="card-head">
            <div class="astro-avatar-box">${a.avatarCode}</div>
            <div class="astro-head-info">
              <h3 class="astro-card-name">${a.name}</h3>
              ${a.role ? `<p class="astro-card-role">${a.role}</p>` : ''}
            </div>
            <span class="status-pill ${statusBadgeClass}">${a.statusLabel}</span>
          </div>

          <p class="astro-card-desc">${a.statusDescription}</p>

          <div class="metrics-grid">
            <div class="metric-item">
              <span class="m-label">Tetno:</span>
              <span class="m-val metric-val-hr"><span class="vital-heart-pulse"><svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>${a.vitals.hr} ${a.vitals.hrUnit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Cisnienie:</span>
              <span class="m-val metric-val-bp">${a.vitals.bpSys} na ${a.vitals.bpDia} ${a.vitals.bpUnit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">SpO2:</span>
              <span class="m-val metric-val-spo2">${a.vitals.spo2} ${a.vitals.spo2Unit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">HRV Status:</span>
              <span class="m-val metric-val-hrv">${a.vitals.hrv || 64} ms</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Oddech:</span>
              <span class="m-val metric-val-resp">${a.vitals.resp} oddech/min</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Stres / Energia:</span>
              <span class="m-val metric-val-stress">${a.vitals.stressLevel} pkt / BB ${a.vitals.bodyBattery || 80} pkt</span>
            </div>
          </div>

          ${latestTestHtml}

          <div class="card-actions">
            <button class="btn btn-primary btn-sm view-astro-btn" data-astroid="${a.id}">
              Pelna telemetria astronauty
            </button>
            <button class="btn btn-outline btn-sm add-order-btn" data-astroid="${a.id}">
              Wydaj zalecenie
            </button>
          </div>
        </div>
      `;
      });
    }

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Centrum Nadzoru Medycznego Misji</h1>
          <p class="view-subtitle">Podsumowanie biotelemetrii calej zalogi stacji orbitalnej Horyzont Jeden</p>
        </div>
        <div class="role-indicator-badge">
          Panel Glowny Kierownika Misji
        </div>
      </div>

      <div class="alert-banner-box ${criticalCount > 0 ? 'banner-critical' : 'banner-info'}" id="dashboard-alert-box">
        <div class="alert-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 L22 20 H2 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            <path d="M12 9 V13 M12 17 H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <div class="alert-text-wrap">
          <strong>Raport bieżący systemu nadzoru medycznego:</strong>
          <span id="dashboard-alert-text">${criticalCount > 0 ? 'Zanotowano podwyzszone ryzyko kardiologiczne u czlonka zalogi. Zaleca sie bezzwloczne wdrozenie protokolu interwencji.' : (totalAstro === 0 ? 'Brak aktywnej zalogi w misji. Przejdz do zakladki Ustawienia aby dodac personel orbitalny.' : 'Wszyscy monitorowani astronauci utrzymuja zadowalajaca rownowage fizjologiczna.')}</span>
        </div>
      </div>

      <div class="stats-overview-grid">
        <div class="stat-box">
          <span class="stat-number" id="stat-count-total">${totalAstro}</span>
          <span class="stat-title">Astronautow na orbicie</span>
          <span class="stat-sub">Sklad staly zalogi</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-success" id="stat-count-normal">${normalCount}</span>
          <span class="stat-title">Stan w pelni stabilny</span>
          <span class="stat-sub">${totalAstro === 0 ? 'Brak personelu' : 'Zgodnosc z norma'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-warning" id="stat-count-warning">${warningCount}</span>
          <span class="stat-title">Wymaga wzmozonej obserwacji</span>
          <span class="stat-sub" id="stat-sub-warning">${warningCount > 0 ? 'Odchylenia parametrow' : 'Brak odchylen'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-critical" id="stat-count-critical">${criticalCount}</span>
          <span class="stat-title">Podwyzszone ryzyko</span>
          <span class="stat-sub" id="stat-sub-critical">${criticalCount > 0 ? 'Wymagana interwencja' : 'Brak zgloszen'}</span>
        </div>
      </div>

      <div class="eclss-overview-card">
        <div class="section-title-bar">
          <div>
            <h2>Stacja kosmiczna : Parametry modulu zalogowego ECLSS</h2>
            <p class="section-subtitle">Srodowiskowa telemetria podtrzymywania zycia w trybie ciaglym</p>
          </div>
          <span class="badge-tag">Sensor stacji</span>
        </div>
        <div class="eclss-metrics-grid">
          <div class="eclss-chip">
            <span class="eclss-chip-title">Temperatura kabiny:</span>
            <span class="eclss-chip-value" id="eclss-temp">${(appState.eclssCabin && appState.eclssCabin.temp) || 22.4} st. C</span>
            <span class="eclss-chip-norm">Norma: 22 - 24 st. C</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Cisnienie powietrza:</span>
            <span class="eclss-chip-value" id="eclss-pressure">${(appState.eclssCabin && appState.eclssCabin.pressure) || 101.3} kPa</span>
            <span class="eclss-chip-norm">Norma: ok. 101 kPa</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Wilgotnosc wzgledna:</span>
            <span class="eclss-chip-value" id="eclss-humidity">${(appState.eclssCabin && appState.eclssCabin.humidity) || 44} %</span>
            <span class="eclss-chip-norm">Norma: 40 - 60 %</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Stezenie tlenu O2:</span>
            <span class="eclss-chip-value" id="eclss-o2">${(appState.eclssCabin && appState.eclssCabin.o2) || 20.9} %</span>
            <span class="eclss-chip-norm">Norma: 21 % O2</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Stezenie CO2:</span>
            <span class="eclss-chip-value" id="eclss-co2">${(appState.eclssCabin && appState.eclssCabin.co2) || 410} ppm</span>
            <span class="eclss-chip-norm">Limit: ponizej 1000 ppm</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Zbiorniki wody:</span>
            <span class="eclss-chip-value" id="eclss-water">${(appState.eclssCabin && appState.eclssCabin.waterTanks) || 94} %</span>
            <span class="eclss-chip-norm">Zapas bezpieczny</span>
          </div>
        </div>
      </div>

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="section-title-bar">
            <h2>Karty biometryczne czlonkow zalogi</h2>
            <span class="badge-tag">Odswiezanie ciagle</span>
          </div>
          <div class="astronauts-grid">
            ${astronautsCardsHtml}
          </div>
        </div>

        <div class="split-column-side">
          <div class="side-panel-card">
            <h3>Srednie wskazniki zespolowe</h3>
            <div class="crew-aggregate-list">
              <div class="agg-row">
                <span class="agg-name">Srednie tetno zalogi:</span>
                <span class="agg-val" id="agg-val-hr">${avgHr} bpm</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Srednia saturacja tlenowa:</span>
                <span class="agg-val" id="agg-val-spo2">${avgSpo2} %</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Srednia dawka promieniowania:</span>
                <span class="agg-val" id="agg-val-rad">${avgRad} mSv</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Dni do kolejnej rotacji:</span>
                <span class="agg-val">181 dni</span>
              </div>
            </div>

            <div class="crew-chart-box">
              <div class="chart-header-row">
                <h4>Porownanie tetna zalogi</h4>
                <span class="unit-tag">bpm</span>
              </div>
              <div id="crew-hr-chart" class="mini-chart-container"></div>
            </div>

            <div class="crew-chart-box">
              <div class="chart-header-row">
                <h4>Porownanie poziomu stresu</h4>
                <span class="unit-tag">procent</span>
              </div>
              <div id="crew-stress-chart" class="mini-chart-container"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Renderowanie wykresow zespolowych
    TelemetryCharts.renderCrewComparison('crew-hr-chart', appState.astronauts, 'hr', 'Tetno', 'bpm');
    TelemetryCharts.renderCrewComparison('crew-stress-chart', appState.astronauts, 'stressLevel', 'Poziom stresu', '%');

    // Podpiecie akcji przyciskow
    container.querySelectorAll('.view-astro-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        selectedAstroId = btn.getAttribute('data-astroid');
        activeTab = 'telemetria';
        renderApp();
      });
    });

    container.querySelectorAll('.add-order-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        selectedAstroId = btn.getAttribute('data-astroid');
        openOrderModal(selectedAstroId);
      });
    });
  }

  // Pulpit dla pojedynczego Astronauty
  function renderPulpitAstronaut(container) {
    const currentAstro = getAstronautById(appState.currentUser);
    if (!currentAstro) {
      container.innerHTML = '<div class="notice-box">Nie znaleziono profilu astronauty.</div>';
      return;
    }

    const v = currentAstro.vitals;

    let ordersHtml = '';
    if (currentAstro.orders && currentAstro.orders.length > 0) {
      currentAstro.orders.forEach(function(ord) {
        let badgeColor = 'badge-normal';
        if (ord.priority === 'wysoki') badgeColor = 'badge-warning';
        if (ord.priority === 'krytyczny') badgeColor = 'badge-critical';

        ordersHtml += `
          <div class="order-item-card">
            <div class="order-meta-row">
              <span class="order-author">${ord.author}</span>
              <span class="order-date">${ord.date}</span>
              <span class="status-pill ${badgeColor}">Priorytet: ${ord.priority}</span>
            </div>
            <p class="order-body">${ord.text}</p>
          </div>
        `;
      });
    } else {
      ordersHtml = '<p class="empty-text">Brak aktywnych zalecen lekarskich.</p>';
    }

    let statusPillClass = 'badge-normal';
    if (currentAstro.overallStatus === 'warning') statusPillClass = 'badge-warning';
    if (currentAstro.overallStatus === 'critical') statusPillClass = 'badge-critical';

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Osobisty Pulpit Zdrowia Astronauty</h1>
          <p class="view-subtitle">Witaj ${currentAstro.name}. Twoje biezace wskazniki fizjologiczne sa monitorowane w czasie rzeczywistym.</p>
        </div>
        <div class="user-status-flag">
          <span class="status-pill ${statusPillClass}">${currentAstro.statusLabel}</span>
        </div>
      </div>

      <div class="personal-summary-banner">
        <div class="personal-info-block">
          <div class="avatar-large">${currentAstro.avatarCode}</div>
          <div>
            <div class="personal-name">${currentAstro.name}</div>
            ${currentAstro.role ? `<div class="personal-role">${currentAstro.role}</div>` : ''}
            <div class="personal-details">Wiek: ${currentAstro.age} lat | Grupa krwi: ${currentAstro.bloodType} | Doba misji: ${currentAstro.missionDay} | Godziny EVA: ${currentAstro.evaHours}</div>
          </div>
        </div>
        <div class="personal-status-desc">
          <div class="desc-heading">Aktualna ocena zespolu medycznego:</div>
          <div class="desc-content">${currentAstro.statusDescription}</div>
        </div>
      </div>

      <div class="vitals-cards-grid">
        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Czestosc akcji serca</span>
            <span class="vital-tag">Tetno</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.hr}</span>
            <span class="vital-unit">${v.hrUnit}</span>
          </div>
          <div class="vital-norm">Zakres bezpieczny: 60 do 95 bpm</div>
        </div>

        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Cisnienie tetnicze</span>
            <span class="vital-tag">RR</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.bpSys} / ${v.bpDia}</span>
            <span class="vital-unit">${v.bpUnit}</span>
          </div>
          <div class="vital-norm">Zakres bezpieczny: 110-130 na 70-85 mmHg</div>
        </div>

        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Saturacja tlenowa</span>
            <span class="vital-tag">SpO2</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.spo2}</span>
            <span class="vital-unit">${v.spo2Unit}</span>
          </div>
          <div class="vital-norm">Wymagane minimum: 95 procent</div>
        </div>

        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Temperatura ciala</span>
            <span class="vital-tag">Termometria</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.temp}</span>
            <span class="vital-unit">${v.tempUnit}</span>
          </div>
          <div class="vital-norm">Norma fizjologiczna: 36.4 do 37.2 st. C</div>
        </div>

        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Czestosc oddechowa</span>
            <span class="vital-tag">Wentylacja</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.resp}</span>
            <span class="vital-unit">${v.respUnit}</span>
          </div>
          <div class="vital-norm">Norma spoczynkowa: 12 do 18 na minute</div>
        </div>

        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Skumulowana dawka radiacji</span>
            <span class="vital-tag">Dozymetria</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.radDose}</span>
            <span class="vital-unit">${v.radUnit}</span>
          </div>
          <div class="vital-norm">Limit bezpieczenstwa misji: 50.0 mSv</div>
        </div>

        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Gestosc mineralna kosci</span>
            <span class="vital-tag">Osteometria</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.boneDensity}</span>
            <span class="vital-unit">${v.boneUnit}</span>
          </div>
          <div class="vital-norm">Wskaznik odniesienia do stanu wyjsciowego</div>
        </div>

        <div class="vital-card">
          <div class="vital-top">
            <span class="vital-title">Masa miesniowa</span>
            <span class="vital-tag">Retencja</span>
          </div>
          <div class="vital-value-row">
            <span class="vital-val">${v.muscleMass}</span>
            <span class="vital-unit">${v.muscleUnit}</span>
          </div>
          <div class="vital-norm">Wskaznik po treningu silowym ARED</div>
        </div>
      </div>

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="chart-container-card">
            <div class="chart-header-controls">
              <div>
                <h3 class="chart-title">Wykres biotelemetrii osobistej</h3>
                <p class="chart-sub">Historia pomiarow z ostatnich szesciu dni orbitalnych</p>
              </div>
              <div class="metric-switch-buttons">
                <button class="btn-metric-toggle ${activeChartMetric === 'hr' ? 'active' : ''}" data-metric="hr">Tetno</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'bpSys' ? 'active' : ''}" data-metric="bpSys">Cisnienie skurczowe</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'spo2' ? 'active' : ''}" data-metric="spo2">Saturacja</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'stress' ? 'active' : ''}" data-metric="stress">Stres</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'rad' ? 'active' : ''}" data-metric="rad">Radiacja</button>
              </div>
            </div>
            <div id="astro-personal-chart" class="main-chart-wrapper"></div>
          </div>

          <div class="card-section">
            <div class="section-title-bar">
              <h3>Wytyczne i zalecenia kierownika medycznego</h3>
              <span class="badge-tag">Marek Marczak</span>
            </div>
            <div class="orders-list">
              ${ordersHtml}
            </div>
          </div>

          ${renderPeriodicTestsTable(currentAstro.periodicTests)}
        </div>

        <div class="split-column-side">
          <div class="side-panel-card">
            <h3>Poranny raport samopoczucia</h3>
            <p class="panel-intro-text">Zglos wykonanie zadan medycznych oraz biezacy stan organizmu:</p>
            
            <form id="daily-checkin-form" class="form-vertical">
              <div class="checkbox-group">
                <label class="custom-checkbox">
                  <input type="checkbox" id="check-ared" checked />
                  <span class="check-box-visual"></span>
                  <span class="check-label">Zrealizowano trening silowy ARED</span>
                </label>
              </div>

              <div class="checkbox-group">
                <label class="custom-checkbox">
                  <input type="checkbox" id="check-t2" checked />
                  <span class="check-box-visual"></span>
                  <span class="check-label">Zrealizowano bieg na biezni T2</span>
                </label>
              </div>

              <div class="checkbox-group">
                <label class="custom-checkbox">
                  <input type="checkbox" id="check-hydration" checked />
                  <span class="check-box-visual"></span>
                  <span class="check-label">Przyjeto norme elektrolitow 2.5 L</span>
                </label>
              </div>

              <div class="form-group">
                <label for="self-feeling" class="form-label">Ocena samopoczucia i ewentualne objawy:</label>
                <select id="self-feeling" class="form-input">
                  <option value="Stan bardzo dobry bez objawow">Stan bardzo dobry bez objawow</option>
                  <option value="Lekkie zmeczenie po dyzurze">Lekkie zmeczenie po dyzurze</option>
                  <option value="Przejsciowy bol karku lub plecow">Przejsciowy bol karku lub plecow</option>
                  <option value="Lekkie nudnosci mikrograwitacyjne">Lekkie nudnosci mikrograwitacyjne</option>
                  <option value="Zaburzenia snu i trudnosc z zasypianiem">Zaburzenia snu i trudnosc z zasypianiem</option>
                </select>
              </div>

              <div class="form-group">
                <label for="self-notes" class="form-label">Komentarz dla zespolu medycznego:</label>
                <textarea id="self-notes" class="form-textarea" rows="3" placeholder="Wpisz uwagi dotyczace kondycji fizycznej"></textarea>
              </div>

              <button type="submit" class="btn btn-primary btn-block">
                Wyslij wpis do systemu
              </button>
            </form>

            <div id="checkin-feedback" class="feedback-msg"></div>
          </div>
        </div>
      </div>
    `;

    // Renderowanie wykresu osobistego
    renderCurrentAstronautChart(currentAstro);

    // Nasluch przyciskow zmiany metryki na wykresie
    container.querySelectorAll('.btn-metric-toggle').forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeChartMetric = btn.getAttribute('data-metric');
        container.querySelectorAll('.btn-metric-toggle').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderCurrentAstronautChart(currentAstro);
      });
    });

    // Obsluga formularza zgloszenia
    const form = document.getElementById('daily-checkin-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const aredDone = document.getElementById('check-ared').checked;
        const t2Done = document.getElementById('check-t2').checked;
        const feeling = document.getElementById('self-feeling').value;
        const notes = document.getElementById('self-notes').value.trim();

        const todayStr = '2026-11-14';
        const entry = {
          date: todayStr,
          trainedAred: aredDone,
          trainedT2: t2Done,
          vitalsLogged: true,
          wellbeing: feeling + (notes ? ' : ' + notes : '')
        };

        if (!currentAstro.dailyChecks) currentAstro.dailyChecks = [];
        currentAstro.dailyChecks.unshift(entry);
        saveState(appState);

        const feedback = document.getElementById('checkin-feedback');
        if (feedback) {
          feedback.textContent = 'Raport zostal pomyslnie zarejestrowany w bazie stacji.';
          feedback.style.display = 'block';
          setTimeout(function() { feedback.style.display = 'none'; }, 4000);
        }
      });
    }
  }

  function renderCurrentAstronautChart(astro) {
    let metricLabel = 'Tetno';
    let unit = 'bpm';
    if (activeChartMetric === 'bpSys') {
      metricLabel = 'Cisnienie skurczowe';
      unit = 'mmHg';
    } else if (activeChartMetric === 'spo2') {
      metricLabel = 'Saturacja tlenowa';
      unit = '%';
    } else if (activeChartMetric === 'stress') {
      metricLabel = 'Poziom stresu';
      unit = '%';
    } else if (activeChartMetric === 'rad') {
      metricLabel = 'Dawka radiacji';
      unit = 'mSv';
    }

    TelemetryCharts.renderLineChart('astro-personal-chart', astro.telemetryHistory, activeChartMetric, metricLabel, unit);
  }

  // Pomocnicza funkcja renderujaca tabele pomiarow i badan okresowych
  function renderPeriodicTestsTable(tests) {
    if (!tests || tests.length === 0) {
      return `
        <div class="periodic-tests-wrapper">
          <div class="section-title-bar">
            <div>
              <h3>Pomiary i badania okresowe</h3>
              <p class="section-subtitle">Wyniki badan diagnostycznych wykonywanych cyklicznie z dokladna data i godzina</p>
            </div>
            <span class="badge-tag">Pomiary okresowe</span>
          </div>
          <div class="empty-state-box">Brak zarejestrowanych badan okresowych dla tego astronauty.</div>
        </div>
      `;
    }

    let rowsHtml = '';
    tests.forEach(function(t) {
      let statusClass = 'badge-normal';
      if (t.statusType === 'warning' || t.status === 'Wymaga uwagi') statusClass = 'badge-warning';
      if (t.statusType === 'critical' || t.status === 'Podwyzszone ryzyko') statusClass = 'badge-critical';

      rowsHtml += `
        <tr class="periodic-test-row">
          <td class="pt-date-col">
            <span class="pt-date">${t.date}</span>
            <span class="pt-time">${t.time} UTC</span>
          </td>
          <td class="pt-param-col">
            <strong class="pt-param-name">${t.parameter}</strong>
            <span class="pt-category">${t.category}</span>
          </td>
          <td class="pt-equip-col">
            <span class="pt-equipment">${t.equipment}</span>
          </td>
          <td class="pt-result-col">
            <span class="pt-result-value">${t.result}</span>
          </td>
          <td class="pt-status-col">
            <span class="status-pill ${statusClass}">${t.status}</span>
          </td>
        </tr>
      `;
    });

    return `
      <div class="periodic-tests-wrapper">
        <div class="section-title-bar">
          <div>
            <h3>Pomiary i badania okresowe</h3>
            <p class="section-subtitle">Wyniki badan diagnostycznych : dokladna data badania, godzina pomiaru i ocena kliniczna</p>
          </div>
          <span class="badge-tag">Pomiary okresowe</span>
        </div>
        <div class="table-responsive">
          <table class="periodic-table">
            <thead>
              <tr>
                <th>Data i godzina</th>
                <th>Badany parametr</th>
                <th>Aparatura pomiarowa</th>
                <th>Wynik badania</th>
                <th>Status kliniczny</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // WIDOK 2: Zaloga i Telemetria dla Kierownika lub rozszerzony widok astronauty
  function renderTelemetria() {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;

    if (!appState.astronauts || appState.astronauts.length === 0) {
      mainEl.innerHTML = `
        <div class="view-header">
          <div>
            <h1 class="view-title">Karty Zdrowia i Telemetria</h1>
            <p class="view-subtitle">Brak zarejestrowanych astronautow w bazie misji</p>
          </div>
        </div>
        <div class="empty-state-box">
          Brak danych astronautow. Przejdz do zakladki Ustawienia aby dodac czlonkow zalogi.
        </div>
      `;
      return;
    }

    const commanderFlag = isCommander();

    // Jesli astronauta jest zalogowany, widzi tylko siebie
    if (!commanderFlag) {
      selectedAstroId = appState.currentUser;
    }

    const currentAstro = getAstronautById(selectedAstroId) || appState.astronauts[0];
    const v = currentAstro.vitals;

    let astroSelectorHtml = '';
    if (commanderFlag) {
      astroSelectorHtml = '<div class="astronaut-tab-row">';
      appState.astronauts.forEach(function(a) {
        let badgeColor = 'badge-normal';
        if (a.overallStatus === 'warning') badgeColor = 'badge-warning';
        if (a.overallStatus === 'critical') badgeColor = 'badge-critical';

        const isActive = a.id === currentAstro.id ? 'active' : '';
        astroSelectorHtml += `
          <button class="astro-tab-btn ${isActive}" data-id="${a.id}">
            <span class="tab-avatar">${a.avatarCode}</span>
            <span class="tab-name">${a.name}</span>
            <span class="status-pill ${badgeColor}">${a.statusLabel}</span>
          </button>
        `;
      });
      astroSelectorHtml += '</div>';
    }

    let ordersHtml = '';
    if (currentAstro.orders && currentAstro.orders.length > 0) {
      currentAstro.orders.forEach(function(ord) {
        let badgeColor = 'badge-normal';
        if (ord.priority === 'wysoki') badgeColor = 'badge-warning';
        if (ord.priority === 'krytyczny') badgeColor = 'badge-critical';

        ordersHtml += `
          <div class="order-item-card">
            <div class="order-meta-row">
              <span class="order-author">${ord.author}</span>
              <span class="order-date">${ord.date}</span>
              <span class="status-pill ${badgeColor}">Priorytet: ${ord.priority}</span>
            </div>
            <p class="order-body">${ord.text}</p>
          </div>
        `;
      });
    } else {
      ordersHtml = '<p class="empty-text">Brak aktywnych zalecen medycznych.</p>';
    }

    let dailyChecksHtml = '';
    if (currentAstro.dailyChecks && currentAstro.dailyChecks.length > 0) {
      currentAstro.dailyChecks.forEach(function(dc) {
        dailyChecksHtml += `
          <div class="daily-check-row">
            <div class="dc-date">${dc.date}</div>
            <div class="dc-tasks">
              <span class="task-badge ${dc.trainedAred ? 'task-done' : 'task-missed'}">ARED: ${dc.trainedAred ? 'Wykonano' : 'Pominieto'}</span>
              <span class="task-badge ${dc.trainedT2 ? 'task-done' : 'task-missed'}">T2: ${dc.trainedT2 ? 'Wykonano' : 'Pominieto'}</span>
            </div>
            <div class="dc-wellbeing">${dc.wellbeing}</div>
          </div>
        `;
      });
    } else {
      dailyChecksHtml = '<p class="empty-text">Brak zgloszonych raportow.</p>';
    }

    let statusPillClass = 'badge-normal';
    if (currentAstro.overallStatus === 'warning') statusPillClass = 'badge-warning';
    if (currentAstro.overallStatus === 'critical') statusPillClass = 'badge-critical';

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">${commanderFlag ? 'Karty Zdrowia i Telemetria Czlonkow Zalogi' : 'Szczegolowa Biotelemetria Osobista'}</h1>
          <p class="view-subtitle">${commanderFlag ? 'Przeglad szczegolowych wskazan kazdego astronauty oraz wydawanie zalecen medycznych' : 'Aktualne i historyczne parametry funkcjonowania Twojego organizmu'}</p>
        </div>
      </div>

      ${astroSelectorHtml}

      <div class="detail-hero-card">
        <div class="detail-hero-left">
          <div class="hero-avatar">${currentAstro.avatarCode}</div>
          <div>
            <h2 class="hero-name">${currentAstro.name}</h2>
            ${(currentAstro.role || currentAstro.title) ? `<div class="hero-role">${[currentAstro.role, currentAstro.title].filter(Boolean).join(' : ')}</div>` : ''}
            <div class="hero-meta-chips">
              <span class="chip">Wiek: ${currentAstro.age} lat</span>
              <span class="chip">Grupa krwi: ${currentAstro.bloodType}</span>
              <span class="chip">Doba misji: ${currentAstro.missionDay}</span>
              <span class="chip">Spacery EVA: ${currentAstro.evaHours} godz.</span>
            </div>
          </div>
        </div>
        <div class="detail-hero-right">
          <div class="status-panel-box">
            <span class="status-label-heading">Stan biezacy:</span>
            <span class="status-pill ${statusPillClass}" id="tel-hero-status-pill">${currentAstro.statusLabel}</span>
            <p class="status-panel-note" id="tel-hero-status-desc">${currentAstro.statusDescription}</p>
            ${commanderFlag ? `<button class="btn btn-primary btn-sm mt-2 open-order-modal-btn" data-id="${currentAstro.id}">Wydaj nowe zalecenie</button>` : ''}
          </div>
        </div>
      </div>

      <div class="radial-gauges-row">
        <div class="gauge-card" id="gauge-bone"></div>
        <div class="gauge-card" id="gauge-muscle"></div>
        <div class="gauge-card" id="gauge-hydration"></div>
        <div class="gauge-card" id="gauge-stress"></div>
      </div>

      <div class="vitals-cards-grid">
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Tetno spoczynkowe</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-hr">${v.hr}</span><span class="vital-unit">${v.hrUnit}</span></div>
          <div class="vital-norm">Zakres ciagly: 55 do 75 bpm</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Interwal RR</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-rr">${v.rr || Math.round(60000 / v.hr)}</span><span class="vital-unit">ms</span></div>
          <div class="vital-norm">Odstęp miedzy uderzeniami serca</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">HRV Status RMSSD</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-hrv">${v.hrv || 64}</span><span class="vital-unit">ms</span></div>
          <div class="vital-norm">Status zrownowazony: 50 - 80 ms</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Saturacja tlenowa SpO2</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-spo2">${v.spo2}</span><span class="vital-unit">${v.spo2Unit}</span></div>
          <div class="vital-norm">Wymagane na ISS: 97 - 100 %</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Czestosc oddechowa</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-resp">${v.resp}</span><span class="vital-unit">${v.respUnit}</span></div>
          <div class="vital-norm">Norma spoczynkowa: 12 - 18 / min</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Poziom stresu</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-stress">${v.stressLevel}</span><span class="vital-unit">pkt</span></div>
          <div class="vital-norm">Skala 0 - 100 pkt</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Rezerwa Body Battery</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-bb">${v.bodyBattery || 82}</span><span class="vital-unit">pkt</span></div>
          <div class="vital-norm">Bilans energii organizmu</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Temperatura powloki</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-temp">${v.temp}</span><span class="vital-unit">${v.tempUnit}</span></div>
          <div class="vital-norm">Norma: 36.4 - 37.2 st. C</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Dawka pochlonieta</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-rad">${v.radDose}</span><span class="vital-unit">${v.radUnit}</span></div>
          <div class="vital-norm">Limit bezpieczenstwa misji: 50.0 mSv</div>
        </div>
      </div>

      <div class="chart-container-card">
        <div class="chart-header-controls">
          <div>
            <h3 class="chart-title">Analiza trendu biotelemetrycznego</h3>
            <p class="chart-sub">Szesciodniowy profil telemetryczny astronauty</p>
          </div>
          <div class="metric-switch-buttons">
            <button class="btn-metric-toggle ${activeChartMetric === 'hr' ? 'active' : ''}" data-metric="hr">Tetno</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'bpSys' ? 'active' : ''}" data-metric="bpSys">Cisnienie skurczowe</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'spo2' ? 'active' : ''}" data-metric="spo2">Saturacja</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'stress' ? 'active' : ''}" data-metric="stress">Stres</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'rad' ? 'active' : ''}" data-metric="rad">Radiacja</button>
          </div>
        </div>
        <div id="telemetry-detail-chart" class="main-chart-wrapper"></div>
      </div>

      ${renderPeriodicTestsTable(currentAstro.periodicTests)}

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="card-section">
            <div class="section-title-bar">
              <h3>Dziennik zalecen medycznych</h3>
              <span class="badge-tag">Historia decyzji</span>
            </div>
            <div class="orders-list">
              ${ordersHtml}
            </div>
          </div>
        </div>

        <div class="split-column-side">
          <div class="side-panel-card">
            <h3>Dziennik wykonania procedur</h3>
            <div class="daily-checks-list">
              ${dailyChecksHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // Renderowanie wskaznikow radialnych
    TelemetryCharts.renderRadialGauge('gauge-bone', v.boneDensity, 100, 'Gestosc kosci', '%', v.boneDensity < 92 ? '#ef4444' : '#00d4ff');
    TelemetryCharts.renderRadialGauge('gauge-muscle', v.muscleMass, 100, 'Masa miesni', '%', v.muscleMass < 92 ? '#ef4444' : '#00d4ff');
    TelemetryCharts.renderRadialGauge('gauge-hydration', v.hydration, 100, 'Nawodnienie', '%', v.hydration < 88 ? '#f59e0b' : '#10b981');
    TelemetryCharts.renderRadialGauge('gauge-stress', v.stressLevel, 100, 'Poziom stresu', '%', v.stressLevel > 60 ? '#ef4444' : '#00d4ff');

    // Renderowanie wykresu glownego
    let mLabel = 'Tetno';
    let mUnit = 'bpm';
    if (activeChartMetric === 'bpSys') { mLabel = 'Cisnienie skurczowe'; mUnit = 'mmHg'; }
    else if (activeChartMetric === 'spo2') { mLabel = 'Saturacja tlenowa'; mUnit = '%'; }
    else if (activeChartMetric === 'stress') { mLabel = 'Poziom stresu'; mUnit = '%'; }
    else if (activeChartMetric === 'rad') { mLabel = 'Dawka radiacji'; mUnit = 'mSv'; }

    TelemetryCharts.renderLineChart('telemetry-detail-chart', currentAstro.telemetryHistory, activeChartMetric, mLabel, mUnit);

    // Nasluch przyciskow metryk
    mainEl.querySelectorAll('.btn-metric-toggle').forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeChartMetric = btn.getAttribute('data-metric');
        renderTelemetria();
      });
    });

    // Nasluch wyboru astronauty przez kierownika
    if (commanderFlag) {
      mainEl.querySelectorAll('.astro-tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          selectedAstroId = btn.getAttribute('data-id');
          renderTelemetria();
        });
      });

      const openBtn = mainEl.querySelector('.open-order-modal-btn');
      if (openBtn) {
        openBtn.addEventListener('click', function() {
          openOrderModal(selectedAstroId);
        });
      }
    }
  }

  // WIDOK 3: Instrukcje i Profilaktyka
  function renderInstrukcje() {
    const mainEl = document.getElementById('app-main');

    const categories = [
      { id: 'all', name: 'Wszystkie procedury' },
      { id: 'Uklad miesniowo szkieletowy', name: 'Uklad miesniowo szkieletowy' },
      { id: 'Ochrona radiacyjna', name: 'Ochrona radiacyjna' },
      { id: 'Uklad krazenia i plyny', name: 'Uklad krazenia i plyny' },
      { id: 'Higiena snu i rytm dobowy', name: 'Higiena snu i rytm dobowy' },
      { id: 'Adaptacja sensoryczna SAS', name: 'Adaptacja sensoryczna SAS' }
    ];

    let categoryPillsHtml = '';
    categories.forEach(function(cat) {
      const activeClass = filterCategory === cat.id ? 'active' : '';
      categoryPillsHtml += `
        <button class="filter-pill ${activeClass}" data-cat="${cat.id}">
          ${cat.name}
        </button>
      `;
    });

    // Filtrowanie instrukcji
    let filtered = appState.instructions.filter(function(inst) {
      const matchCat = filterCategory === 'all' || inst.category === filterCategory;
      const matchSearch = !searchQuery || 
        inst.title.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 ||
        inst.category.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 ||
        inst.rationale.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
      return matchCat && matchSearch;
    });

    let cardsHtml = '';
    if (filtered.length > 0) {
      filtered.forEach(function(inst) {
        let stepsHtml = '';
        inst.steps.forEach(function(step) {
          stepsHtml += `<li class="instruction-step-item">${step}</li>`;
        });

        cardsHtml += `
          <div class="instruction-card">
            <div class="inst-card-top">
              <span class="inst-category-chip">${inst.category}</span>
              <span class="status-pill badge-normal">${inst.severity}</span>
            </div>
            <h3 class="inst-title">${inst.title}</h3>
            
            <div class="inst-body-block">
              <h4 class="inst-block-heading">Procedura postepowania:</h4>
              <ol class="instruction-steps-list">
                ${stepsHtml}
              </ol>
            </div>

            <div class="inst-rationale-box">
              <div class="rationale-heading">Uzasadnienie fizjologiczne:</div>
              <p class="rationale-text">${inst.rationale}</p>
            </div>

            <div class="inst-footer">
              <span class="inst-code">Kod protokolu: HMS-PR-${inst.id.toUpperCase()}</span>
              <button class="btn btn-outline btn-sm confirm-read-btn" data-id="${inst.id}">Potwierdz zaznajomienie</button>
            </div>
          </div>
        `;
      });
    } else {
      cardsHtml = '<div class="empty-state-box">Brak procedur spelniajacych kryteria wyszukiwania.</div>';
    }

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Baza Instrukcji i Profilaktyki Kosmicznej</h1>
          <p class="view-subtitle">Obowiazujace standardy medyczne, schematy postepowania oraz profilaktyka zmian w mikrograwitacji</p>
        </div>
        <div class="badge-tag">Wersja protokołu 4.2</div>
      </div>

      <div class="filter-bar-card">
        <div class="search-box-wrap">
          <input type="text" id="instruction-search" class="search-input" placeholder="Szukaj procedury lub objawu..." value="${searchQuery}" />
        </div>
        <div class="categories-row">
          ${categoryPillsHtml}
        </div>
      </div>

      <div class="instructions-grid">
        ${cardsHtml}
      </div>
    `;

    // Nasluch filtrow
    mainEl.querySelectorAll('.filter-pill').forEach(function(btn) {
      btn.addEventListener('click', function() {
        filterCategory = btn.getAttribute('data-cat');
        renderInstrukcje();
      });
    });

    const searchInput = document.getElementById('instruction-search');
    if (searchInput) {
      searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value.trim();
        renderInstrukcje();
      });
    }

    mainEl.querySelectorAll('.confirm-read-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        btn.textContent = 'Zaznajomienie potwierdzone';
        btn.disabled = true;
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
      });
    });
  }

  // WIDOK 4: Modul Motywacji
  function renderMotywacja() {
    const mainEl = document.getElementById('app-main');
    const mot = appState.motivation;

    let milestonesHtml = '';
    mot.teamMilestones.forEach(function(m) {
      milestonesHtml += `
        <div class="milestone-item ${m.achieved ? 'milestone-achieved' : 'milestone-pending'}">
          <div class="milestone-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              ${m.achieved ? '<circle cx="10" cy="10" r="8" fill="#10b981"/><path d="M6 10 L9 13 L14 7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' : '<circle cx="10" cy="10" r="8" stroke="#88a0b8" stroke-width="2" stroke-dasharray="3,3"/>'}
            </svg>
          </div>
          <div class="milestone-content">
            <div class="milestone-title-row">
              <span class="milestone-title">${m.title}</span>
              <span class="milestone-date">${m.date}</span>
            </div>
            <p class="milestone-desc">${m.description}</p>
          </div>
        </div>
      `;
    });

    let quotesHtml = '';
    mot.quotes.forEach(function(q) {
      quotesHtml += `
        <div class="quote-card">
          <p class="quote-text">"${q.text}"</p>
          <div class="quote-author">${q.author}</div>
        </div>
      `;
    });

    const progressPercent = Math.round((mot.missionDay / mot.totalPlannedDays) * 100);

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Modul Motywacji i Dobrostanu Psychicznego</h1>
          <p class="view-subtitle">Wsparcie odpornosci psychicznej, cele misji oraz techniki redukcji stresu w warunkach izolacji orbitalnej</p>
        </div>
        <div class="role-indicator-badge">Modul dostepny dla wszystkich</div>
      </div>

      <div class="mission-progress-banner">
        <div class="progress-info-col">
          <span class="banner-sub-label">Postep misji orbitalnej:</span>
          <h2 class="banner-main-title">${mot.missionName}</h2>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="progress-labels-row">
            <span>Dzien ${mot.missionDay}</span>
            <span>Plan: ${mot.totalPlannedDays} dni</span>
          </div>
        </div>
        <div class="safe-days-col">
          <span class="safe-days-count">${mot.safeDaysWithoutIncident}</span>
          <span class="safe-days-title">Dni bez incydentu</span>
          <span class="safe-days-sub">Wzorowa dyscyplina zalogi</span>
        </div>
      </div>

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="card-section">
            <div class="section-title-bar">
              <h2>Osiagniecia i kamienie milowe zespolu</h2>
              <span class="badge-tag">Cele misji</span>
            </div>
            <div class="milestones-list">
              ${milestonesHtml}
            </div>
          </div>

          <div class="card-section">
            <div class="section-title-bar">
              <h2>Komunikaty wsparcia z Ziemi</h2>
              <span class="badge-tag">Lacznosc telemedyczna</span>
            </div>
            <div class="quotes-grid">
              ${quotesHtml}
            </div>
          </div>
        </div>

        <div class="split-column-side">
          <div class="side-panel-card breathing-card">
            <h3>Technika Relaksacji Oddechowej</h3>
            <p class="panel-intro-text">Metoda regulacji ukladu autonomicznego i redukcji kortyzolu:</p>

            <div class="breathing-display-box">
              <div class="breathing-circle-outer" id="breath-circle">
                <div class="breathing-circle-inner">
                  <div class="breath-phase-name" id="breath-phase-text">Gotowosc</div>
                  <div class="breath-countdown" id="breath-timer-text">0</div>
                </div>
              </div>
              <div class="breath-instruction" id="breath-instruction-text">
                Nacisnij przycisk ponizej aby rozpoczac sesje
              </div>
            </div>

            <div class="breathing-controls">
              <button id="btn-toggle-breath" class="btn btn-primary btn-block">
                Rozpocznij cwiczenie
              </button>
            </div>
          </div>

          <div class="side-panel-card">
            <h3>Wskazowka psychologiczna dnia</h3>
            <div class="daily-tip-box" id="daily-tip-box">
              <p id="tip-text" class="tip-text">${mot.dailyTips[0]}</p>
            </div>
            <button id="btn-next-tip" class="btn btn-outline btn-block mt-2">
              Kolejna wskazowka
            </button>
          </div>
        </div>
      </div>
    `;

    // Nasluch cwiczen oddechowych
    const toggleBreathBtn = document.getElementById('btn-toggle-breath');
    if (toggleBreathBtn) {
      toggleBreathBtn.addEventListener('click', function() {
        if (breathingActive) {
          stopBreathingExercise();
          toggleBreathBtn.textContent = 'Rozpocznij cwiczenie';
          toggleBreathBtn.classList.remove('btn-danger');
          toggleBreathBtn.classList.add('btn-primary');
        } else {
          startBreathingExercise();
          toggleBreathBtn.textContent = 'Zatrzymaj cwiczenie';
          toggleBreathBtn.classList.remove('btn-primary');
          toggleBreathBtn.classList.add('btn-danger');
        }
      });
    }

    // Nasluch losowania wskazowki
    let tipIndex = 0;
    const nextTipBtn = document.getElementById('btn-next-tip');
    if (nextTipBtn) {
      nextTipBtn.addEventListener('click', function() {
        tipIndex = (tipIndex + 1) % mot.dailyTips.length;
        const tipTextEl = document.getElementById('tip-text');
        if (tipTextEl) {
          tipTextEl.textContent = mot.dailyTips[tipIndex];
        }
      });
    }
  }

  // Funkcje do cwiczenia oddechowego
  function startBreathingExercise() {
    breathingActive = true;
    breathingPhaseIndex = 0;
    breathingSecond = breathingPhases[0].duration;
    updateBreathingUi();

    if (breathingInterval) clearInterval(breathingInterval);
    breathingInterval = setInterval(function() {
      breathingSecond--;
      if (breathingSecond <= 0) {
        breathingPhaseIndex = (breathingPhaseIndex + 1) % breathingPhases.length;
        breathingSecond = breathingPhases[breathingPhaseIndex].duration;
      }
      updateBreathingUi();
    }, 1000);
  }

  function stopBreathingExercise() {
    breathingActive = false;
    if (breathingInterval) clearInterval(breathingInterval);
    breathingInterval = null;
    const phaseEl = document.getElementById('breath-phase-text');
    const timerEl = document.getElementById('breath-timer-text');
    const instrEl = document.getElementById('breath-instruction-text');
    const circleEl = document.getElementById('breath-circle');

    if (phaseEl) phaseEl.textContent = 'Gotowosc';
    if (timerEl) timerEl.textContent = '0';
    if (instrEl) instrEl.textContent = 'Nacisnij przycisk ponizej aby rozpoczac sesje';
    if (circleEl) circleEl.className = 'breathing-circle-outer';
  }

  function updateBreathingUi() {
    const phaseEl = document.getElementById('breath-phase-text');
    const timerEl = document.getElementById('breath-timer-text');
    const instrEl = document.getElementById('breath-instruction-text');
    const circleEl = document.getElementById('breath-circle');

    const cur = breathingPhases[breathingPhaseIndex];
    if (phaseEl) phaseEl.textContent = cur.name;
    if (timerEl) timerEl.textContent = breathingSecond;
    if (instrEl) instrEl.textContent = cur.instruction;

    if (circleEl) {
      if (breathingPhaseIndex === 0) {
        circleEl.className = 'breathing-circle-outer breath-expand';
      } else if (breathingPhaseIndex === 2) {
        circleEl.className = 'breathing-circle-outer breath-contract';
      } else {
        circleEl.className = 'breathing-circle-outer breath-hold';
      }
    }
  }

  // WIDOK 5: Dziennik Zdarzen Medycznych
  function renderDziennik() {
    const mainEl = document.getElementById('app-main');
    const commanderFlag = isCommander();

    let allOrders = [];
    appState.astronauts.forEach(function(a) {
      if (!commanderFlag && a.id !== appState.currentUser) return;
      if (a.orders) {
        a.orders.forEach(function(o) {
          allOrders.push({
            date: o.date,
            astroName: a.name,
            astroId: a.id,
            author: o.author,
            text: o.text,
            priority: o.priority
          });
        });
      }
    });

    let allChecks = [];
    appState.astronauts.forEach(function(a) {
      if (!commanderFlag && a.id !== appState.currentUser) return;
      if (a.dailyChecks) {
        a.dailyChecks.forEach(function(c) {
          allChecks.push({
            date: c.date,
            astroName: a.name,
            astroId: a.id,
            trainedAred: c.trainedAred,
            trainedT2: c.trainedT2,
            wellbeing: c.wellbeing
          });
        });
      }
    });

    let ordersRowsHtml = '';
    allOrders.forEach(function(o) {
      let badgeClass = 'badge-normal';
      if (o.priority === 'wysoki') badgeClass = 'badge-warning';
      if (o.priority === 'krytyczny') badgeClass = 'badge-critical';

      ordersRowsHtml += `
        <tr>
          <td><span class="mono-date">${o.date}</span></td>
          <td><strong>${o.astroName}</strong></td>
          <td>${o.author}</td>
          <td><span class="status-pill ${badgeClass}">${o.priority}</span></td>
          <td>${o.text}</td>
        </tr>
      `;
    });

    if (!ordersRowsHtml) {
      ordersRowsHtml = '<tr><td colspan="5" class="text-center text-muted">Brak wpisow w rejestrze zalecen medycznych.</td></tr>';
    }

    let checksRowsHtml = '';
    allChecks.forEach(function(c) {
      checksRowsHtml += `
        <tr>
          <td><span class="mono-date">${c.date}</span></td>
          <td><strong>${c.astroName}</strong></td>
          <td><span class="task-badge ${c.trainedAred ? 'task-done' : 'task-missed'}">${c.trainedAred ? 'Zrealizowano' : 'Brak'}</span></td>
          <td><span class="task-badge ${c.trainedT2 ? 'task-done' : 'task-missed'}">${c.trainedT2 ? 'Zrealizowano' : 'Brak'}</span></td>
          <td>${c.wellbeing}</td>
        </tr>
      `;
    });

    if (!checksRowsHtml) {
      checksRowsHtml = '<tr><td colspan="5" class="text-center text-muted">Brak wpisow w rejestrze zgloszen dziennych.</td></tr>';
    }

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Dziennik Zdarzen i Raportow Medycznych</h1>
          <p class="view-subtitle">${commanderFlag ? 'Rejestr wszystkich dyspozycji lekarskich oraz zgloszen statusu calej zalogi' : 'Rejestr Twoich zgloszen zdrowotnych oraz otrzymanych dyspozycji'}</p>
        </div>
      </div>

      <div class="card-section mb-4">
        <div class="section-title-bar">
          <h2>Wydane dyspozycje i zalecenia lekarskie</h2>
          <span class="badge-tag">Historia ordynacji</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Astronauta</th>
                <th>Wystawiajacy</th>
                <th>Priorytet</th>
                <th>Tresc zalecenia</th>
              </tr>
            </thead>
            <tbody>
              ${ordersRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card-section">
        <div class="section-title-bar">
          <h2>Zgloszenia samopoczucia i realizacji treningow</h2>
          <span class="badge-tag">Karty dzienne</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Astronauta</th>
                <th>Trening ARED</th>
                <th>Bieznia T2</th>
                <th>Zgloszone samopoczucie</th>
              </tr>
            </thead>
            <tbody>
              ${checksRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Modal wydawania zalecenia medycznego przez kierownika
  function openOrderModal(astroId) {
    const astro = getAstronautById(astroId);
    if (!astro) return;

    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.id = 'order-modal-backdrop';

    modalBackdrop.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Wydaj zalecenie medyczne</h3>
          <button class="modal-close-btn" id="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-patient-info">
            <span class="patient-label">Pacjent:</span>
            <strong>${astro.name}</strong>
            ${astro.role ? `<span class="patient-role">${astro.role}</span>` : ''}
          </div>

          <form id="order-submit-form" class="form-vertical">
            <div class="form-group">
              <label for="order-priority" class="form-label">Priorytet zalecenia:</label>
              <select id="order-priority" class="form-input">
                <option value="standard">Standardowy</option>
                <option value="wysoki">Wysoki</option>
                <option value="krytyczny">Krytyczny</option>
              </select>
            </div>

            <div class="form-group">
              <label for="order-text" class="form-label">Tresc zalecenia medycznego:</label>
              <textarea id="order-text" class="form-textarea" rows="4" placeholder="Wpisz dokladne polecenie, zmiane treningu lub dawkowanie lekow" required></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" id="modal-cancel-btn">Anuluj</button>
              <button type="submit" class="btn btn-primary">Zatwierdz i przeslij</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    function closeModal() {
      const el = document.getElementById('order-modal-backdrop');
      if (el) el.remove();
    }

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', function(e) {
      if (e.target === modalBackdrop) closeModal();
    });

    document.getElementById('order-submit-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const priority = document.getElementById('order-priority').value;
      const text = document.getElementById('order-text').value.trim();

      if (!text) return;

      const newOrder = {
        id: 'ord-' + Date.now(),
        date: '2026-11-14',
        author: getCurrentUser().name,
        text: text,
        priority: priority
      };

      if (!astro.orders) astro.orders = [];
      astro.orders.unshift(newOrder);
      saveState(appState);

      closeModal();
      renderApp();
    });

    enforceConstraints(modalBackdrop);
  }

  // WIDOK 6: Ustawienia i zarzadzanie zaloga
  function renderUstawienia() {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;

    const commanderFlag = isCommander();
    const isRealMode = appState.mode !== 'demo';

    let usersRowsHtml = '';
    appState.users.forEach(function(u) {
      const isCurrent = u.id === appState.currentUser;
      const astro = getAstronautById(u.id);
      const statusLabel = astro ? astro.statusLabel : 'Personel bazy';
      let statusClass = 'badge-normal';
      if (astro && astro.overallStatus === 'warning') statusClass = 'badge-warning';
      if (astro && astro.overallStatus === 'critical') statusClass = 'badge-critical';

      usersRowsHtml += `
        <tr>
          <td><span class="user-avatar-small">${u.avatarCode}</span></td>
          <td><strong>${u.name}</strong> ${isCurrent ? '<span class="chip-current">Ty</span>' : ''}</td>
          <td>${u.role || '-'}</td>
          <td><code class="mono-code">${u.login}</code></td>
          <td><code class="mono-code">${u.password}</code></td>
          <td><span class="badge-tag">${u.accessLevel}</span></td>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="table-actions">
              ${astro ? `<button class="btn btn-outline btn-sm quick-log-vital-btn" data-id="${astro.id}">Wprowadz odczyt</button>` : ''}
              ${!isCurrent && commanderFlag ? `<button class="btn btn-danger btn-sm delete-user-btn" data-id="${u.id}">Usun</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    if (!usersRowsHtml) {
      usersRowsHtml = '<tr><td colspan="8" class="text-center text-muted">Brak zarejestrowanych kont uzytkownikow.</td></tr>';
    }

    let astroSelectOptions = '';
    appState.astronauts.forEach(function(a) {
      astroSelectOptions += `<option value="${a.id}">${a.name}${a.role ? ' : ' + a.role : ''}</option>`;
    });

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Ustawienia i Konfiguracja Systemu HMS-of-A</h1>
          <p class="view-subtitle">Zarzadzanie trybem dzialania, baza zalogi, kontami dostepowymi oraz danymi telemetrycznymi</p>
        </div>
        <div class="role-indicator-badge">
          ${isRealMode ? 'Tryb operacyjny: Realne dzialanie' : 'Tryb operacyjny: Demonstracja'}
        </div>
      </div>

      <!-- SEKCJA 1: Wybor trybu pracy -->
      <div class="card-section mb-4">
        <div class="section-title-bar">
          <h2>Tryb dzialania systemu</h2>
          <span class="badge-tag">Konfiguracja srodowiska</span>
        </div>
        <p class="settings-desc-text">Wybierz pomiedzy trybem rzeczywistym a trybem demonstracyjnym. W trybie rzeczywistym operujesz na wlasnej zalodze i biezacych pomiarach.</p>

        <div class="mode-cards-grid">
          <div class="mode-option-card ${isRealMode ? 'active' : ''}" id="mode-card-real">
            <div class="mode-card-top">
              <span class="mode-radio-visual ${isRealMode ? 'checked' : ''}"></span>
              <h3 class="mode-card-title">Tryb rzeczywisty operacji</h3>
            </div>
            <p class="mode-card-desc">Pelne srodowisko do monitorowania realnych astronautow. Wszelkie odczyty, zalecenia lekarskie oraz meldunki treningowe sa rejestrowane w bazie danych stacji.</p>
            <div class="mode-card-footer">
              <span class="mode-status-text">${isRealMode ? 'Aktywne srodowisko' : 'Kliknij aby aktywowac'}</span>
            </div>
          </div>

          <div class="mode-option-card ${!isRealMode ? 'active' : ''}" id="mode-card-demo">
            <div class="mode-card-top">
              <span class="mode-radio-visual ${!isRealMode ? 'checked' : ''}"></span>
              <h3 class="mode-card-title">Tryb demonstracyjny misji</h3>
            </div>
            <p class="mode-card-desc">Srodowisko prezentacyjne z przygotowana zaloga testowa, zdefiniowanymi odchyleniami biometrycznymi oraz historia telemetrii do celow pokazowych.</p>
            <div class="mode-card-footer">
              <span class="mode-status-text">${!isRealMode ? 'Aktywne srodowisko' : 'Kliknij aby aktywowac'}</span>
            </div>
          </div>
        </div>

        <div class="mode-actions-bar">
          <button id="btn-reset-demo" class="btn btn-outline btn-sm">
            Zasil baze fabrycznym zestawem demo
          </button>
          ${commanderFlag ? `
            <button id="btn-clear-mission" class="btn btn-danger btn-sm">
              Wyczysc baze do nowej misji rzeczywistej
            </button>
          ` : ''}
        </div>
      </div>

      <!-- SEKCJA 2: Zarzadzanie zaloga i kontami -->
      <div class="card-section mb-4">
        <div class="section-title-bar">
          <h2>Zarzadzanie zaloga i kontami uzytkownikow</h2>
          ${commanderFlag ? `
            <button id="btn-open-add-astro" class="btn btn-primary btn-sm">
              Dodaj nowego czlonka zalogi
            </button>
          ` : ''}
        </div>
        <p class="settings-desc-text">Rejestr aktywnych kont dostepowych oraz powiazanych profili medycznych astronautow.</p>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Imie i nazwisko</th>
                <th>Rola w misji</th>
                <th>Login</th>
                <th>Haslo</th>
                <th>Poziom konta</th>
                <th>Stan medyczny</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              ${usersRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SEKCJA 3: Wprowadzanie biezacego odczytu telemetrycznego -->
      <div class="card-section" id="section-telemetry-entry">
        <div class="section-title-bar">
          <h2>Wprowadzanie nowego odczytu telemetrycznego</h2>
          <span class="badge-tag">Telemetria biezaca</span>
        </div>
        ${appState.astronauts.length > 0 ? `
        <p class="settings-desc-text">Wprowadz nowe odczyty aparatury biometrycznej. Wartosci zaktualizuja wskazniki biezace oraz wykresy trendow.</p>

        <form id="telemetry-input-form" class="telemetry-entry-form">
          <div class="form-grid-3">
            <div class="form-group">
              <label for="entry-astro-select" class="form-label">Astronauta:</label>
              <select id="entry-astro-select" class="form-input">
                ${astroSelectOptions}
              </select>
            </div>

            <div class="form-group">
              <label for="entry-hr" class="form-label">Tetno: bpm</label>
              <input type="number" id="entry-hr" class="form-input" min="40" max="220" value="72" required />
            </div>

            <div class="form-group">
              <label for="entry-bp-sys" class="form-label">Cisnienie skurczowe: mmHg</label>
              <input type="number" id="entry-bp-sys" class="form-input" min="70" max="220" value="120" required />
            </div>

            <div class="form-group">
              <label for="entry-bp-dia" class="form-label">Cisnienie rozkurczowe: mmHg</label>
              <input type="number" id="entry-bp-dia" class="form-input" min="40" max="140" value="80" required />
            </div>

            <div class="form-group">
              <label for="entry-spo2" class="form-label">Saturacja SpO2: procent</label>
              <input type="number" id="entry-spo2" class="form-input" min="70" max="100" value="99" required />
            </div>

            <div class="form-group">
              <label for="entry-temp" class="form-label">Temperatura: stopni Celsjusza</label>
              <input type="number" id="entry-temp" class="form-input" min="34.0" max="42.0" step="0.1" value="36.6" required />
            </div>

            <div class="form-group">
              <label for="entry-resp" class="form-label">Oddechy na minute:</label>
              <input type="number" id="entry-resp" class="form-input" min="8" max="40" value="14" required />
            </div>

            <div class="form-group">
              <label for="entry-rad" class="form-label">Skumulowana radiacja: mSv</label>
              <input type="number" id="entry-rad" class="form-input" min="0" max="200" step="0.1" value="14.5" required />
            </div>

            <div class="form-group">
              <label for="entry-stress" class="form-label">Poziom stresu: procent</label>
              <input type="number" id="entry-stress" class="form-input" min="0" max="100" value="25" required />
            </div>

            <div class="form-group">
              <label for="entry-bone" class="form-label">Gestosc kosci: procent normy</label>
              <input type="number" id="entry-bone" class="form-input" min="50" max="120" value="97" required />
            </div>

            <div class="form-group">
              <label for="entry-muscle" class="form-label">Masa miesniowa: procent normy</label>
              <input type="number" id="entry-muscle" class="form-input" min="50" max="120" value="98" required />
            </div>

            <div class="form-group">
              <label for="entry-status" class="form-label">Ocena ogolna stanu:</label>
              <select id="entry-status" class="form-input">
                <option value="normal">Stan stabilny</option>
                <option value="warning">Wymagana obserwacja</option>
                <option value="critical">Podwyzszone ryzyko</option>
              </select>
            </div>
          </div>

          <div class="form-actions-row">
            <button type="submit" class="btn btn-primary">
              Zapisz pomiar telemetryczny do bazy
            </button>
            <span id="telemetry-save-feedback" class="feedback-inline" style="display: none;">Pomiar zostal pomyslnie zarejestrowany.</span>
          </div>
        </form>
        ` : `
        <div class="empty-state-box">
          Brak zdefiniowanych astronautow w biezacej misji. Skorzystaj z przycisku Dodaj nowego czlonka zalogi powyzej, aby utworzyc profil i moc rejestrowac dane biometryczne.
        </div>
        `}
      </div>
    `;

    // Nasluch zmiany trybu na rzeczywisty
    const cardReal = document.getElementById('mode-card-real');
    if (cardReal) {
      cardReal.addEventListener('click', function() {
        if (appState.mode !== 'real') {
          appState.demoUsers = JSON.parse(JSON.stringify(appState.users));
          appState.demoAstronauts = JSON.parse(JSON.stringify(appState.astronauts));
          appState.mode = 'real';
          appState.users = JSON.parse(JSON.stringify(appState.realUsers || [DEMO_USERS[0]]));
          appState.astronauts = JSON.parse(JSON.stringify(appState.realAstronauts || []));
          if (!appState.users.some(function(u) { return u.id === appState.currentUser; })) {
            appState.currentUser = null;
          }
          if (window.location.protocol.indexOf('http') === 0) {
            fetch('/api/mode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: 'real' })
            }).catch(function() {});
          }
          saveState(appState);
          renderApp();
        }
      });
    }

    // Nasluch zmiany trybu na demo
    const cardDemo = document.getElementById('mode-card-demo');
    if (cardDemo) {
      cardDemo.addEventListener('click', function() {
        if (appState.mode !== 'demo') {
          appState.realUsers = JSON.parse(JSON.stringify(appState.users));
          appState.realAstronauts = JSON.parse(JSON.stringify(appState.astronauts));
          appState.mode = 'demo';
          appState.users = JSON.parse(JSON.stringify(appState.demoUsers || DEMO_USERS));
          appState.astronauts = JSON.parse(JSON.stringify(appState.demoAstronauts || DEMO_ASTRONAUTS));
          if (!appState.users.some(function(u) { return u.id === appState.currentUser; })) {
            appState.currentUser = null;
          }
          if (window.location.protocol.indexOf('http') === 0) {
            fetch('/api/mode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: 'demo' })
            }).catch(function() {});
          }
          saveState(appState);
          renderApp();
        }
      });
    }

    // Nasluch przywrocenia danych demo
    const resetDemoBtn = document.getElementById('btn-reset-demo');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', function() {
        const confirmed = window.confirm('Czy chcesz przywrocic fabryczne dane demonstracyjne? Aktywuje to tryb demonstracyjny z zaloga testowa.');
        if (confirmed) {
          appState.mode = 'demo';
          appState.demoUsers = JSON.parse(JSON.stringify(DEMO_USERS));
          appState.demoAstronauts = JSON.parse(JSON.stringify(DEMO_ASTRONAUTS));
          appState.users = JSON.parse(JSON.stringify(DEMO_USERS));
          appState.astronauts = JSON.parse(JSON.stringify(DEMO_ASTRONAUTS));
          appState.currentUser = null;
          saveState(appState);
          renderApp();
        }
      });
    }

    // Nasluch czyszczenia bazy do nowej misji
    const clearBtn = document.getElementById('btn-clear-mission');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        const confirmed = window.confirm('Czy chcesz wyczyscic baze do nowej misji rzeczywistej? Usunie to cala zaloge i pozostawi tylko konto kierownika.');
        if (confirmed) {
          const currentU = getCurrentUser();
          const kierownikUser = (currentU && currentU.id === 'kierownik') ? currentU : DEMO_USERS[0];
          appState.mode = 'real';
          appState.users = [JSON.parse(JSON.stringify(kierownikUser))];
          appState.astronauts = [];
          appState.realUsers = JSON.parse(JSON.stringify(appState.users));
          appState.realAstronauts = [];
          appState.currentUser = null;
          saveState(appState);
          renderApp();
        }
      });
    }

    // Nasluch otwarcia modala dodawania astronauty
    const openAddBtn = document.getElementById('btn-open-add-astro');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', function() {
        openAddAstronautModal();
      });
    }

    // Nasluch usuwania konta
    mainEl.querySelectorAll('.delete-user-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const uid = btn.getAttribute('data-id');
        const userToDelete = appState.users.find(function(u) { return u.id === uid; });
        const name = userToDelete ? userToDelete.name : uid;
        const confirmed = window.confirm('Czy na pewno chcesz usunac konto ' + name + ' oraz powiazana telemetrie?');
        if (confirmed) {
          appState.users = appState.users.filter(function(u) { return u.id !== uid; });
          appState.astronauts = appState.astronauts.filter(function(a) { return a.id !== uid; });
          saveState(appState);
          renderUstawienia();
        }
      });
    });

    // Nasluch szybkiego wpisu odczytu
    mainEl.querySelectorAll('.quick-log-vital-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const aid = btn.getAttribute('data-id');
        const selectEl = document.getElementById('entry-astro-select');
        const sectionEl = document.getElementById('section-telemetry-entry');
        if (selectEl) {
          selectEl.value = aid;
          selectEl.dispatchEvent(new Event('change'));
        }
        if (sectionEl) {
          sectionEl.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Zmiana astronauty w formularzu wypelnia aktualnymi danymi
    const astroSelectEl = document.getElementById('entry-astro-select');
    if (astroSelectEl) {
      astroSelectEl.addEventListener('change', function() {
        const selectedId = astroSelectEl.value;
        const targetAstro = getAstronautById(selectedId);
        if (targetAstro) {
          const v = targetAstro.vitals;
          document.getElementById('entry-hr').value = v.hr;
          document.getElementById('entry-bp-sys').value = v.bpSys;
          document.getElementById('entry-bp-dia').value = v.bpDia;
          document.getElementById('entry-spo2').value = v.spo2;
          document.getElementById('entry-temp').value = v.temp;
          document.getElementById('entry-resp').value = v.resp;
          document.getElementById('entry-rad').value = v.radDose;
          document.getElementById('entry-stress').value = v.stressLevel;
          document.getElementById('entry-bone').value = v.boneDensity;
          document.getElementById('entry-muscle').value = v.muscleMass;
          document.getElementById('entry-status').value = targetAstro.overallStatus;
        }
      });
    }

    // Nasluch formularza zapisu telemetrii
    const telemetryForm = document.getElementById('telemetry-input-form');
    if (telemetryForm) {
      telemetryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const targetId = document.getElementById('entry-astro-select').value;
        const targetAstro = getAstronautById(targetId);
        if (!targetAstro) return;

        const hr = parseInt(document.getElementById('entry-hr').value, 10);
        const bpSys = parseInt(document.getElementById('entry-bp-sys').value, 10);
        const bpDia = parseInt(document.getElementById('entry-bp-dia').value, 10);
        const spo2 = parseInt(document.getElementById('entry-spo2').value, 10);
        const temp = parseFloat(document.getElementById('entry-temp').value);
        const resp = parseInt(document.getElementById('entry-resp').value, 10);
        const rad = parseFloat(document.getElementById('entry-rad').value);
        const stress = parseInt(document.getElementById('entry-stress').value, 10);
        const bone = parseInt(document.getElementById('entry-bone').value, 10);
        const muscle = parseInt(document.getElementById('entry-muscle').value, 10);
        const status = document.getElementById('entry-status').value;

        // Aktualizacja vitals
        targetAstro.vitals.hr = hr;
        targetAstro.vitals.bpSys = bpSys;
        targetAstro.vitals.bpDia = bpDia;
        targetAstro.vitals.spo2 = spo2;
        targetAstro.vitals.temp = temp;
        targetAstro.vitals.resp = resp;
        targetAstro.vitals.radDose = rad;
        targetAstro.vitals.stressLevel = stress;
        targetAstro.vitals.boneDensity = bone;
        targetAstro.vitals.muscleMass = muscle;

        targetAstro.overallStatus = status;
        if (status === 'normal') {
          targetAstro.statusLabel = 'Stan stabilny';
          targetAstro.statusDescription = 'Wszystkie biometryczne wskazniki pozostaja w zdefiniowanym korytarzu bezpieczenstwa.';
        } else if (status === 'warning') {
          targetAstro.statusLabel = 'Wymagana obserwacja';
          targetAstro.statusDescription = 'Zanotowano odchylenie parametrow fizjologicznych od normy bazowej.';
        } else {
          targetAstro.statusLabel = 'Podwyzszone ryzyko';
          targetAstro.statusDescription = 'Wskazniki wymagaja natychmiastowej uwagi personelu medycznego misji.';
        }

        // Dodanie punktu do historii
        const historyLen = targetAstro.telemetryHistory.length;
        const newDayLabel = 'Dzien ' + (184 + historyLen);
        targetAstro.telemetryHistory.push({
          day: newDayLabel,
          hr: hr,
          bpSys: bpSys,
          spo2: spo2,
          stress: stress,
          rad: rad
        });

        saveState(appState);

        const feedback = document.getElementById('telemetry-save-feedback');
        if (feedback) {
          feedback.style.display = 'inline-block';
          setTimeout(function() { feedback.style.display = 'none'; }, 3500);
        }
      });
    }
  }

  // Modal tworzenia nowego astronauty i konta
  function openAddAstronautModal() {
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.id = 'add-astro-modal-backdrop';

    modalBackdrop.innerHTML = `
      <div class="modal-dialog modal-dialog-lg">
        <div class="modal-header">
          <h3 class="modal-title">Dodaj nowego czlonka zalogi i konto</h3>
          <button class="modal-close-btn" id="add-modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form id="new-astronaut-form" class="form-vertical">
            <div class="form-grid-2">
              <div class="form-group">
                <label for="new-astro-name" class="form-label">Imie i nazwisko:</label>
                <input type="text" id="new-astro-name" class="form-input" placeholder="Wpisz imie i nazwisko" required />
              </div>

              <div class="form-group">
                <label for="new-astro-role" class="form-label">Rola pokladowa w misji:</label>
                <input type="text" id="new-astro-role" class="form-input" placeholder="Na przyklad: Inzynier systemow lacznosci" required />
              </div>

              <div class="form-group">
                <label for="new-astro-title" class="form-label">Tytul specjalistyczny:</label>
                <input type="text" id="new-astro-title" class="form-input" placeholder="Na przyklad: Operator radaru orbitalnego" required />
              </div>

              <div class="form-group">
                <label for="new-astro-type" class="form-label">Typ konta i uprawnienia:</label>
                <select id="new-astro-type" class="form-input">
                  <option value="astro">Konto astronauty : Pulpit osobisty</option>
                  <option value="kierownik">Konto kierownika : Nadzor zalogi</option>
                </select>
              </div>

              <div class="form-group">
                <label for="new-astro-login" class="form-label">Identyfikator logowania:</label>
                <input type="text" id="new-astro-login" class="form-input" placeholder="Wpisz login" required autocomplete="username" />
              </div>

              <div class="form-group">
                <label for="new-astro-pass" class="form-label">Haslo dostepowe:</label>
                <input type="password" id="new-astro-pass" class="form-input" placeholder="Wpisz haslo" required autocomplete="new-password" />
              </div>

              <div class="form-group">
                <label for="new-astro-age" class="form-label">Wiek w latach:</label>
                <input type="number" id="new-astro-age" class="form-input" min="20" max="75" value="35" required />
              </div>

              <div class="form-group">
                <label for="new-astro-blood" class="form-label">Grupa krwi:</label>
                <select id="new-astro-blood" class="form-input">
                  <option value="0 Rh plus">0 Rh plus</option>
                  <option value="0 Rh minus">0 Rh minus</option>
                  <option value="A Rh plus">A Rh plus</option>
                  <option value="A Rh minus">A Rh minus</option>
                  <option value="B Rh plus">B Rh plus</option>
                  <option value="B Rh minus">B Rh minus</option>
                  <option value="AB Rh plus">AB Rh plus</option>
                  <option value="AB Rh minus">AB Rh minus</option>
                </select>
              </div>
            </div>

            <div class="modal-section-sub">
              <h4>Poczatkowe parametry fizjologiczne</h4>
            </div>

            <div class="form-grid-3">
              <div class="form-group">
                <label for="new-astro-hr" class="form-label">Tetno: bpm</label>
                <input type="number" id="new-astro-hr" class="form-input" value="70" required />
              </div>

              <div class="form-group">
                <label for="new-astro-bp-sys" class="form-label">Cisnienie: skurczowe</label>
                <input type="number" id="new-astro-bp-sys" class="form-input" value="120" required />
              </div>

              <div class="form-group">
                <label for="new-astro-bp-dia" class="form-label">Cisnienie: rozkurczowe</label>
                <input type="number" id="new-astro-bp-dia" class="form-input" value="80" required />
              </div>

              <div class="form-group">
                <label for="new-astro-spo2" class="form-label">Saturacja SpO2: procent</label>
                <input type="number" id="new-astro-spo2" class="form-input" value="99" required />
              </div>

              <div class="form-group">
                <label for="new-astro-temp" class="form-label">Temperatura: st. C</label>
                <input type="number" id="new-astro-temp" class="form-input" step="0.1" value="36.6" required />
              </div>

              <div class="form-group">
                <label for="new-astro-resp" class="form-label">Oddechy na minute:</label>
                <input type="number" id="new-astro-resp" class="form-input" value="14" required />
              </div>
            </div>

            <div id="add-astro-error" class="login-error-box" style="display: none; margin-top: 10px;"></div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" id="add-modal-cancel-btn">Anuluj</button>
              <button type="submit" class="btn btn-primary">Utworz konto i dodaj do bazy</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    function closeModal() {
      const el = document.getElementById('add-astro-modal-backdrop');
      if (el) el.remove();
    }

    document.getElementById('add-modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('add-modal-cancel-btn').addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', function(e) {
      if (e.target === modalBackdrop) closeModal();
    });

    document.getElementById('new-astronaut-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const name = document.getElementById('new-astro-name').value.trim();
      const role = document.getElementById('new-astro-role').value.trim();
      const title = document.getElementById('new-astro-title').value.trim();
      const type = document.getElementById('new-astro-type').value;
      const login = document.getElementById('new-astro-login').value.trim();
      const pass = document.getElementById('new-astro-pass').value.trim();
      const age = parseInt(document.getElementById('new-astro-age').value, 10);
      const blood = document.getElementById('new-astro-blood').value;

      const errEl = document.getElementById('add-astro-error');

      // Sprawdzenie czy login juz istnieje
      const loginExists = appState.users.some(function(u) {
        return u.login.toLowerCase() === login.toLowerCase();
      });

      if (loginExists) {
        errEl.textContent = 'Blad: Podany identyfikator logowania jest juz zajety.';
        errEl.style.display = 'block';
        return;
      }

      const newId = (type === 'kierownik' ? 'kierownik-' : 'astro-') + Date.now();
      const initials = extractInitials(name);

      const newUser = {
        id: newId,
        login: login,
        password: pass,
        name: name,
        role: role,
        title: title,
        accessLevel: type === 'kierownik' ? 'Nadzor pelny' : 'Konto osobiste',
        avatarCode: initials
      };

      appState.users.push(newUser);

      if (type === 'astro') {
        const hr = parseInt(document.getElementById('new-astro-hr').value, 10) || 72;
        const bpSys = parseInt(document.getElementById('new-astro-bp-sys').value, 10) || 120;
        const bpDia = parseInt(document.getElementById('new-astro-bp-dia').value, 10) || 80;
        const spo2 = parseInt(document.getElementById('new-astro-spo2').value, 10) || 99;
        const temp = parseFloat(document.getElementById('new-astro-temp').value) || 36.6;
        const resp = parseInt(document.getElementById('new-astro-resp').value, 10) || 14;

        const newAstro = {
          id: newId,
          name: name,
          role: role,
          avatarCode: initials,
          age: age,
          bloodType: blood,
          missionDay: 184,
          evaHours: 0,
          overallStatus: 'normal',
          statusLabel: 'Stan stabilny',
          statusDescription: 'Nowo przyjety czlonek zalogi. Parametry bazowe wprowadzone do systemu.',
          vitals: {
            hr: hr,
            hrUnit: 'bpm',
            bpSys: bpSys,
            bpDia: bpDia,
            bpUnit: 'mmHg',
            spo2: spo2,
            spo2Unit: '%',
            temp: temp,
            tempUnit: 'st. C',
            resp: resp,
            respUnit: 'oddech/min',
            radDose: 0.5,
            radUnit: 'mSv',
            boneDensity: 100,
            boneUnit: '% normy',
            muscleMass: 100,
            muscleUnit: '% normy',
            hydration: 98,
            hydrationUnit: '%',
            sleepHours: 8.0,
            sleepUnit: 'godz.',
            stressLevel: 15,
            stressUnit: '%'
          },
          telemetryHistory: [
            { day: 'Dzien 184', hr: hr, bpSys: bpSys, spo2: spo2, stress: 15, rad: 0.5 }
          ],
          orders: [],
          dailyChecks: []
        };

        appState.astronauts.push(newAstro);
      }

      saveState(appState);
      closeModal();
      renderApp();
    });

    enforceConstraints(modalBackdrop);
  }

  // Glowny dispatcher renderowania
  function renderApp() {
    renderHeader();

    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;

    if (!isLoggedIn()) {
      renderLoginPanel(mainEl);
      enforceConstraints(document.body);
      return;
    }

    if (activeTab === 'pulpit') {
      renderPulpit();
    } else if (activeTab === 'telemetria') {
      renderTelemetria();
    } else if (activeTab === 'instrukcje') {
      renderInstrukcje();
    } else if (activeTab === 'motywacja') {
      renderMotywacja();
    } else if (activeTab === 'dziennik') {
      renderDziennik();
    } else if (activeTab === 'ustawienia') {
      renderUstawienia();
    }

    ensureLiveBar(mainEl);

    // Zapewnienie przestrzegania scislych wymogow: brak emotek, brak nawiasow, brak dlugich myslnikow
    enforceConstraints(document.body);
  }

  // Pasek biezacej transmisji telemetrycznej na zywo
  function renderLiveBarHtml() {
    const isRunning = TelemetryStream.getIsRunning();
    const packet = TelemetryStream.getPacketCount();
    const time = TelemetryStream.getLastTime();
    const scenario = TelemetryStream.getScenario();
    const intervalMs = TelemetryStream.getIntervalMs();
    const totalAstro = appState.astronauts.length;

    return `
      <div class="telemetry-live-bar" id="telemetry-live-bar">
        <div class="live-status-block">
          <span class="live-indicator-beacon ${isRunning ? 'active' : 'paused'}" id="live-beacon"></span>
          <span class="live-status-text" id="live-status-title">
            ${totalAstro > 0 ? (isRunning ? 'Transmisja biometryczna: Na zywo' : 'Transmisja biometryczna: Wstrzymana') : 'Transmisja: Oczekiwanie na personel'}
          </span>
          <span class="live-packet-tag" id="live-packet-badge">Pakiet #${packet}</span>
          <span class="live-time-tag" id="live-time-badge">Ostatni odczyt: ${time} UTC</span>
        </div>

        <div class="live-controls-block">
          <button id="btn-toggle-stream" class="btn btn-xs ${isRunning ? 'btn-outline' : 'btn-success'}">
            ${isRunning ? 'Wstrzymaj' : 'Wznow transmisje'}
          </button>

          <div class="live-scenario-select-wrap">
            <span class="live-control-label">Profil misji:</span>
            <select id="live-scenario-select" class="live-select-input">
              <option value="resting" ${scenario === 'resting' ? 'selected' : ''}>Spoczynek bazowy</option>
              <option value="training" ${scenario === 'training' ? 'selected' : ''}>Trening silowy ARED</option>
              <option value="eva" ${scenario === 'eva' ? 'selected' : ''}>Spacer kosmiczny EVA</option>
              <option value="anomaly" ${scenario === 'anomaly' ? 'selected' : ''}>Symulacja anomalii</option>
            </select>
          </div>

          <div class="live-rate-select-wrap">
            <span class="live-control-label">Odswiezanie:</span>
            <select id="live-rate-select" class="live-select-input">
              <option value="1000" ${intervalMs === 1000 ? 'selected' : ''}>1 sekunda</option>
              <option value="2500" ${intervalMs === 2500 ? 'selected' : ''}>2.5 sekundy</option>
              <option value="5000" ${intervalMs === 5000 ? 'selected' : ''}>5 sekund</option>
            </select>
          </div>

          <button id="btn-load-garmin" class="btn btn-xs btn-primary">
            Wgraj profil Garmin
          </button>
        </div>
      </div>
    `;
  }

  function ensureLiveBar(container) {
    if (!isLoggedIn()) return;
    let liveBarEl = document.getElementById('telemetry-live-bar');
    if (!liveBarEl) {
      const barWrapper = document.createElement('div');
      barWrapper.innerHTML = renderLiveBarHtml();
      liveBarEl = barWrapper.firstElementChild;
      container.insertBefore(liveBarEl, container.firstChild);
      bindLiveBarEvents();
    } else {
      updateLiveBarElements();
    }
  }

  function bindLiveBarEvents() {
    const toggleBtn = document.getElementById('btn-toggle-stream');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        const running = TelemetryStream.toggle(appState);
        toggleBtn.textContent = running ? 'Wstrzymaj' : 'Wznow transmisje';
        toggleBtn.className = 'btn btn-xs ' + (running ? 'btn-outline' : 'btn-success');
        const beacon = document.getElementById('live-beacon');
        if (beacon) {
          beacon.className = 'live-indicator-beacon ' + (running ? 'active' : 'paused');
        }
        const title = document.getElementById('live-status-title');
        if (title) {
          title.textContent = running ? 'Transmisja biometryczna: Na zywo' : 'Transmisja biometryczna: Wstrzymana';
        }
      });
    }

    const scSelect = document.getElementById('live-scenario-select');
    if (scSelect) {
      scSelect.addEventListener('change', function() {
        TelemetryStream.setScenario(scSelect.value, appState);
      });
    }

    const rateSelect = document.getElementById('live-rate-select');
    if (rateSelect) {
      rateSelect.addEventListener('change', function() {
        TelemetryStream.setRate(rateSelect.value, appState);
      });
    }

    const garminBtn = document.getElementById('btn-load-garmin');
    if (garminBtn) {
      garminBtn.addEventListener('click', function() {
        if (window.location.protocol.indexOf('http') === 0) {
          fetch('/api/garmin/import', { method: 'POST' })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data && data.success) {
                appState.astronauts.unshift(data.astronaut);
                appState.users.push({
                  id: data.astronaut.id,
                  login: 'garmin',
                  password: 'kosmos2026',
                  name: data.astronaut.name,
                  role: data.astronaut.role,
                  title: 'Operator sensora biometrycznego',
                  accessLevel: 'Konto osobiste',
                  avatarCode: data.astronaut.avatarCode
                });
                renderApp();
              }
            })
            .catch(function() {
              loadLocalGarmin();
            });
        } else {
          loadLocalGarmin();
        }
      });
    }

    function loadLocalGarmin() {
      const garminAstro = TelemetryStream.createGarminAstronaut();
      const exists = appState.astronauts.some(function(a) { return a.id === garminAstro.id || a.source === garminAstro.source; });
      if (!exists) {
        appState.astronauts.unshift(garminAstro);
        const garminUser = {
          id: garminAstro.id,
          login: 'garmin',
          password: 'kosmos2026',
          name: garminAstro.name,
          role: garminAstro.role,
          title: 'Operator sensora biometrycznego',
          accessLevel: 'Konto osobiste',
          avatarCode: garminAstro.avatarCode
        };
        appState.users.push(garminUser);
        if (appState.mode === 'real') {
          appState.realAstronauts = JSON.parse(JSON.stringify(appState.astronauts));
          appState.realUsers = JSON.parse(JSON.stringify(appState.users));
        } else {
          appState.demoAstronauts = JSON.parse(JSON.stringify(appState.astronauts));
          appState.demoUsers = JSON.parse(JSON.stringify(appState.users));
        }
        saveState(appState);
        renderApp();
      } else {
        window.alert('Profil aparatury Garmin zostal juz wczesniej zintegrowany z zaloga.');
      }
    }
  }

  function updateLiveBarElements() {
    const isRunning = TelemetryStream.getIsRunning();
    const packet = TelemetryStream.getPacketCount();
    const time = TelemetryStream.getLastTime();
    const totalAstro = appState.astronauts.length;

    const beacon = document.getElementById('live-beacon');
    if (beacon) {
      beacon.className = 'live-indicator-beacon ' + (isRunning ? 'active' : 'paused');
    }
    const title = document.getElementById('live-status-title');
    if (title) {
      title.textContent = totalAstro > 0 ? (isRunning ? 'Transmisja biometryczna: Na zywo' : 'Transmisja biometryczna: Wstrzymana') : 'Transmisja: Oczekiwanie na personel';
    }
    const badge = document.getElementById('live-packet-badge');
    if (badge) {
      badge.textContent = 'Pakiet #' + packet;
    }
    const timeEl = document.getElementById('live-time-badge');
    if (timeEl) {
      timeEl.textContent = 'Ostatni odczyt: ' + time + ' UTC';
    }
  }

  // Nasluch pakietow telemetrii na zywo
  TelemetryStream.onPacket(function(data) {
    updateLiveBarElements();

    if (activeTab === 'pulpit' && isCommander()) {
      const container = document.getElementById('app-main');
      if (!container) return;

      let normalCount = 0;
      let warningCount = 0;
      let criticalCount = 0;
      let totalHr = 0;
      let totalSpo2 = 0;
      let totalRad = 0;
      const totalAstro = appState.astronauts.length;

      appState.astronauts.forEach(function(a) {
        if (a.overallStatus === 'normal') normalCount++;
        else if (a.overallStatus === 'warning') warningCount++;
        else if (a.overallStatus === 'critical') criticalCount++;

        totalHr += a.vitals.hr;
        totalSpo2 += a.vitals.spo2;
        totalRad += a.vitals.radDose;

        const cardEl = container.querySelector('.astro-summary-card[data-astroid="' + a.id + '"]');
        if (cardEl) {
          let statusClass = 'card-normal';
          let statusBadgeClass = 'badge-normal';
          let flashClass = 'val-updated';
          if (a.overallStatus === 'warning') {
            statusClass = 'card-warning';
            statusBadgeClass = 'badge-warning';
            flashClass = 'val-updated-warning';
          } else if (a.overallStatus === 'critical') {
            statusClass = 'card-critical';
            statusBadgeClass = 'badge-critical';
            flashClass = 'val-updated-critical';
          }

          cardEl.className = 'astro-summary-card ' + statusClass;
          const badgeEl = cardEl.querySelector('.status-pill');
          if (badgeEl) {
            badgeEl.className = 'status-pill ' + statusBadgeClass;
            badgeEl.textContent = a.statusLabel;
          }
          const descEl = cardEl.querySelector('.astro-card-desc');
          if (descEl) {
            descEl.textContent = a.statusDescription;
          }

          const hrVal = cardEl.querySelector('.metric-val-hr');
          if (hrVal) {
            hrVal.innerHTML = '<span class="vital-heart-pulse"><svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>' + a.vitals.hr + ' ' + a.vitals.hrUnit;
            hrVal.classList.remove('val-updated', 'val-updated-warning', 'val-updated-critical');
            void hrVal.offsetWidth;
            hrVal.classList.add(flashClass);
          }

          const bpVal = cardEl.querySelector('.metric-val-bp');
          if (bpVal) {
            bpVal.textContent = a.vitals.bpSys + ' na ' + a.vitals.bpDia + ' ' + a.vitals.bpUnit;
            bpVal.classList.remove('val-updated');
            void bpVal.offsetWidth;
            bpVal.classList.add('val-updated');
          }

          const spo2Val = cardEl.querySelector('.metric-val-spo2');
          if (spo2Val) {
            spo2Val.textContent = a.vitals.spo2 + ' ' + a.vitals.spo2Unit;
            spo2Val.classList.remove('val-updated', 'val-updated-warning', 'val-updated-critical');
            void spo2Val.offsetWidth;
            spo2Val.classList.add(flashClass);
          }

          const radVal = cardEl.querySelector('.metric-val-rad');
          if (radVal) {
            radVal.textContent = a.vitals.radDose + ' ' + a.vitals.radUnit;
          }

          const stressVal = cardEl.querySelector('.metric-val-stress');
          if (stressVal) {
            stressVal.textContent = a.vitals.stressLevel + ' ' + a.vitals.stressUnit;
            stressVal.classList.remove('val-updated');
            void stressVal.offsetWidth;
            stressVal.classList.add('val-updated');
          }
        }
      });

      const statTotal = document.getElementById('stat-count-total');
      if (statTotal) statTotal.textContent = totalAstro;

      const statNormal = document.getElementById('stat-count-normal');
      if (statNormal) statNormal.textContent = normalCount;

      const statWarning = document.getElementById('stat-count-warning');
      if (statWarning) statWarning.textContent = warningCount;

      const statCritical = document.getElementById('stat-count-critical');
      if (statCritical) statCritical.textContent = criticalCount;

      const alertBox = document.getElementById('dashboard-alert-box');
      const alertText = document.getElementById('dashboard-alert-text');
      if (alertBox && alertText) {
        if (criticalCount > 0) {
          alertBox.className = 'alert-banner-box banner-critical';
          alertText.textContent = 'Zanotowano podwyzszone ryzyko kardiologiczne u czlonka zalogi. Zaleca sie bezzwloczne wdrozenie protokolu interwencji.';
        } else if (warningCount > 0) {
          alertBox.className = 'alert-banner-box banner-warning';
          alertText.textContent = 'Parametry biometryczne jednego z astronautow wymagaja wzmozonego monitorowania.';
        } else if (totalAstro === 0) {
          alertBox.className = 'alert-banner-box banner-info';
          alertText.textContent = 'Brak aktywnej zalogi w misji. Przejdz do zakladki Ustawienia aby dodac personel orbitalny.';
        } else {
          alertBox.className = 'alert-banner-box banner-info';
          alertText.textContent = 'Wszyscy monitorowani astronauci utrzymuja zadowalajaca rownowage fizjologiczna.';
        }
      }

      const avgHr = totalAstro > 0 ? Math.round(totalHr / totalAstro) : 0;
      const avgSpo2 = totalAstro > 0 ? Math.round(totalSpo2 / totalAstro) : 0;
      const avgRad = totalAstro > 0 ? Math.round((totalRad / totalAstro) * 10) / 10 : 0;

      const aggHrEl = document.getElementById('agg-val-hr');
      if (aggHrEl) aggHrEl.textContent = avgHr + ' bpm';

      const aggSpo2El = document.getElementById('agg-val-spo2');
      if (aggSpo2El) aggSpo2El.textContent = avgSpo2 + ' %';

      const aggRadEl = document.getElementById('agg-val-rad');
      if (aggRadEl) aggRadEl.textContent = avgRad + ' mSv';

      TelemetryCharts.renderCrewComparison('crew-hr-chart', appState.astronauts, 'hr', 'Tetno', 'bpm');
      TelemetryCharts.renderCrewComparison('crew-stress-chart', appState.astronauts, 'stressLevel', 'Poziom stresu', '%');
    }

    if (activeTab === 'telemetria') {
      const currentAstro = getAstronautById(selectedAstroId) || appState.astronauts[0];
      if (currentAstro && currentAstro.vitals) {
        const v = currentAstro.vitals;
        const hrEl = document.getElementById('tel-val-hr');
        if (hrEl) hrEl.textContent = v.hr + ' ' + v.hrUnit;

        const rrEl = document.getElementById('tel-val-rr');
        if (rrEl) rrEl.textContent = (v.rr || Math.round(60000 / v.hr));

        const hrvEl = document.getElementById('tel-val-hrv');
        if (hrvEl) hrvEl.textContent = (v.hrv || 64);

        const bpEl = document.getElementById('tel-val-bp');
        if (bpEl) bpEl.textContent = v.bpSys + ' / ' + v.bpDia + ' ' + v.bpUnit;

        const spo2El = document.getElementById('tel-val-spo2');
        if (spo2El) spo2El.textContent = v.spo2 + ' ' + v.spo2Unit;

        const tempEl = document.getElementById('tel-val-temp');
        if (tempEl) tempEl.textContent = v.temp + ' ' + v.tempUnit;

        const respEl = document.getElementById('tel-val-resp');
        if (respEl) respEl.textContent = v.resp + ' ' + v.respUnit;

        const stressEl = document.getElementById('tel-val-stress');
        if (stressEl) stressEl.textContent = v.stressLevel;

        const bbEl = document.getElementById('tel-val-bb');
        if (bbEl) bbEl.textContent = (v.bodyBattery || 82);

        const radEl = document.getElementById('tel-val-rad');
        if (radEl) radEl.textContent = v.radDose + ' ' + v.radUnit;

        const heroPill = document.getElementById('tel-hero-status-pill');
        if (heroPill) {
          heroPill.textContent = currentAstro.statusLabel;
          let pillClass = 'badge-normal';
          if (currentAstro.overallStatus === 'warning') pillClass = 'badge-warning';
          if (currentAstro.overallStatus === 'critical') pillClass = 'badge-critical';
          heroPill.className = 'status-pill ' + pillClass;
        }

        const heroDesc = document.getElementById('tel-hero-status-desc');
        if (heroDesc) {
          heroDesc.textContent = currentAstro.statusDescription;
        }

        const chartPoints = (currentAstro.liveTelemetry && currentAstro.liveTelemetry.length > 0)
          ? currentAstro.liveTelemetry
          : currentAstro.telemetryHistory;
        let metricLabel = 'Tetno';
        let unit = 'bpm';
        if (activeChartMetric === 'bpSys') { metricLabel = 'Cisnienie skurczowe'; unit = 'mmHg'; }
        else if (activeChartMetric === 'spo2') { metricLabel = 'Saturacja tlenowa'; unit = '%'; }
        else if (activeChartMetric === 'stressLevel') { metricLabel = 'Poziom stresu'; unit = '%'; }
        else if (activeChartMetric === 'radDose') { metricLabel = 'Skumulowana radiacja'; unit = 'mSv'; }

        TelemetryCharts.renderLineChart('astro-personal-chart', chartPoints, activeChartMetric, metricLabel, unit);

        TelemetryCharts.renderRadialGauge('gauge-bone', v.boneDensity, 100, 'Gestosc kosci', '%', '#00d4ff');
        TelemetryCharts.renderRadialGauge('gauge-muscle', v.muscleMass, 100, 'Masa miesniowa', '%', '#00d4ff');
        TelemetryCharts.renderRadialGauge('gauge-hydration', v.hydration, 100, 'Poziom nawodnienia', '%', '#00d4ff');
        TelemetryCharts.renderRadialGauge('gauge-stress', v.stressLevel, 100, 'Poziom obciazenia', '%', v.stressLevel > 70 ? '#ef4444' : '#f59e0b');
      }
    }

    if (data.packet % 10 === 0) {
      saveState(appState);
    }
  });

  // Start aplikacji po zaladowaniu DOM
  function initApp() {
    if (window.location.protocol.indexOf('http') === 0) {
      fetch('/api/state')
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP error');
          return res.json();
        })
        .then(function(serverState) {
          if (serverState) {
            if (serverState.mode) appState.mode = serverState.mode;
            if (serverState.astronauts) appState.astronauts = serverState.astronauts;
            if (serverState.users) appState.users = serverState.users;
            if (serverState.currentUser) appState.currentUser = serverState.currentUser;
          }
          renderApp();
          startUtcClock();
          TelemetryStream.start(appState);
        })
        .catch(function() {
          renderApp();
          startUtcClock();
          TelemetryStream.start(appState);
        });
    } else {
      renderApp();
      startUtcClock();
      TelemetryStream.start(appState);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
