// Glowny plik logiki aplikacji HMS-of-A
// Health Monitoring System of Astronauts
// Scisly zakaz uzywania emotek, nawiasow i dlugich myslnikow w interfejsie

(function() {
  'use strict';

  // Inicjalizacja stanu z localStorage lub danych poczatkowych
  const STORAGE_KEY = 'HMS_OF_A_STATE_V2';

  function loadState() {
    try {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Blad zapisu localStorage:', e);
    }
  }

  const appState = loadState();

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
            <div class="user-role-badge ${commanderFlag ? 'badge-commander' : 'badge-astro'}">${currentUser.role}</div>
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
        </nav>
      `;
    } else {
      userSectionHtml = `
        <div class="auth-status-chip">
          <span class="auth-dot-off"></span>
          <span>Wymagane logowanie</span>
        </div>
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

        <div class="header-center">
          <div class="badge-status">
            <span class="pulse-dot"></span>
            <span>Orbita: Dzien 184</span>
          </div>
          <div class="mission-clock">
            <span class="clock-label">Czas pokladowy UTC:</span>
            <span class="clock-time" id="live-utc-clock">12:00:00</span>
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
    let accountsListHtml = '';
    appState.users.forEach(function(u) {
      accountsListHtml += `
        <div class="sample-account-card">
          <div class="sample-card-head">
            <div class="sample-avatar">${u.avatarCode}</div>
            <div class="sample-info">
              <strong class="sample-name">${u.name}</strong>
              <span class="sample-role">${u.role}</span>
            </div>
            <span class="badge-tag">${u.accessLevel}</span>
          </div>
          <div class="sample-credentials-row">
            <div class="cred-item">
              <span class="cred-label">Login:</span>
              <code class="cred-val">${u.login}</code>
            </div>
            <div class="cred-item">
              <span class="cred-label">Haslo:</span>
              <code class="cred-val">${u.password}</code>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm btn-fill-cred" data-login="${u.login}" data-pass="${u.password}">
            Wypelnij formularz tym kontem
          </button>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo-box">
              <img src="assets/logo.svg" alt="Logo HMS-of-A" class="login-logo-img" />
            </div>
            <h1 class="login-title">HMS-of-A</h1>
            <p class="login-sub">Health Monitoring System of Astronauts</p>
            <p class="login-desc">Panel autoryzacji personelu medycznego oraz zalogi orbitalnej</p>
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

        <div class="sample-accounts-panel">
          <div class="sample-header">
            <h3>Wykaz przykladowych kont dostepowych</h3>
            <p class="sample-sub">Wybierz profil z ponizszej listy lub kliknij przycisk obok konta aby automatycznie wprowadzic dane</p>
          </div>
          <div class="sample-accounts-grid">
            ${accountsListHtml}
          </div>
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

    // Nasluch przyciskow automatycznego wypelnienia
    container.querySelectorAll('.btn-fill-cred').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const l = btn.getAttribute('data-login');
        const p = btn.getAttribute('data-pass');
        const loginInp = document.getElementById('input-login');
        const passInp = document.getElementById('input-password');
        if (loginInp && passInp) {
          loginInp.value = l;
          passInp.value = p;
          loginInp.focus();
        }
      });
    });
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

    const avgHr = Math.round(totalHr / totalAstro);
    const avgSpo2 = Math.round(totalSpo2 / totalAstro);
    const avgRad = Math.round((totalRad / totalAstro) * 10) / 10;

    let astronautsCardsHtml = '';
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

      astronautsCardsHtml += `
        <div class="astro-summary-card ${statusClass}" data-astroid="${a.id}">
          <div class="card-head">
            <div class="astro-avatar-box">${a.avatarCode}</div>
            <div class="astro-head-info">
              <h3 class="astro-card-name">${a.name}</h3>
              <p class="astro-card-role">${a.role}</p>
            </div>
            <span class="status-pill ${statusBadgeClass}">${a.statusLabel}</span>
          </div>

          <p class="astro-card-desc">${a.statusDescription}</p>

          <div class="metrics-grid">
            <div class="metric-item">
              <span class="m-label">Tetno:</span>
              <span class="m-val">${a.vitals.hr} ${a.vitals.hrUnit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Cisnienie:</span>
              <span class="m-val">${a.vitals.bpSys} na ${a.vitals.bpDia} ${a.vitals.bpUnit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">SpO2:</span>
              <span class="m-val">${a.vitals.spo2} ${a.vitals.spo2Unit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Dawka radiacji:</span>
              <span class="m-val">${a.vitals.radDose} ${a.vitals.radUnit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Masa miesniowa:</span>
              <span class="m-val">${a.vitals.muscleMass} ${a.vitals.muscleUnit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Poziom stresu:</span>
              <span class="m-val">${a.vitals.stressLevel} ${a.vitals.stressUnit}</span>
            </div>
          </div>

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

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Centrum Nadzoru Medycznego Misji</h1>
          <p class="view-subtitle">Podsumowanie biotelemetrii calej zalogi stacji orbitalnej Horyzont Jeden</p>
        </div>
        <div class="role-indicator-badge">
          Panel Glowny Kierownika Medycznego
        </div>
      </div>

      <div class="alert-banner-box ${criticalCount > 0 ? 'banner-critical' : 'banner-info'}">
        <div class="alert-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 L22 20 H2 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            <path d="M12 9 V13 M12 17 H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <div class="alert-text-wrap">
          <strong>Raport bieżący systemu nadzoru medycznego:</strong>
          <span>${criticalCount > 0 ? 'Zanotowano podwyzszone ryzyko kardiologiczne u astronauty Marek Vance. Zaleca sie bezzwloczne wdrozenie protokolu interwencji.' : 'Wszyscy astronauci utrzymuja zadowalajaca rownowage fizjologiczna.'}</span>
        </div>
      </div>

      <div class="stats-overview-grid">
        <div class="stat-box">
          <span class="stat-number">${totalAstro}</span>
          <span class="stat-title">Astronautow na orbicie</span>
          <span class="stat-sub">Sklad staly załogi</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-success">${normalCount}</span>
          <span class="stat-title">Stan w pelni stabilny</span>
          <span class="stat-sub">Zgodnosc z norma</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-warning">${warningCount}</span>
          <span class="stat-title">Wymaga wzmozonej obserwacji</span>
          <span class="stat-sub">Elena Rostowa</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-critical">${criticalCount}</span>
          <span class="stat-title">Podwyzszone ryzyko</span>
          <span class="stat-sub">Marek Vance</span>
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
                <span class="agg-val">${avgHr} bpm</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Srednia saturacja tlenowa:</span>
                <span class="agg-val">${avgSpo2} %</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Srednia dawka promieniowania:</span>
                <span class="agg-val">${avgRad} mSv</span>
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
            <div class="personal-role">${currentAstro.role}</div>
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
              <h3>Wytyczne i zalecenia lekarza misji</h3>
              <span class="badge-tag">dr Helena Wejman</span>
            </div>
            <div class="orders-list">
              ${ordersHtml}
            </div>
          </div>
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

  // WIDOK 2: Zaloga i Telemetria (dla Kierownika lub rozszerzony widok astronauty)
  function renderTelemetria() {
    const mainEl = document.getElementById('app-main');
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
            <div class="hero-role">${currentAstro.role} : ${currentAstro.title}</div>
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
            <span class="status-pill ${statusPillClass}">${currentAstro.statusLabel}</span>
            <p class="status-panel-note">${currentAstro.statusDescription}</p>
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
          <div class="vital-value-row"><span class="vital-val">${v.hr}</span><span class="vital-unit">${v.hrUnit}</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Cisnienie tetnicze</span></div>
          <div class="vital-value-row"><span class="vital-val">${v.bpSys} / ${v.bpDia}</span><span class="vital-unit">${v.bpUnit}</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Saturacja tlenowa SpO2</span></div>
          <div class="vital-value-row"><span class="vital-val">${v.spo2}</span><span class="vital-unit">${v.spo2Unit}</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Temperatura powloki</span></div>
          <div class="vital-value-row"><span class="vital-val">${v.temp}</span><span class="vital-unit">${v.tempUnit}</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Czestosc oddechowa</span></div>
          <div class="vital-value-row"><span class="vital-val">${v.resp}</span><span class="vital-unit">${v.respUnit}</span></div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Dawka pochlonieta</span></div>
          <div class="vital-value-row"><span class="vital-val">${v.radDose}</span><span class="vital-unit">${v.radUnit}</span></div>
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
            <span class="patient-role">${astro.role}</span>
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
    }

    // Zapewnienie przestrzegania scislych wymogow: brak emotek, brak nawiasow, brak dlugich myslnikow
    enforceConstraints(document.body);
  }

  // Start aplikacji po zaladowaniu DOM
  function initApp() {
    renderApp();
    startUtcClock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
