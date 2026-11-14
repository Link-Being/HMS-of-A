// Main application logic for HMS-of-A
// Health Monitoring System of Astronauts
// Strict rule: no emojis, no parentheses in UI strings, no long dashes

(function() {
  'use strict';

  // Initialize state from localStorage or initial data
  const STORAGE_KEY = 'HMS_OF_A_STATE_V13';

  function sanitizeCrewState(state) {
    if (!state) return state;
    const cleanUser = function(u) {
      if (!u) return;
      if (u.id === 'kierownik' || (u.name && u.name.indexOf('Marczak') !== -1)) {
        u.id = 'kierownik';
        u.name = 'Marek Marczak';
        u.role = 'Commander';
        u.title = '';
        u.accessLevel = 'Full oversight';
        u.avatarCode = 'MM';
        u.login = 'marczak';
        u.password = 'marczak2026';
      } else {
        u.role = '';
        u.title = '';
        u.accessLevel = 'Personal account';
        if (u.id === 'astro-3' || (u.name && u.name.indexOf('Mysior') !== -1)) {
          u.name = 'Krzysztof Mysior';
          u.avatarCode = 'KM';
          u.login = 'mysior';
          u.password = 'mysior3';
        }
      }
    };

    const cleanAstronaut = function(a) {
      if (!a) return;
      a.role = '';
      a.title = '';
      if (a.id === 'astro-3' || (a.name && a.name.indexOf('Mysior') !== -1)) {
        a.name = 'Krzysztof Mysior';
        a.avatarCode = 'KM';
      }
    };

    if (Array.isArray(state.users)) state.users.forEach(cleanUser);
    if (Array.isArray(state.demoUsers)) state.demoUsers.forEach(cleanUser);
    if (Array.isArray(state.realUsers)) state.realUsers.forEach(cleanUser);
    if (Array.isArray(state.astronauts)) state.astronauts.forEach(cleanAstronaut);
    if (Array.isArray(state.demoAstronauts)) state.demoAstronauts.forEach(cleanAstronaut);
    if (Array.isArray(state.realAstronauts)) state.realAstronauts.forEach(cleanAstronaut);

    return state;
  }

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
      localStorage.removeItem('HMS_OF_A_STATE_V9');
      localStorage.removeItem('HMS_OF_A_STATE_V10');
      localStorage.removeItem('HMS_OF_A_STATE_V11');
      localStorage.removeItem('HMS_OF_A_STATE_V12');

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return sanitizeCrewState(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('localStorage read error:', e);
    }
    return sanitizeCrewState(JSON.parse(JSON.stringify(INITIAL_DATA)));
  }

  function saveState(state) {
    try {
      sanitizeCrewState(state);
      if (state.mode === 'real') {
        state.realUsers = JSON.parse(JSON.stringify(state.users));
        state.realAstronauts = JSON.parse(JSON.stringify(state.astronauts));
      } else if (state.mode === 'demo') {
        state.demoUsers = JSON.parse(JSON.stringify(state.users));
        state.demoAstronauts = JSON.parse(JSON.stringify(state.astronauts));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('localStorage write error:', e);
    }
  }

  const appState = loadState();
  if (!appState.mode) {
    appState.mode = 'demo';
  }
  if (!appState.demoUsers || appState.demoUsers.length < 6) {
    appState.demoUsers = JSON.parse(JSON.stringify(DEMO_USERS));
  }
  if (!appState.demoAstronauts || appState.demoAstronauts.length < 5) {
    appState.demoAstronauts = JSON.parse(JSON.stringify(DEMO_ASTRONAUTS));
  }
  if (!appState.realUsers) {
    appState.realUsers = [JSON.parse(JSON.stringify(DEMO_USERS[0]))];
  }
  if (!appState.realAstronauts) {
    appState.realAstronauts = [];
  }

  // In demo mode ensure demo crew is active
  if (appState.mode === 'demo') {
    appState.users = JSON.parse(JSON.stringify(appState.demoUsers));
    appState.astronauts = JSON.parse(JSON.stringify(appState.demoAstronauts));
  } else if (appState.mode === 'real') {
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
  sanitizeCrewState(appState);

  function extractInitials(name) {
    if (!name) return 'AS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Active navigation tab and selected astronaut in inspector view
  let activeTab = 'pulpit';
  let selectedAstroId = 'astro-1';
  let activeChartMetric = 'hr';
  let filterCategory = 'all';
  let searchQuery = '';
  let motivationSubTab = 'pulpit';
  let motivationPeriod = '7d';

  function applyThemeMode(mode) {
    const resolved = mode === 'day' ? 'day' : 'night';
    appState.themeMode = resolved;
    if (document.body) {
      document.body.classList.toggle('theme-day', resolved === 'day');
    }
  }

  // Breathing exercise timer state
  let breathingInterval = null;
  let breathingPhaseIndex = 0;
  let breathingSecond = 0;
  let breathingActive = false;

  const breathingPhases = [
    { name: 'Inhale phase', duration: 4, instruction: 'Inhale steadily through your nose' },
    { name: 'Hold breath', duration: 4, instruction: 'Hold air gently in your lungs while staying calm' },
    { name: 'Exhale phase', duration: 4, instruction: 'Exhale slowly through your mouth' },
    { name: 'Rest phase', duration: 4, instruction: 'Relax chest muscles before the next breathing cycle' }
  ];

  // Utility helpers
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

  function priorityLabel(p) {
    if (p === 'krytyczny' || p === 'critical') return 'Critical';
    if (p === 'wysoki' || p === 'high') return 'High';
    return 'Standard';
  }

  // Sanitizer removing parentheses, emojis, and long dashes from rendered DOM
  function enforceConstraints(rootElement) {
    if (!rootElement) return;

    // Walk text nodes
    const walker = document.createTreeWalker(
      rootElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    const nodesToFix = [];
    while ((node = walker.nextNode())) {
      // Check whether text contains parentheses, long dashes, or emoji
      if (/[\(\)\u2013\u2014\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/.test(node.nodeValue)) {
        nodesToFix.push(node);
      }
    }

    nodesToFix.forEach(function(n) {
      let val = n.nodeValue;
      // Replace parentheses with safe separators
      val = val.replace(/\(/g, ' - ').replace(/\)/g, '');
      // Replace long dashes with short hyphens
      val = val.replace(/[\u2013\u2014]/g, ' - ');
      // Remove emojis
      val = val.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u27BF]/g, '');
      // Collapse multiple spaces
      val = val.replace(/\s+/g, ' ');
      n.nodeValue = val;
    });
  }

  // Render application header
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
          <button id="btn-logout" class="btn btn-outline btn-sm" aria-label="Sign out">
            Sign out
          </button>
        </div>
      `;

      navSectionHtml = `
        <nav class="main-nav" aria-label="Main navigation">
          <button class="nav-tab ${activeTab === 'pulpit' ? 'active' : ''}" data-tab="pulpit">
            Main Dashboard
          </button>
          <button class="nav-tab ${activeTab === 'telemetria' ? 'active' : ''}" data-tab="telemetria">
            ${commanderFlag ? 'Crew and Telemetry' : 'My Medical Data'}
          </button>
          <button class="nav-tab ${activeTab === 'instrukcje' ? 'active' : ''}" data-tab="instrukcje">
            Instructions and Prevention
          </button>
          <button class="nav-tab ${activeTab === 'harmonogram' ? 'active' : ''}" data-tab="harmonogram">
            Daily Schedule
          </button>
          <button class="nav-tab ${activeTab === 'motywacja' ? 'active' : ''}" data-tab="motywacja">
            Motivation Module
          </button>
          <button class="nav-tab ${activeTab === 'dziennik' ? 'active' : ''}" data-tab="dziennik">
            Event Log
          </button>
          <button class="nav-tab ${activeTab === 'ustawienia' ? 'active' : ''}" data-tab="ustawienia">
            Settings
          </button>
        </nav>
      `;
    }

    headerEl.innerHTML = `
      <div class="header-inner">
        <div class="brand-group">
          <div class="logo-box">
            <img src="assets/logo.svg" alt="HMS-of-A Logo" class="brand-logo-img" />
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

    // Logout button listener
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        appState.currentUser = null;
        saveState(appState);
        renderApp();
      });
    }

    // Navigation tab listeners
    const tabs = headerEl.querySelectorAll('.nav-tab');
    tabs.forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeTab = btn.getAttribute('data-tab');
        renderApp();
      });
    });
  }

  // VIEW 0: Login panel
  function renderLoginPanel(container) {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <div class="login-header">
            <div class="login-logo-box">
              <img src="assets/logo.svg" alt="HMS-of-A Logo" class="login-logo-img" />
            </div>
            <h1 class="login-title">HMS-of-A</h1>
            <p class="login-sub">Health Monitoring System of Astronauts</p>
            <p class="login-desc">Orbital station personnel authorization panel</p>
          </div>

          <form id="login-form" class="form-vertical">
            <div class="form-group">
              <label for="input-login" class="form-label">Login ID:</label>
              <input type="text" id="input-login" class="form-input" placeholder="Enter login" required autocomplete="username" />
            </div>

            <div class="form-group">
              <label for="input-password" class="form-label">Access password:</label>
              <input type="password" id="input-password" class="form-input" placeholder="Enter password" required autocomplete="current-password" />
            </div>

            <div id="login-error-msg" class="login-error-box" style="display: none;"></div>

            <button type="submit" class="btn btn-primary btn-block btn-lg">
              Sign in to telemetry system
            </button>
          </form>
        </div>
      </div>
    `;

    // Login form submit handler
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const loginVal = document.getElementById('input-login').value.trim();
        const passVal = document.getElementById('input-password').value.trim();
        const errBox = document.getElementById('login-error-msg');

        let foundUser = appState.users.find(function(u) {
          const matchLogin = u.login.toLowerCase() === loginVal.toLowerCase() || u.id.toLowerCase() === loginVal.toLowerCase();
          return matchLogin && u.password === passVal;
        });

        if (!foundUser) {
          const demoMatch = DEMO_USERS.find(function(u) {
            const matchLogin = u.login.toLowerCase() === loginVal.toLowerCase() || u.id.toLowerCase() === loginVal.toLowerCase();
            return matchLogin && u.password === passVal;
          });
          if (demoMatch) {
            foundUser = JSON.parse(JSON.stringify(demoMatch));
            appState.users.push(foundUser);
            const demoAstro = DEMO_ASTRONAUTS.find(function(a) { return a.id === demoMatch.id; });
            if (demoAstro && !appState.astronauts.some(function(a) { return a.id === demoAstro.id; })) {
              appState.astronauts.push(JSON.parse(JSON.stringify(demoAstro)));
            }
          }
        }

        if (foundUser) {
          appState.currentUser = foundUser.id;
          if (!isCommander()) {
            selectedAstroId = foundUser.id;
          }
          activeTab = 'pulpit';
          saveState(appState);
          renderApp();
        } else {
          errBox.textContent = 'Login error: Invalid user ID or access password.';
          errBox.style.display = 'block';
        }
      });
    }
  }

  // Live UTC clock
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

  function sanitizeModelText(txt) {
    if (txt === null || txt === undefined) return '';
    return String(txt)
      .replace(/[\(\)]/g, ' ')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function statusBadgeFor(st) {
    if (st === 'alarm' || st === 'critical') return 'badge-critical';
    if (st === 'uwaga' || st === 'warning') return 'badge-warning';
    return 'badge-normal';
  }

  function statusLabelFor(st) {
    if (st === 'alarm' || st === 'critical') return 'Elevated Risk';
    if (st === 'uwaga' || st === 'warning') return 'Observation Required';
    return 'Stable Condition';
  }

  function renderChecklistChipsHtml(astro) {
    const v = astro && astro.vitals ? astro.vitals : {};
    const obszary = astro && astro.modelSummary && astro.modelSummary.obszary ? astro.modelSummary.obszary : null;
    if (obszary) {
      const order = ['kardio', 'sen', 'stres', 'aktywnosc', 'biochemia', 'poznawcze', 'srodowisko'];
      return order.filter(function(k) { return obszary[k]; }).map(function(k) {
        const o = obszary[k];
        const st = o.status || 'norma';
        const isOk = st === 'norma';
        const label = st === 'alarm' ? 'Alarm' : (st === 'uwaga' ? 'Needs Attention' : 'Normal');
        const idxTxt = (o.indeks !== null && o.indeks !== undefined) ? (' ' + Math.round(o.indeks) + '/100') : '';
        return `
          <div class="system-check-chip ${isOk ? 'chip-ok' : 'chip-warn'}">
            <span class="system-check-dot"></span>
            <span>${sanitizeModelText(o.nazwa)}: ${label}${idxTxt}</span>
          </div>
        `;
      }).join('');
    }

    const hrOk = v.hr >= 50 && v.hr <= 80.5;
    const bpOk = v.bpSys <= 130 && v.bpDia <= 84;
    const spo2Ok = v.spo2 >= 96;
    const tempOk = v.temp >= 36.2 && v.temp <= 37.35;
    const respOk = v.resp >= 12 && v.resp <= 18.5;
    const stressOk = v.stressLevel <= 50;
    const checks = [
      { label: 'Cardiovascular and heart', ok: hrOk && bpOk && spo2Ok, text: (hrOk && bpOk && spo2Ok) ? 'Normal' : 'Needs Attention' },
      { label: 'Thermoregulation and breathing', ok: tempOk && respOk, text: (tempOk && respOk) ? 'Stable' : 'Verify' },
      { label: 'Load balance', ok: stressOk, text: stressOk ? 'Low stress' : 'Elevated load' },
      { label: 'Sleep and recovery', ok: (v.sleepHours || 7.5) >= 7.0, text: ((v.sleepHours || 7.5) >= 7.0) ? 'Normal' : 'Short' },
      { label: 'Sweat biochemistry', ok: (v.cortisol || 4.0) < 6.5 && (v.lactate || 1.6) < 2.5, text: ((v.cortisol || 4.0) < 6.5 && (v.lactate || 1.6) < 2.5) ? 'Normal' : 'Elevated' }
    ];
    return checks.map(function(c) {
      return `
        <div class="system-check-chip ${c.ok ? 'chip-ok' : 'chip-warn'}">
          <span class="system-check-dot"></span>
          <span>${c.label}: ${c.text}</span>
        </div>
      `;
    }).join('');
  }

  function renderModelSummaryInnerHtml(astro) {
    const m = astro && astro.modelSummary ? astro.modelSummary : null;
    if (!m) {
      return `
        <div class="model-report-box">
          <p class="model-report-line">Summarizing model is awaiting active Python server synchronization. Current reference thresholds are displayed in local mode.</p>
        </div>
      `;
    }

    const og = m.ogolny || {};
    const an = m.anomalia || {};
    const rap = m.raport || {};
    const devs = Array.isArray(m.odchylenia) ? m.odchylenia : [];
    const deviatedCount = devs.filter(function(d) { return d.odchylony; }).length;
    const ogStatus = og.status || 'norma';
    const anVal = (an.wynik !== null && an.wynik !== undefined) ? Math.round(an.wynik) + '/100' : 'Calibration';
    const anMethod = an.metoda === 'siec' ? 'Autoencoder 11-16-4-16-11' : (an.metoda === 'kalibracja' ? 'Baseline calibration' : 'Session comparison');
    const indeksTxt = (og.indeks !== null && og.indeks !== undefined) ? (og.indeks.toFixed ? og.indeks.toFixed(1) : og.indeks) + '/100' : 'N/A';
    const covPct = Math.round((og.pokrycie || 0) * 100);
    const pwPct = Math.round((og.pewnosc || 0) * 100);
    const basePct = Math.round((m.baza_postep || 0) * 100);

    const devCardsHtml = devs.map(function(o) {
      const score = Math.round(o.wynik || 0);
      const isAlarm = score >= 60 || o.status === 'alarm';
      const fillClass = isAlarm ? 'fill-critical' : (o.odchylony ? 'fill-warning' : '');
      const boxClass = isAlarm ? 'dev-alarm' : (o.odchylony ? 'dev-odchylony' : '');
      const params = Array.isArray(o.parametry) ? o.parametry : [];
      const refBad = params.some(function(p) { return p.kryteria && p.kryteria.norma_ref; });
      const perBad = params.some(function(p) { return p.kryteria && p.kryteria.norma_osobista; });
      const trdBad = params.some(function(p) { return p.kryteria && p.kryteria.trend; });
      const tags = [];
      if (refBad) tags.push('<span class="criteria-tag tag-crit">Reference baseline</span>');
      if (perBad) tags.push('<span class="criteria-tag tag-warn">Personal baseline</span>');
      if (trdBad) tags.push('<span class="criteria-tag tag-warn">Trend</span>');
      if (tags.length === 0) tags.push('<span class="criteria-tag">All criteria within normal range</span>');
      const topParamNotes = params.slice(0, 2).map(function(p) {
        return sanitizeModelText(p.nazwa + ': ' + p.wartosc + ' ' + p.jednostka);
      }).join(' | ');

      return `
        <div class="deviation-item ${boxClass}">
          <div class="deviation-top-row">
            <span class="deviation-area-name">${sanitizeModelText(o.nazwa)}</span>
            <span class="deviation-score">${score}/100</span>
          </div>
          <div class="deviation-bar-track">
            <div class="deviation-bar-fill ${fillClass}" style="width: ${Math.min(100, Math.max(4, score))}%"></div>
          </div>
          <div class="deviation-criteria-row">${tags.join('')}</div>
          ${topParamNotes ? `<div class="model-kpi-sub mt-1">${topParamNotes}</div>` : ''}
        </div>
      `;
    }).join('');

    const akapityHtml = (rap.akapity || []).map(function(line) {
      return `<div class="model-report-line">${sanitizeModelText(line)}</div>`;
    }).join('');

    const recsHtml = (rap.zalecenia && rap.zalecenia.length > 0) ? `
      <div class="model-rec-list">
        ${rap.zalecenia.map(function(r) {
          return `<div class="model-rec-item">- ${sanitizeModelText(r)}</div>`;
        }).join('')}
      </div>
    ` : '';

    const alertsHtml = (m.alerty && m.alerty.length > 0) ? `
      <div class="model-alert-feed">
        ${m.alerty.slice(0, 3).map(function(al) {
          return `<div class="model-alert-pill ${al.poziom === 'alarm' ? 'alert-alarm' : ''}">${sanitizeModelText(al.tekst)}</div>`;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="model-summary-header">
        <div>
          <h3>State Summarizing Model : autoencoder and deviation analysis</h3>
          <p class="section-subtitle">Joint evaluation of reference baselines, adaptive personal baseline, trend, and ECLSS cabin correlation</p>
        </div>
        <div class="model-actions-inline">
          <span class="status-pill ${statusBadgeFor(ogStatus)}">${statusLabelFor(ogStatus)}</span>
          <a class="btn btn-outline btn-sm" href="/api/raport.txt?astro_id=${encodeURIComponent(astro.id)}" target="_blank" rel="noopener">Download TXT report</a>
        </div>
      </div>

      <div class="model-kpi-grid">
        <div class="model-kpi-box">
          <span class="model-kpi-label">Readiness index</span>
          <span class="model-kpi-val">${indeksTxt}</span>
          <span class="model-kpi-sub">Assessment confidence ${pwPct}%</span>
        </div>
        <div class="model-kpi-box">
          <span class="model-kpi-label">Anomaly network</span>
          <span class="model-kpi-val">${anVal}</span>
          <span class="model-kpi-sub">${anMethod}</span>
        </div>
        <div class="model-kpi-box">
          <span class="model-kpi-label">Coverage and baseline</span>
          <span class="model-kpi-val">${covPct}% / ${basePct}%</span>
          <span class="model-kpi-sub">Active sources and calibration</span>
        </div>
        <div class="model-kpi-box">
          <span class="model-kpi-label">Deviated domains</span>
          <span class="model-kpi-val">${deviatedCount} / ${devs.length}</span>
          <span class="model-kpi-sub">3-criteria analysis</span>
        </div>
      </div>

      <div class="deviation-list">
        ${devCardsHtml}
      </div>

      <div class="model-report-box">
        ${akapityHtml}
        ${recsHtml}
      </div>
      ${alertsHtml}
    `;
  }

  function renderCrewModelSummaryInnerHtml(cs, astronauts, eclss) {
    const summary = cs && cs.priorityAstronauts ? cs : {
      crewIndex: 0,
      overallStatus: 'normal',
      statusLabel: 'Local mode',
      avgAnomaly: null,
      co2: (eclss && eclss.co2) || 2641,
      temp: (eclss && eclss.temp) || 24.1,
      dailyRadiation: (eclss && eclss.dailyRadiation) || 0.21,
      priorityAstronauts: (astronauts || []).map(function(a) {
        return {
          id: a.id,
          name: a.name,
          overallStatus: a.overallStatus || 'normal',
          statusLabel: a.statusLabel || 'Stable Condition',
          index: a.modelSummary && a.modelSummary.ogolny ? a.modelSummary.ogolny.indeks : null,
          anomaly: a.modelSummary && a.modelSummary.anomalia ? a.modelSummary.anomalia.wynik : null,
          topDeviations: [],
          topRecommendation: a.statusDescription || ''
        };
      }),
      alerts: [],
      recommendations: [],
      summaryText: 'Crew summary based on shared station telemetry and baseline data.'
    };

    const idxTxt = (summary.crewIndex !== null && summary.crewIndex !== undefined) ? summary.crewIndex + '/100' : 'brak';
    const anomTxt = (summary.avgAnomaly !== null && summary.avgAnomaly !== undefined) ? summary.avgAnomaly + '/100' : 'kalibracja';

    const prioHtml = (summary.priorityAstronauts || []).map(function(p) {
      const cls = p.overallStatus === 'critical' ? 'prio-critical' : (p.overallStatus === 'warning' ? 'prio-warning' : '');
      const pIdx = (p.index !== null && p.index !== undefined) ? p.index + '/100' : '--';
      const pAn = (p.anomaly !== null && p.anomaly !== undefined) ? p.anomaly + '/100' : '--';
      const devTxt = (p.topDeviations && p.topDeviations.length > 0) ? p.topDeviations.join(', ') : 'No domain deviations';
      return `
        <div class="model-priority-chip ${cls}">
          <div class="deviation-top-row">
            <span class="deviation-area-name">${sanitizeModelText(p.name)}</span>
            <span class="status-pill ${statusBadgeFor(p.overallStatus)}">${sanitizeModelText(p.statusLabel)}</span>
          </div>
          <div class="model-kpi-sub">Index: <strong>${pIdx}</strong> | Anomaly: <strong>${pAn}</strong></div>
          <div class="model-kpi-sub">${sanitizeModelText(devTxt)}</div>
        </div>
      `;
    }).join('');

    const recsHtml = (summary.recommendations && summary.recommendations.length > 0) ? `
      <div class="model-rec-list">
        ${summary.recommendations.map(function(r) {
          return `<div class="model-rec-item">- ${sanitizeModelText(r)}</div>`;
        }).join('')}
      </div>
    ` : '';

    const alertsHtml = (summary.alerts && summary.alerts.length > 0) ? `
      <div class="model-alert-feed">
        ${summary.alerts.slice(0, 4).map(function(al) {
          return `<div class="model-alert-pill ${al.poziom === 'alarm' ? 'alert-alarm' : ''}">${sanitizeModelText(al.astroName + ': ' + al.tekst)}</div>`;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="model-summary-header">
        <div>
          <h2>Crew State Summarizing Model : shared ML telemetry pipeline</h2>
          <p class="section-subtitle">Multi-signal autoencoder 11-16-4-16-11, adaptive personal baseline, and ECLSS OSDR environmental telemetry</p>
        </div>
        <div class="model-actions-inline">
          <span class="status-pill ${statusBadgeFor(summary.overallStatus)}">${sanitizeModelText(summary.statusLabel)}</span>
          <a class="btn btn-outline btn-sm" href="/api/raport.txt" target="_blank" rel="noopener">Download crew TXT report</a>
        </div>
      </div>

      <div class="model-kpi-grid">
        <div class="model-kpi-box">
          <span class="model-kpi-label">Mean crew index</span>
          <span class="model-kpi-val">${idxTxt}</span>
          <span class="model-kpi-sub">Model scale 0 - 100</span>
        </div>
        <div class="model-kpi-box">
          <span class="model-kpi-label">Mean anomaly score</span>
          <span class="model-kpi-val">${anomTxt}</span>
          <span class="model-kpi-sub">NASA OSDR neural network</span>
        </div>
        <div class="model-kpi-box">
          <span class="model-kpi-label">ECLSS cabin CO2</span>
          <span class="model-kpi-val">${summary.co2 || (eclss && eclss.co2) || 2641} ppm</span>
          <span class="model-kpi-sub">Temp ${summary.temp || (eclss && eclss.temp) || 24.1} deg C</span>
        </div>
        <div class="model-kpi-box">
          <span class="model-kpi-label">Daily radiation</span>
          <span class="model-kpi-val">${summary.dailyRadiation || (eclss && eclss.dailyRadiation) || 0.21} mGy/d</span>
          <span class="model-kpi-sub">Limit: below 1.0 mGy/d</span>
        </div>
      </div>

      <div class="model-crew-priority-list">
        ${prioHtml}
      </div>

      <div class="model-report-box">
        <div class="model-report-line">${sanitizeModelText(summary.summaryText)}</div>
        ${recsHtml}
      </div>
      ${alertsHtml}
    `;
  }

  // VIEW 1: Main dashboard
  function renderPulpit() {
    const mainEl = document.getElementById('app-main');
    if (isCommander()) {
      renderPulpitCommander(mainEl);
    } else {
      renderPulpitAstronaut(mainEl);
    }
  }

  // Commander Mission Dashboard
  function renderPulpitCommander(container) {
    startScheduleCountdown();
    const hrs = String(Math.floor(scheduleCountdownSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((scheduleCountdownSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(scheduleCountdownSeconds % 60).padStart(2, '0');
    const initialCountdownFormatted = hrs + ':' + mins + ':' + secs;
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
      astronautsCardsHtml = '<div class="empty-state-box">No astronauts defined in mission. Go to Settings to add crew members.</div>';
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

      const ms = a.modelSummary || null;
      const msIndeks = (ms && ms.ogolny && ms.ogolny.indeks !== null && ms.ogolny.indeks !== undefined) ? Math.round(ms.ogolny.indeks) + '/100' : '--';
      const msAnom = (ms && ms.anomalia && ms.anomalia.wynik !== null && ms.anomalia.wynik !== undefined) ? Math.round(ms.anomalia.wynik) + '/100' : '--';

      const latestTest = (a.periodicTests && a.periodicTests.length > 0) ? a.periodicTests[0] : null;
      const latestTestHtml = latestTest ? `
        <div class="last-test-preview">
          <span class="last-test-preview-label">Latest periodic test:</span>
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

          <div class="model-card-mini-bar">
            <span>ML Summarizing Model:</span>
            <span class="model-card-mini-val metric-val-model">Index ${msIndeks} | Anomaly ${msAnom}</span>
          </div>

          <p class="astro-card-desc">${sanitizeModelText(a.statusDescription)}</p>

          <div class="metrics-grid">
            <div class="metric-item">
              <span class="m-label">Heart rate:</span>
              <span class="m-val metric-val-hr"><span class="vital-heart-pulse"><svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>${a.vitals.hr} ${a.vitals.hrUnit}</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Blood pressure:</span>
              <span class="m-val metric-val-bp">${a.vitals.bpSys}/${a.vitals.bpDia} ${a.vitals.bpUnit}</span>
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
              <span class="m-label">Respiration:</span>
              <span class="m-val metric-val-resp">${a.vitals.resp} breaths/min</span>
            </div>
            <div class="metric-item">
              <span class="m-label">Stress / Energy:</span>
              <span class="m-val metric-val-stress">${a.vitals.stressLevel} pts / BB ${a.vitals.bodyBattery || 80} pts</span>
            </div>
          </div>

          ${latestTestHtml}

          <div class="card-actions">
            <button class="btn btn-primary btn-sm view-astro-btn" data-astroid="${a.id}">
              Full astronaut telemetry
            </button>
            <button class="btn btn-outline btn-sm add-order-btn" data-astroid="${a.id}">
              Issue medical order
            </button>
          </div>
        </div>
      `;
      });
    }

    const eclss = appState.eclssCabin || {};
    const bannerClass = criticalCount > 0 ? 'banner-critical' : (warningCount > 0 ? 'banner-warning' : 'banner-info');
    const crewSummaryText = (appState.crewSummary && appState.crewSummary.summaryText)
      ? sanitizeModelText(appState.crewSummary.summaryText)
      : (criticalCount > 0
        ? 'Elevated risk detected in a crew member. Immediate intervention protocol recommended.'
        : (totalAstro === 0 ? 'No active mission crew. Open Settings to onboard orbital personnel.' : 'All monitored astronauts maintain satisfactory physiological balance.'));

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Mission Control Center</h1>
          <p class="view-subtitle">Crew biotelemetry summary aboard orbital station Horizon One</p>
        </div>
        <div class="role-indicator-badge">
          Commander Main Panel
        </div>
      </div>

      <div class="alert-banner-box ${bannerClass}" id="dashboard-alert-box">
        <div class="alert-icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 L22 20 H2 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
            <path d="M12 9 V13 M12 17 H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </div>
        <div class="alert-text-wrap">
          <strong>Current summarizing model report:</strong>
          <span id="dashboard-alert-text">${crewSummaryText}</span>
        </div>
      </div>

      <div class="stats-overview-grid">
        <div class="stat-box">
          <span class="stat-number" id="stat-count-total">${totalAstro}</span>
          <span class="stat-title">Astronauts in orbit</span>
          <span class="stat-sub">Active mission crew</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-success" id="stat-count-normal">${normalCount}</span>
          <span class="stat-title">Fully stable condition</span>
          <span class="stat-sub">${totalAstro === 0 ? 'No personnel' : 'Within baseline'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-warning" id="stat-count-warning">${warningCount}</span>
          <span class="stat-title">Requires observation</span>
          <span class="stat-sub" id="stat-sub-warning">${warningCount > 0 ? 'Parameter deviations' : 'No deviations'}</span>
        </div>
        <div class="stat-box">
          <span class="stat-number color-critical" id="stat-count-critical">${criticalCount}</span>
          <span class="stat-title">Elevated risk</span>
          <span class="stat-sub" id="stat-sub-critical">${criticalCount > 0 ? 'Intervention required' : 'No alerts'}</span>
        </div>
      </div>

      <div class="model-summary-card" id="crew-model-summary-panel">
        ${renderCrewModelSummaryInnerHtml(appState.crewSummary, appState.astronauts, eclss)}
      </div>

      <div class="eclss-overview-card">
        <div class="section-title-bar">
          <div>
            <h2>Space Station : ECLSS Crew Module Parameters</h2>
            <p class="section-subtitle">Continuous life-support environmental telemetry from NASA OSDR RR-1 data</p>
          </div>
          <span class="badge-tag" id="eclss-source-tag">${sanitizeModelText(eclss.sourceTime || 'OSDR station sensor')}</span>
        </div>
        <div class="eclss-metrics-grid">
          <div class="eclss-chip">
            <span class="eclss-chip-title">Cabin temperature:</span>
            <span class="eclss-chip-value" id="eclss-temp">${eclss.temp !== undefined ? eclss.temp : 24.1} deg C</span>
            <span class="eclss-chip-norm">Baseline: 21.0 - 25.5 deg C</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Cabin pressure:</span>
            <span class="eclss-chip-value" id="eclss-pressure">${eclss.pressure !== undefined ? eclss.pressure : 101.3} kPa</span>
            <span class="eclss-chip-norm">Baseline: 99 - 103 kPa</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Relative humidity:</span>
            <span class="eclss-chip-value" id="eclss-humidity">${eclss.humidity !== undefined ? eclss.humidity : 39} %</span>
            <span class="eclss-chip-norm">Baseline: 30 - 60 %</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">O2 concentration:</span>
            <span class="eclss-chip-value" id="eclss-o2">${eclss.o2 !== undefined ? eclss.o2 : 20.9} %</span>
            <span class="eclss-chip-norm">Baseline: 20.5 - 22.0 % O2</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">CO2 concentration:</span>
            <span class="eclss-chip-value" id="eclss-co2">${eclss.co2 !== undefined ? eclss.co2 : 2641} ppm</span>
            <span class="eclss-chip-norm">Limit: below 3000 ppm</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Daily radiation:</span>
            <span class="eclss-chip-value" id="eclss-rad">${eclss.dailyRadiation !== undefined ? eclss.dailyRadiation : 0.21} mGy/d</span>
            <span class="eclss-chip-norm">Limit: below 1.0 mGy/d</span>
          </div>
          <div class="eclss-chip">
            <span class="eclss-chip-title">Water reserves:</span>
            <span class="eclss-chip-value" id="eclss-water">${eclss.waterTanks !== undefined ? eclss.waterTanks : 94} %</span>
            <span class="eclss-chip-norm">Safe reserve</span>
          </div>
        </div>
      </div>

      <div class="dashboard-quick-schedule-card">
        <div class="quick-countdown-box">
          <div class="countdown-clock-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div class="text-xs uppercase text-cyan font-bold">Examination Schedule : Countdown Timer:</div>
            <div class="quick-countdown-digits live-schedule-countdown">${initialCountdownFormatted}</div>
            <div class="text-secondary text-xs mt-1">Next check: Blood Pressure and SpO2 Measurement : Adam Kolosa at 17:15 UTC</div>
          </div>
        </div>

        <div class="d-flex align-center gap-3 flex-wrap">
          <div class="quick-fifo-badge-box">
            <span class="status-pill badge-warning">${(appState.scheduleData && appState.scheduleData.overdueFifoQueue ? appState.scheduleData.overdueFifoQueue.length : 2)} overdue in FIFO queue</span>
          </div>
          <button id="btn-quick-fifo-action" class="btn btn-outline btn-sm">
            Handle FIFO backlog
          </button>
          <button id="btn-quick-full-schedule" class="btn btn-primary btn-sm">
            Full schedule and instructions
          </button>
        </div>
      </div>

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="section-title-bar">
            <h2>Crew Member Biometric Cards</h2>
            <span class="badge-tag">Continuous refresh</span>
          </div>
          <div class="astronauts-grid">
            ${astronautsCardsHtml}
          </div>
        </div>

        <div class="split-column-side">
          <div class="side-panel-card">
            <h3>Crew Mean Indicators</h3>
            <div class="crew-aggregate-list">
              <div class="agg-row">
                <span class="agg-name">Mean crew heart rate:</span>
                <span class="agg-val" id="agg-val-hr">${avgHr} bpm</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Mean oxygen saturation:</span>
                <span class="agg-val" id="agg-val-spo2">${avgSpo2} %</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Mean radiation dose:</span>
                <span class="agg-val" id="agg-val-rad">${avgRad} mSv</span>
              </div>
              <div class="agg-row">
                <span class="agg-name">Days until next rotation:</span>
                <span class="agg-val">181 days</span>
              </div>
            </div>

            <div class="crew-chart-box">
              <div class="chart-header-row">
                <h4>Crew heart rate comparison</h4>
                <span class="unit-tag">bpm</span>
              </div>
              <div id="crew-hr-chart" class="mini-chart-container"></div>
            </div>

            <div class="crew-chart-box">
              <div class="chart-header-row">
                <h4>Crew stress level comparison</h4>
                <span class="unit-tag">percent</span>
              </div>
              <div id="crew-stress-chart" class="mini-chart-container"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render crew comparison charts
    TelemetryCharts.renderCrewComparison('crew-hr-chart', appState.astronauts, 'hr', 'Heart Rate', 'bpm');
    TelemetryCharts.renderCrewComparison('crew-stress-chart', appState.astronauts, 'stressLevel', 'Stress Level', '%');

    // Attach button event handlers
    container.querySelectorAll('.view-astro-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        selectedAstroId = btn.getAttribute('data-astroid');
        activeTab = 'telemetria';
        renderApp();
      });
    });

    const btnQuickFifo = container.querySelector('#btn-quick-fifo-action');
    if (btnQuickFifo) {
      btnQuickFifo.addEventListener('click', function() {
        activeTab = 'instrukcje';
        instrukcjeSubTab = 'schedule';
        renderApp();
      });
    }

    const btnQuickSched = container.querySelector('#btn-quick-full-schedule');
    if (btnQuickSched) {
      btnQuickSched.addEventListener('click', function() {
        activeTab = 'instrukcje';
        instrukcjeSubTab = 'schedule';
        renderApp();
      });
    }

    container.querySelectorAll('.add-order-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        selectedAstroId = btn.getAttribute('data-astroid');
        openOrderModal(selectedAstroId);
      });
    });
  }

  // Personal Astronaut Dashboard
  function renderPulpitAstronaut(container) {
    startScheduleCountdown();
    const hrs = String(Math.floor(scheduleCountdownSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((scheduleCountdownSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(scheduleCountdownSeconds % 60).padStart(2, '0');
    const initialCountdownFormatted = hrs + ':' + mins + ':' + secs;
    const currentAstro = getAstronautById(appState.currentUser);
    if (!currentAstro) {
      container.innerHTML = '<div class="notice-box">Astronaut profile not found.</div>';
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
              <span class="status-pill ${badgeColor}">Priority: ${priorityLabel(ord.priority)}</span>
            </div>
            <p class="order-body">${ord.text}</p>
          </div>
        `;
      });
    } else {
      ordersHtml = '<p class="empty-text">No active medical orders.</p>';
    }

    let statusPillClass = 'badge-normal';
    let bannerClass = 'status-banner-optimal';
    let headlineText = 'GENERAL HEALTH STATUS : ALL NORMAL - PARAMETERS OPTIMAL';
    let sublineText = 'HMS-of-A confirms healthy physiological function. All key biometric systems remain within safe operational limits.';
    let iconSvg = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;

    if (currentAstro.overallStatus === 'warning') {
      statusPillClass = 'badge-warning';
      bannerClass = 'status-banner-warning';
      headlineText = 'GENERAL HEALTH STATUS : OBSERVATION REQUIRED - DEVIATIONS LOGGED';
      sublineText = sanitizeModelText(currentAstro.statusDescription) || 'Single biometric deviation detected. Rest and targeted parameter follow-up recommended.';
      iconSvg = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    } else if (currentAstro.overallStatus === 'critical') {
      statusPillClass = 'badge-critical';
      bannerClass = 'status-banner-critical';
      headlineText = 'GENERAL HEALTH STATUS : CRITICAL CONDITION - URGENT ACTION REQUIRED';
      sublineText = sanitizeModelText(currentAstro.statusDescription) || 'Biometric safety corridor exceeded. Contact mission control medical immediately.';
      iconSvg = `
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }

    const hrOk = v.hr >= 50 && v.hr <= 80.5;
    const bpOk = v.bpSys <= 130 && v.bpDia <= 84;
    const spo2Ok = v.spo2 >= 96;
    const tempOk = v.temp >= 36.2 && v.temp <= 37.35;
    const respOk = v.resp >= 12 && v.resp <= 18.5;
    const stressOk = v.stressLevel <= 50;
    const sleepScoreVal = v.sleepScore !== undefined ? v.sleepScore : 85;
    const cortisolVal = v.cortisol !== undefined ? v.cortisol : 4.2;
    const lactateVal = v.lactate !== undefined ? v.lactate : 1.6;
    const cogVal = v.cognitiveReadiness !== undefined ? v.cognitiveReadiness : 90;

    const checklistHtml = renderChecklistChipsHtml(currentAstro);

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Personal Astronaut Health Dashboard</h1>
          <p class="view-subtitle">Welcome ${currentAstro.name}. Your current physiological metrics are monitored in real time.</p>
        </div>
        <div class="user-status-flag">
          <span class="status-pill ${statusPillClass}" id="astro-status-badge-top">${currentAstro.statusLabel}</span>
        </div>
      </div>

      <div class="astro-overall-status-banner ${bannerClass}" id="astro-status-banner">
        <div class="astro-status-header-row">
          <div class="astro-status-title-group">
            <div class="astro-status-icon-circle">
              ${iconSvg}
            </div>
            <div>
              <div class="text-xs uppercase font-bold tracking-wider text-cyan">Overall Health Condition Assessment : Current Status</div>
              <div class="astro-status-headline" id="astro-status-headline">${headlineText}</div>
              <div class="astro-status-subline" id="astro-status-subline">${sanitizeModelText(sublineText)}</div>
            </div>
          </div>
          <div class="astro-status-badge-wrap">
            <span class="status-pill ${statusPillClass}" id="astro-status-badge-main">${currentAstro.statusLabel}</span>
          </div>
        </div>

        <div class="astro-systems-checklist" id="astro-checklist-container">
          ${checklistHtml}
        </div>
      </div>

      <div class="personal-summary-banner">
        <div class="personal-info-block">
          <div class="avatar-large">${currentAstro.avatarCode}</div>
          <div>
            <div class="personal-name">${currentAstro.name}</div>
            ${currentAstro.role ? `<div class="personal-role">${currentAstro.role}</div>` : ''}
            <div class="personal-details">Age: ${currentAstro.age} yrs | Blood type: ${currentAstro.bloodType} | Mission day: ${currentAstro.missionDay} | EVA hours: ${currentAstro.evaHours}</div>
          </div>
        </div>
        <div class="personal-status-desc">
          <div class="desc-heading">Current summarizing model evaluation:</div>
          <div class="desc-content" id="astro-personal-desc">${sanitizeModelText(currentAstro.statusDescription)}</div>
        </div>
      </div>

      <div class="model-summary-card" id="astro-model-summary-panel">
        ${renderModelSummaryInnerHtml(currentAstro)}
      </div>

      <div class="dashboard-quick-schedule-card">
        <div class="quick-countdown-box">
          <div class="countdown-clock-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div class="text-xs uppercase text-cyan font-bold">Examination Schedule : Countdown Timer:</div>
            <div class="quick-countdown-digits live-schedule-countdown">${initialCountdownFormatted}</div>
            <div class="text-secondary text-xs mt-1">Next check: Blood Pressure and SpO2 Measurement : Adam Kolosa at 17:15 UTC</div>
          </div>
        </div>

        <div class="d-flex align-center gap-3 flex-wrap">
          <div class="quick-fifo-badge-box">
            <span class="status-pill badge-warning">${(appState.scheduleData && appState.scheduleData.overdueFifoQueue ? appState.scheduleData.overdueFifoQueue.length : 2)} overdue in FIFO queue</span>
          </div>
          <button id="btn-quick-fifo-action" class="btn btn-outline btn-sm">
            Handle FIFO backlog
          </button>
          <button id="btn-quick-full-schedule" class="btn btn-primary btn-sm">
            Full schedule and instructions
          </button>
        </div>
      </div>

      <div class="sensor-readings-section">
        <div class="sensor-section-header">
          <div>
            <h3 class="sensor-section-title">Exact Sensor and Diagnostic Instrument Readings</h3>
            <p class="sensor-section-desc">Detailed values recorded by dermal biosensors, cuff tensiometers, and garment sensors:</p>
          </div>
          <span class="badge-tag">Sensor Telemetry</span>
        </div>

        <div class="sensors-compact-grid">
          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Heart rate sensor HR</span>
              <span class="badge-micro-pill ${hrOk ? 'pill-ok' : 'pill-warn'}">${hrOk ? 'Normal' : 'Alert'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-hr">${v.hr}</span>
              <span class="sensor-exact-unit">${v.hrUnit}</span>
            </div>
            <div class="sensor-safe-range">Safe range: 50 to 80 bpm</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Blood pressure cuff BP</span>
              <span class="badge-micro-pill ${bpOk ? 'pill-ok' : 'pill-warn'}">${bpOk ? 'Normal' : 'Alert'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-bp">${v.bpSys}/${v.bpDia}</span>
              <span class="sensor-exact-unit">${v.bpUnit}</span>
            </div>
            <div class="sensor-safe-range">Safe range: 100-130/65-84 mmHg</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Pulse oximeter SpO2</span>
              <span class="badge-micro-pill ${spo2Ok ? 'pill-ok' : 'pill-warn'}">${spo2Ok ? 'Normal' : 'Alert'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-spo2">${v.spo2}</span>
              <span class="sensor-exact-unit">${v.spo2Unit}</span>
            </div>
            <div class="sensor-safe-range">Required minimum: 96 percent</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Skin temperature</span>
              <span class="badge-micro-pill ${tempOk ? 'pill-ok' : 'pill-warn'}">${tempOk ? 'Normal' : 'Alert'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-temp">${v.temp}</span>
              <span class="sensor-exact-unit">${v.tempUnit}</span>
            </div>
            <div class="sensor-safe-range">Physiological norm: 36.2 to 37.3 deg C</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Respiratory belt rate</span>
              <span class="badge-micro-pill ${respOk ? 'pill-ok' : 'pill-warn'}">${respOk ? 'Normal' : 'Alert'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-resp">${v.resp}</span>
              <span class="sensor-exact-unit">${v.respUnit}</span>
            </div>
            <div class="sensor-safe-range">Resting baseline: 12 to 18 per min</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Cardiac RR interval</span>
              <span class="badge-micro-pill pill-ok">Normal</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-rr">${v.rr || Math.round(60000 / v.hr)}</span>
              <span class="sensor-exact-unit">ms</span>
            </div>
            <div class="sensor-safe-range">Inter-beat R-wave interval in ECG</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">HRV Status variability</span>
              <span class="badge-micro-pill ${(v.hrv || 64) >= 45 ? 'pill-ok' : 'pill-warn'}">${(v.hrv || 64) >= 45 ? 'Stable' : 'Low'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-hrv">${v.hrv || 64}</span>
              <span class="sensor-exact-unit">ms</span>
            </div>
            <div class="sensor-safe-range">Autonomic RMSSD status: 45 to 80 ms</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Stress and strain level</span>
              <span class="badge-micro-pill ${stressOk ? 'pill-ok' : 'pill-warn'}">${stressOk ? 'Low' : 'Elevated'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-stress">${v.stressLevel}</span>
              <span class="sensor-exact-unit">pts</span>
            </div>
            <div class="sensor-safe-range">Load scale: 0 to 50 pts</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Body Battery reserve</span>
              <span class="badge-micro-pill ${(v.bodyBattery || 82) >= 50 ? 'pill-ok' : 'pill-warn'}">${(v.bodyBattery || 82) >= 50 ? 'High' : 'Low'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-bb">${v.bodyBattery || 82}</span>
              <span class="sensor-exact-unit">pts</span>
            </div>
            <div class="sensor-safe-range">Readiness indicator: above 50 pts</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Sleep Score rating</span>
              <span class="badge-micro-pill ${sleepScoreVal >= 80 ? 'pill-ok' : 'pill-warn'}">${sleepScoreVal >= 80 ? 'Normal' : 'Reduced'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-sleep-score">${sleepScoreVal}</span>
              <span class="sensor-exact-unit">pts</span>
            </div>
            <div class="sensor-safe-range">Recovery target: above 80 pts</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Sweat cortisol Bio-Patch</span>
              <span class="badge-micro-pill ${cortisolVal < 6.5 ? 'pill-ok' : 'pill-warn'}">${cortisolVal < 6.5 ? 'Normal' : 'Elevated'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-cortisol">${cortisolVal}</span>
              <span class="sensor-exact-unit">ng/ml</span>
            </div>
            <div class="sensor-safe-range">Biochemical limit: below 6.5 ng/ml</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Sweat lactate Bio-Patch</span>
              <span class="badge-micro-pill ${lactateVal < 2.5 ? 'pill-ok' : 'pill-warn'}">${lactateVal < 2.5 ? 'Normal' : 'Elevated'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-lactate">${lactateVal}</span>
              <span class="sensor-exact-unit">mmol/l</span>
            </div>
            <div class="sensor-safe-range">Resting limit: below 2.5 mmol/l</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">EEG cognitive readiness</span>
              <span class="badge-micro-pill ${cogVal >= 75 ? 'pill-ok' : 'pill-warn'}">${cogVal >= 75 ? 'Normal' : 'Drop'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-eeg">${cogVal}</span>
              <span class="sensor-exact-unit">%</span>
            </div>
            <div class="sensor-safe-range">Safety envelope: 75 to 100 percent</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Radiation dosimeter</span>
              <span class="badge-micro-pill pill-ok">Safe</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value" id="astro-sensor-rad">${v.radDose}</span>
              <span class="sensor-exact-unit">${v.radUnit}</span>
            </div>
            <div class="sensor-safe-range">Mission safety limit: 50.0 mSv</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Bone mineral density</span>
              <span class="badge-micro-pill pill-ok">Normal</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value">${v.boneDensity}</span>
              <span class="sensor-exact-unit">${v.boneUnit}</span>
            </div>
            <div class="sensor-safe-range">Index relative to preflight baseline</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Muscle mass retention</span>
              <span class="badge-micro-pill pill-ok">Normal</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value">${v.muscleMass}</span>
              <span class="sensor-exact-unit">${v.muscleUnit}</span>
            </div>
            <div class="sensor-safe-range">Post ARED strength training index</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Tissue hydration level</span>
              <span class="badge-micro-pill pill-ok">Optimal</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value">${v.hydration}</span>
              <span class="sensor-exact-unit">${v.hydrationUnit}</span>
            </div>
            <div class="sensor-safe-range">Hydration norm: 85 to 100 percent</div>
          </div>

          <div class="sensor-item-card">
            <div class="sensor-item-top">
              <span class="sensor-item-label">Sleep and recovery duration</span>
              <span class="badge-micro-pill ${v.sleepHours >= 7 ? 'pill-ok' : 'pill-warn'}">${v.sleepHours >= 7 ? 'Normal' : 'Short'}</span>
            </div>
            <div class="sensor-item-reading">
              <span class="sensor-exact-value">${v.sleepHours || 7.2}</span>
              <span class="sensor-exact-unit">${v.sleepUnit}</span>
            </div>
            <div class="sensor-safe-range">Recommended daily sleep cycle recovery</div>
          </div>
        </div>
      </div>

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="chart-container-card">
            <div class="chart-header-controls">
              <div>
                <h3 class="chart-title">Personal Biotelemetry Trend</h3>
                <p class="chart-sub">Measurement history across the last six orbital days</p>
              </div>
              <div class="metric-switch-buttons">
                <button class="btn-metric-toggle ${activeChartMetric === 'hr' ? 'active' : ''}" data-metric="hr">Heart Rate</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'bpSys' ? 'active' : ''}" data-metric="bpSys">Systolic BP</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'spo2' ? 'active' : ''}" data-metric="spo2">Saturation</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'stress' ? 'active' : ''}" data-metric="stress">Stress</button>
                <button class="btn-metric-toggle ${activeChartMetric === 'rad' ? 'active' : ''}" data-metric="rad">Radiation</button>
              </div>
            </div>
            <div id="astro-personal-chart" class="main-chart-wrapper"></div>
          </div>

          <div class="card-section">
            <div class="section-title-bar">
              <h3>Commander Directives and Medical Orders</h3>
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
            <h3>Morning Wellbeing Check-In</h3>
            <p class="panel-intro-text">Report completed daily medical tasks and current condition:</p>
            
            <form id="daily-checkin-form" class="form-vertical">
              <div class="checkbox-group">
                <label class="custom-checkbox">
                  <input type="checkbox" id="check-ared" checked />
                  <span class="check-box-visual"></span>
                  <span class="check-label">Completed ARED resistance training</span>
                </label>
              </div>

              <div class="checkbox-group">
                <label class="custom-checkbox">
                  <input type="checkbox" id="check-t2" checked />
                  <span class="check-box-visual"></span>
                  <span class="check-label">Completed T2 treadmill run</span>
                </label>
              </div>

              <div class="checkbox-group">
                <label class="custom-checkbox">
                  <input type="checkbox" id="check-hydration" checked />
                  <span class="check-box-visual"></span>
                  <span class="check-label">Consumed 2.5 L electrolyte target</span>
                </label>
              </div>

              <div class="form-group">
                <label for="self-feeling" class="form-label">Wellbeing rating and symptoms:</label>
                <select id="self-feeling" class="form-input">
                  <option value="Very good, no symptoms">Very good, no symptoms</option>
                  <option value="Mild fatigue after shift">Mild fatigue after shift</option>
                  <option value="Temporary neck or back pain">Temporary neck or back pain</option>
                  <option value="Mild microgravity nausea">Mild microgravity nausea</option>
                  <option value="Sleep disturbance and difficulty falling asleep">Sleep disturbance and difficulty falling asleep</option>
                </select>
              </div>

              <div class="form-group">
                <label for="self-notes" class="form-label">Notes for the medical team:</label>
                <textarea id="self-notes" class="form-textarea" rows="3" placeholder="Enter physical condition notes"></textarea>
              </div>

              <button type="submit" class="btn btn-primary btn-block">
                Submit log to system
              </button>
            </form>

            <div id="checkin-feedback" class="feedback-msg"></div>
          </div>
        </div>
      </div>
    `;

    // Render personal telemetry chart
    renderCurrentAstronautChart(currentAstro);

    // Chart metric toggle listeners
    container.querySelectorAll('.btn-metric-toggle').forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeChartMetric = btn.getAttribute('data-metric');
        container.querySelectorAll('.btn-metric-toggle').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderCurrentAstronautChart(currentAstro);
      });
    });

    // Daily wellbeing form handler
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
          feedback.textContent = 'Report logged successfully into station database.';
          feedback.style.display = 'block';
          setTimeout(function() { feedback.style.display = 'none'; }, 4000);
        }
      });
    }
  }

  function renderCurrentAstronautChart(astro) {
    let metricLabel = 'Heart Rate';
    let unit = 'bpm';
    if (activeChartMetric === 'bpSys') {
      metricLabel = 'Systolic BP';
      unit = 'mmHg';
    } else if (activeChartMetric === 'spo2') {
      metricLabel = 'Oxygen Saturation';
      unit = '%';
    } else if (activeChartMetric === 'stress') {
      metricLabel = 'Stress Level';
      unit = '%';
    } else if (activeChartMetric === 'rad') {
      metricLabel = 'Radiation Dose';
      unit = 'mSv';
    }

    TelemetryCharts.renderLineChart('astro-personal-chart', astro.telemetryHistory, activeChartMetric, metricLabel, unit);
  }

  // Helper rendering periodic measurements and exam table
  function renderPeriodicTestsTable(tests) {
    if (!tests || tests.length === 0) {
      return `
        <div class="periodic-tests-wrapper">
          <div class="section-title-bar">
            <div>
              <h3>Periodic Measurements and Tests</h3>
              <p class="section-subtitle">Diagnostic exam results performed periodically with exact date and UTC timestamp</p>
            </div>
            <span class="badge-tag">Periodic Tests</span>
          </div>
          <div class="empty-state-box">No periodic tests recorded for this astronaut.</div>
        </div>
      `;
    }

    let rowsHtml = '';
    tests.forEach(function(t) {
      let statusClass = 'badge-normal';
      if (t.statusType === 'warning' || t.status === 'Needs Attention' || t.status === 'Needs Attention') statusClass = 'badge-warning';
      if (t.statusType === 'critical' || t.status === 'Elevated Risk' || t.status === 'Elevated Risk') statusClass = 'badge-critical';

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
            <h3>Periodic Measurements and Tests</h3>
            <p class="section-subtitle">Diagnostic results : exact exam date, capture time, and clinical assessment</p>
          </div>
          <span class="badge-tag">Periodic Tests</span>
        </div>
        <div class="table-responsive">
          <table class="periodic-table">
            <thead>
              <tr>
                <th>Date and Time</th>
                <th>Tested Parameter</th>
                <th>Measuring Equipment</th>
                <th>Test Result</th>
                <th>Clinical Status</th>
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

  // VIEW 2: Crew and Telemetry for Commander or extended astronaut view
  function renderTelemetria() {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;

    if (!appState.astronauts || appState.astronauts.length === 0) {
      mainEl.innerHTML = `
        <div class="view-header">
          <div>
            <h1 class="view-title">Health Cards and Telemetry</h1>
            <p class="view-subtitle">No astronauts registered in the mission database</p>
          </div>
        </div>
        <div class="empty-state-box">
          No astronaut data available. Go to the Settings tab to add crew members.
        </div>
      `;
      return;
    }

    const commanderFlag = isCommander();

    // If an astronaut is logged in, show only their own profile
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
              <span class="status-pill ${badgeColor}">Priority: ${priorityLabel(ord.priority)}</span>
            </div>
            <p class="order-body">${ord.text}</p>
          </div>
        `;
      });
    } else {
      ordersHtml = '<p class="empty-text">No active medical orders.</p>';
    }

    let dailyChecksHtml = '';
    if (currentAstro.dailyChecks && currentAstro.dailyChecks.length > 0) {
      currentAstro.dailyChecks.forEach(function(dc) {
        dailyChecksHtml += `
          <div class="daily-check-row">
            <div class="dc-date">${dc.date}</div>
            <div class="dc-tasks">
              <span class="task-badge ${dc.trainedAred ? 'task-done' : 'task-missed'}">ARED: ${dc.trainedAred ? 'Done' : 'Missed'}</span>
              <span class="task-badge ${dc.trainedT2 ? 'task-done' : 'task-missed'}">T2: ${dc.trainedT2 ? 'Done' : 'Missed'}</span>
            </div>
            <div class="dc-wellbeing">${dc.wellbeing}</div>
          </div>
        `;
      });
    } else {
      dailyChecksHtml = '<p class="empty-text">No submitted reports.</p>';
    }

    let statusPillClass = 'badge-normal';
    if (currentAstro.overallStatus === 'warning') statusPillClass = 'badge-warning';
    if (currentAstro.overallStatus === 'critical') statusPillClass = 'badge-critical';

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">${commanderFlag ? 'Crew Health Cards and Telemetry' : 'Detailed Personal Biotelemetry'}</h1>
          <p class="view-subtitle">${commanderFlag ? 'Detailed physiological review for each crew member and medical directive management' : 'Current and historical physiological parameters of your body'}</p>
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
              <span class="chip">Age: ${currentAstro.age} yrs</span>
              <span class="chip">Blood type: ${currentAstro.bloodType}</span>
              <span class="chip">Mission day: ${currentAstro.missionDay}</span>
              <span class="chip">EVA hours: ${currentAstro.evaHours} h</span>
            </div>
          </div>
        </div>
        <div class="detail-hero-right">
          <div class="status-panel-box">
            <span class="status-label-heading">Current status:</span>
            <span class="status-pill ${statusPillClass}" id="tel-hero-status-pill">${currentAstro.statusLabel}</span>
            <p class="status-panel-note" id="tel-hero-status-desc">${sanitizeModelText(currentAstro.statusDescription)}</p>
            ${commanderFlag ? `<button class="btn btn-primary btn-sm mt-2 open-order-modal-btn" data-id="${currentAstro.id}">Issue medical order</button>` : ''}
          </div>
        </div>
      </div>

      <div class="model-summary-card" id="telemetry-model-summary-panel">
        ${renderModelSummaryInnerHtml(currentAstro)}
      </div>

      <div class="radial-gauges-row">
        <div class="gauge-card" id="gauge-bone"></div>
        <div class="gauge-card" id="gauge-muscle"></div>
        <div class="gauge-card" id="gauge-hydration"></div>
        <div class="gauge-card" id="gauge-stress"></div>
      </div>

      <div class="vitals-cards-grid">
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Resting heart rate</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-hr">${v.hr}</span><span class="vital-unit">${v.hrUnit}</span></div>
          <div class="vital-norm">Continuous range: 50 to 80 bpm</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Blood pressure</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-bp">${v.bpSys}/${v.bpDia}</span><span class="vital-unit">${v.bpUnit}</span></div>
          <div class="vital-norm">Baseline: 100-130/65-84 mmHg</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">RR interval</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-rr">${v.rr || Math.round(60000 / v.hr)}</span><span class="vital-unit">ms</span></div>
          <div class="vital-norm">Interval between heartbeats</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">HRV Status RMSSD</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-hrv">${v.hrv || 64}</span><span class="vital-unit">ms</span></div>
          <div class="vital-norm">Balanced range: 45 - 80 ms</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Oxygen saturation SpO2</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-spo2">${v.spo2}</span><span class="vital-unit">${v.spo2Unit}</span></div>
          <div class="vital-norm">ISS requirement: 96 - 100 %</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Respiratory rate</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-resp">${v.resp}</span><span class="vital-unit">${v.respUnit}</span></div>
          <div class="vital-norm">Resting norm: 12 - 18 / min</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Stress level</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-stress">${v.stressLevel}</span><span class="vital-unit">pts</span></div>
          <div class="vital-norm">Baseline: 0 - 50 pts</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Body Battery reserve</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-bb">${v.bodyBattery || 82}</span><span class="vital-unit">pts</span></div>
          <div class="vital-norm">Minimum target: above 50 pts</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Skin temperature</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-temp">${v.temp}</span><span class="vital-unit">${v.tempUnit}</span></div>
          <div class="vital-norm">Baseline: 36.2 - 37.3 deg C</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Sweat cortisol and lactate</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-bio">${v.cortisol !== undefined ? v.cortisol : 4.2} / ${v.lactate !== undefined ? v.lactate : 1.6}</span><span class="vital-unit">ng/ml | mmol/l</span></div>
          <div class="vital-norm">Limits: below 6.5 and 2.5</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">EEG readiness and Sleep Score</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-eeg">${v.cognitiveReadiness !== undefined ? v.cognitiveReadiness : 90}% / ${v.sleepScore !== undefined ? v.sleepScore : 85}</span><span class="vital-unit">pts</span></div>
          <div class="vital-norm">Targets: above 75% and 80 pts</div>
        </div>
        <div class="vital-card">
          <div class="vital-top"><span class="vital-title">Cumulative dose</span></div>
          <div class="vital-value-row"><span class="vital-val" id="tel-val-rad">${v.radDose}</span><span class="vital-unit">${v.radUnit}</span></div>
          <div class="vital-norm">Mission safety limit: 50.0 mSv</div>
        </div>
      </div>

      <div class="chart-container-card">
        <div class="chart-header-controls">
          <div>
            <h3 class="chart-title">Biotelemetry Trend Analysis</h3>
            <p class="chart-sub">Six-day astronaut telemetry profile</p>
          </div>
          <div class="metric-switch-buttons">
            <button class="btn-metric-toggle ${activeChartMetric === 'hr' ? 'active' : ''}" data-metric="hr">Heart Rate</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'bpSys' ? 'active' : ''}" data-metric="bpSys">Systolic BP</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'spo2' ? 'active' : ''}" data-metric="spo2">Saturation</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'stress' ? 'active' : ''}" data-metric="stress">Stress</button>
            <button class="btn-metric-toggle ${activeChartMetric === 'rad' ? 'active' : ''}" data-metric="rad">Radiation</button>
          </div>
        </div>
        <div id="telemetry-detail-chart" class="main-chart-wrapper"></div>
      </div>

      ${renderPeriodicTestsTable(currentAstro.periodicTests)}

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="card-section">
            <div class="section-title-bar">
              <h3>Medical Orders Log</h3>
              <span class="badge-tag">Decision History</span>
            </div>
            <div class="orders-list">
              ${ordersHtml}
            </div>
          </div>
        </div>

        <div class="split-column-side">
          <div class="side-panel-card">
            <h3>Daily Procedure Compliance Log</h3>
            <div class="daily-checks-list">
              ${dailyChecksHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // Render radial biometric gauges
    TelemetryCharts.renderRadialGauge('gauge-bone', v.boneDensity, 100, 'Bone density', '%', v.boneDensity < 92 ? '#ef4444' : '#00d4ff');
    TelemetryCharts.renderRadialGauge('gauge-muscle', v.muscleMass, 100, 'Muscle mass', '%', v.muscleMass < 92 ? '#ef4444' : '#00d4ff');
    TelemetryCharts.renderRadialGauge('gauge-hydration', v.hydration, 100, 'Hydration', '%', v.hydration < 88 ? '#f59e0b' : '#10b981');
    TelemetryCharts.renderRadialGauge('gauge-stress', v.stressLevel, 100, 'Stress Level', '%', v.stressLevel > 60 ? '#ef4444' : '#00d4ff');

    // Render main detail chart
    let mLabel = 'Heart Rate';
    let mUnit = 'bpm';
    if (activeChartMetric === 'bpSys') { mLabel = 'Systolic BP'; mUnit = 'mmHg'; }
    else if (activeChartMetric === 'spo2') { mLabel = 'Oxygen Saturation'; mUnit = '%'; }
    else if (activeChartMetric === 'stress') { mLabel = 'Stress Level'; mUnit = '%'; }
    else if (activeChartMetric === 'rad') { mLabel = 'Radiation Dose'; mUnit = 'mSv'; }

    TelemetryCharts.renderLineChart('telemetry-detail-chart', currentAstro.telemetryHistory, activeChartMetric, mLabel, mUnit);

    // Metric switch button listeners
    mainEl.querySelectorAll('.btn-metric-toggle').forEach(function(btn) {
      btn.addEventListener('click', function() {
        activeChartMetric = btn.getAttribute('data-metric');
        renderTelemetria();
      });
    });

    // Commander astronaut selector listeners
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


  // STATE AND VARIABLES FOR INSTRUCTIONS AND PREVENTION MODULE
  let instrukcjeSubTab = 'step';
  let activeStepProcId = 'proc-cisnienie';
  let currentStepIndex = 0;
  let completedStepsHistory = [];
  let prophylaxisCategory = 'all';
  let criticalCategory = 'all';
  let prophylaxisSearch = '';
  let criticalSearch = '';
  let scheduleCountdownSeconds = 2720;
  let countdownTimerStarted = false;

  function startScheduleCountdown() {
    if (countdownTimerStarted) return;
    countdownTimerStarted = true;
    setInterval(function() {
      if (scheduleCountdownSeconds > 0) {
        scheduleCountdownSeconds--;
      } else {
        scheduleCountdownSeconds = 3600;
      }
      const hrs = String(Math.floor(scheduleCountdownSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((scheduleCountdownSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(scheduleCountdownSeconds % 60).padStart(2, '0');
      const formatted = hrs + ':' + mins + ':' + secs;

      const timerEls = document.querySelectorAll('.live-schedule-countdown');
      timerEls.forEach(function(el) {
        el.textContent = formatted;
      });
    }, 1000);
  }

  // VIEW 3: Instructions and Prevention Module
  function renderInstrukcje() {
    const mainEl = document.getElementById('app-main');
    startScheduleCountdown();

    const hrs = String(Math.floor(scheduleCountdownSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((scheduleCountdownSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(scheduleCountdownSeconds % 60).padStart(2, '0');
    const initialCountdownFormatted = hrs + ':' + mins + ':' + secs;

    let subviewHtml = '';

    // SUBVIEW 1: STEP-BY-STEP PROCEDURES
    if (instrukcjeSubTab === 'step') {
      const procedures = appState.stepProcedures || [];
      const currentProc = procedures.find(function(p) { return p.id === activeStepProcId; }) || procedures[0];
      const totalSteps = currentProc ? currentProc.steps.length : 1;
      const isFinished = currentStepIndex >= totalSteps;
      const currentStepText = (!isFinished && currentProc) ? currentProc.steps[currentStepIndex] : '';
      const progressPercent = isFinished ? 100 : Math.round((currentStepIndex / totalSteps) * 100);

      let procOptionsHtml = '';
      procedures.forEach(function(p) {
        const sel = p.id === activeStepProcId ? 'selected' : '';
        procOptionsHtml += `<option value="${p.id}" ${sel}>${p.name} : Kod: ${p.code}</option>`;
      });

      let historyStepsHtml = '';
      if (currentProc) {
        currentProc.steps.forEach(function(st, idx) {
          let stepClass = 'upcoming';
          let statusText = 'Pending';
          if (idx < currentStepIndex) {
            stepClass = 'completed';
            statusText = 'Completed';
          } else if (idx === currentStepIndex && !isFinished) {
            stepClass = 'active';
            statusText = 'In progress';
          }
          historyStepsHtml += `
            <div class="history-step-item ${stepClass}">
              <div class="d-flex justify-between">
                <strong>Step ${idx + 1} of ${totalSteps}</strong>
                <span class="step-status-chip">${statusText}</span>
              </div>
              <div class="mt-1">${st}</div>
            </div>
          `;
        });
      }

      subviewHtml = `
        <div class="step-proc-selector-bar">
          <div>
            <label for="select-step-proc" class="form-label mb-1">Active measurement procedure:</label>
            <select id="select-step-proc" class="form-input">
              ${procOptionsHtml}
            </select>
          </div>
          <div>
            <button id="btn-restart-proc" class="btn btn-outline btn-sm">Restart procedure</button>
          </div>
        </div>

        <div class="step-proc-container">
          <div class="current-step-card">
            <div class="d-flex justify-between align-center flex-wrap gap-2">
              <span class="current-step-badge">Sequential procedure : ${currentProc ? currentProc.code : ''}</span>
              <span class="badge-tag">${currentProc ? currentProc.category : ''}</span>
            </div>

            <div>
              <h2 class="current-step-title">${currentProc ? currentProc.name : 'Measurement procedure'}</h2>
              <p class="text-secondary mt-1">${currentProc ? currentProc.description : ''}</p>
            </div>

            <div class="step-progress-wrapper">
              <div class="d-flex justify-between text-muted text-xs mb-1">
                <span>Procedure progress: ${progressPercent} percent</span>
                <span>Step ${Math.min(currentStepIndex + 1, totalSteps)} of ${totalSteps}</span>
              </div>
              <div class="step-progress-bar-wrap">
                <div class="step-progress-fill" style="width: ${progressPercent}%;"></div>
              </div>
            </div>

            ${!isFinished ? `
              <div class="current-step-instruction">
                <div class="text-xs uppercase text-cyan font-bold mb-2">Current required step:</div>
                <div class="step-instruction-main">${currentStepText}</div>
              </div>

              <div class="current-step-actions">
                <button id="btn-next-step" class="btn btn-primary btn-lg">
                  ${currentStepIndex === totalSteps - 1 ? 'Confirm and finish procedure' : 'Done / Continue'}
                </button>
                <span class="text-muted text-xs">Sequential guidance: only the current active step is highlighted at once.</span>
              </div>
            ` : `
              <div class="alert-banner-box banner-info">
                <div class="alert-text-wrap">
                  <strong>Measurement procedure completed successfully</strong>
                  <p class="mt-1">All stages of ${currentProc.name} have been executed, verified, and logged to station storage.</p>
                </div>
              </div>

              <div class="current-step-actions">
                <button id="btn-restart-proc-fin" class="btn btn-primary">Run procedure again</button>
                <button id="btn-go-schedule" class="btn btn-outline">Go to examination schedule</button>
              </div>
            `}
          </div>

          <div class="steps-history-panel">
            <h3 class="steps-history-heading">Completed Step History</h3>
            <p class="text-muted text-xs mb-3">Reviewing earlier steps supports quick verification without interrupting active execution.</p>
            <div class="history-steps-list">
              ${historyStepsHtml}
            </div>
          </div>
        </div>
      `;
    }

    // SUBVIEW 2: SCHEDULE AND FIFO QUEUE
    else if (instrukcjeSubTab === 'schedule') {
      const schedule = appState.scheduleData || { upcomingTests: [], overdueFifoQueue: [] };

      let upcomingHtml = '';
      (schedule.upcomingTests || []).forEach(function(item) {
        upcomingHtml += `
          <div class="fifo-item-card">
            <div class="d-flex justify-between align-center">
              <strong>${item.title}</strong>
              <span class="status-pill badge-normal">${item.timeUtc}</span>
            </div>
            <div class="text-secondary text-sm">Subject: <strong>${item.astronaut}</strong></div>
            <div class="mt-2">
              <button class="btn btn-outline btn-xs start-specific-proc-btn" data-proc="${item.procId}">
                Start measurement procedure
              </button>
            </div>
          </div>
        `;
      });

      let overdueHtml = '';
      (schedule.overdueFifoQueue || []).forEach(function(item, idx) {
        overdueHtml += `
          <div class="fifo-item-card">
            <div class="d-flex justify-between align-center">
              <span class="fifo-order-badge">FIFO Queue: Position ${idx + 1} - ${idx === 0 ? 'Oldest overdue' : 'Overdue'}</span>
              <span class="status-pill badge-warning">${item.delay}</span>
            </div>
            <div class="font-bold text-white mt-1">${item.title}</div>
            <div class="text-secondary text-sm">Subject: <strong>${item.astronaut}</strong> | Planned: ${item.dueTime}</div>
            <div class="mt-2">
              <button class="btn btn-primary btn-xs run-fifo-item-btn" data-proc="${item.procId}" data-id="${item.id}">
                ${idx === 0 ? 'Run oldest overdue check first' : 'Catch up overdue check'}
              </button>
            </div>
          </div>
        `;
      });

      if (!overdueHtml) {
        overdueHtml = '<div class="empty-state-box">No overdue measurements. FIFO queue is clear.</div>';
      }

      subviewHtml = `
        <div class="countdown-banner-card">
          <div>
            <div class="text-xs uppercase text-cyan font-bold mb-1">Countdown timer to next examination:</div>
            <div class="countdown-digits live-schedule-countdown">${initialCountdownFormatted}</div>
            <div class="text-secondary text-sm mt-1">Next scheduled check: Blood Pressure and SpO2 Measurement : Adam Kolosa</div>
          </div>
          <div>
            <button class="btn btn-primary btn-lg start-specific-proc-btn" data-proc="proc-cisnienie">
              Start current check
            </button>
          </div>
        </div>

        <div class="schedule-columns-grid">
          <div class="fifo-card-panel">
            <div class="fifo-panel-head">
              <div>
                <h3 class="font-bold text-lg text-white">Overdue Checks and Measurements: FIFO Queue</h3>
                <p class="text-muted text-xs mt-1">Missed checks enter a First-In First-Out queue so the oldest overdue items are cleared first.</p>
              </div>
              <span class="status-pill badge-warning">${(schedule.overdueFifoQueue || []).length} queued</span>
            </div>
            <div class="fifo-items-wrap">
              ${overdueHtml}
            </div>
          </div>

          <div class="fifo-card-panel">
            <div class="fifo-panel-head">
              <div>
                <h3 class="font-bold text-lg text-white">Upcoming Checks and Measurements</h3>
                <p class="text-muted text-xs mt-1">Chronological schedule of upcoming checks providing clear visibility into next duties.</p>
              </div>
              <span class="status-pill badge-normal">${(schedule.upcomingTests || []).length} scheduled</span>
            </div>
            <div class="upcoming-items-wrap">
              ${upcomingHtml}
            </div>
          </div>
        </div>
      `;
    }

    // SUBVIEW 3: DEVIATIONS AND PREVENTION
    else if (instrukcjeSubTab === 'prophylaxis') {
      const categories = [
        { id: 'all', name: 'All deviations' },
        { id: 'Cardiovascular and Recovery', name: 'Cardiovascular and Recovery' },
        { id: 'Sleep and Central Nervous System', name: 'Sleep and Central Nervous System' },
        { id: 'Musculoskeletal System', name: 'Musculoskeletal System' },
        { id: 'Biochemistry and Stress: Sweat Analysis', name: 'Biochemistry and Stress: Sweat Analysis' },
        { id: 'Cabin and Suit Environment', name: 'Cabin and Suit Environment' }
      ];

      let pillsHtml = '';
      categories.forEach(function(cat) {
        const act = prophylaxisCategory === cat.id ? 'active' : '';
        pillsHtml += `<button class="filter-pill ${act} filter-proph-btn" data-cat="${cat.id}">${cat.name}</button>`;
      });

      const guidelines = appState.prophylaxisGuidelines || [];
      const filtered = guidelines.filter(function(item) {
        const matchCat = prophylaxisCategory === 'all' || item.category === prophylaxisCategory;
        const matchSearch = !prophylaxisSearch ||
          item.symptom.toLowerCase().indexOf(prophylaxisSearch.toLowerCase()) !== -1 ||
          item.guideline.toLowerCase().indexOf(prophylaxisSearch.toLowerCase()) !== -1 ||
          item.category.toLowerCase().indexOf(prophylaxisSearch.toLowerCase()) !== -1;
        return matchCat && matchSearch;
      });

      let prophCardsHtml = '';
      filtered.forEach(function(item) {
        prophCardsHtml += `
          <div class="prophylaxis-item-card">
            <div class="d-flex justify-between align-center">
              <span class="inst-category-chip">${item.category}</span>
              <span class="status-pill badge-warning">Deviation detected</span>
            </div>
            <h4 class="prophylaxis-symptom-title">${item.symptom}</h4>
            <div class="prophylaxis-action-box">
              <div class="text-xs font-bold uppercase text-cyan mb-1">Recommended preventive action:</div>
              <div>${item.guideline}</div>
            </div>
            <div class="mt-auto pt-2">
              <button class="btn btn-outline btn-xs apply-proph-btn">Confirm prophylaxis applied</button>
            </div>
          </div>
        `;
      });

      if (!prophCardsHtml) {
        prophCardsHtml = '<div class="empty-state-box">No preventive guidelines match the selected search criteria.</div>';
      }

      subviewHtml = `
        <div class="filter-bar-card">
          <div class="search-box-wrap">
            <input type="text" id="proph-search-input" class="search-input" placeholder="Search parameter or deviation symptom..." value="${prophylaxisSearch}" />
          </div>
          <div class="categories-row">
            ${pillsHtml}
          </div>
        </div>

        <div class="prophylaxis-grid">
          ${prophCardsHtml}
        </div>
      `;
    }

    // SUBVIEW 4: CRITICAL SCENARIOS
    else if (instrukcjeSubTab === 'critical') {
      const categories = [
        { id: 'all', name: 'All rescue scenarios' },
        { id: 'Cardiovascular and Life Threat', name: 'Cardiovascular and Life Threat' },
        { id: 'Central Nervous System and Cognitive Function', name: 'Central Nervous System and Cognitive Function' },
        { id: 'Muscles, Musculoskeletal System and Trauma', name: 'Muscles, Musculoskeletal System and Trauma' },
        { id: 'Biochemistry, Metabolism and Acute Inflammation: Sweat Analysis', name: 'Biochemistry and Metabolism' },
        { id: 'Cabin and Suit Environmental Hazards', name: 'Cabin and Suit Environment' }
      ];

      let pillsHtml = '';
      categories.forEach(function(cat) {
        const act = criticalCategory === cat.id ? 'active' : '';
        pillsHtml += `<button class="filter-pill ${act} filter-crit-btn" data-cat="${cat.id}">${cat.name}</button>`;
      });

      const scenarios = appState.criticalScenarios || [];
      const filtered = scenarios.filter(function(item) {
        const matchCat = criticalCategory === 'all' || item.category === criticalCategory;
        const matchSearch = !criticalSearch ||
          item.title.toLowerCase().indexOf(criticalSearch.toLowerCase()) !== -1 ||
          item.action.toLowerCase().indexOf(criticalSearch.toLowerCase()) !== -1 ||
          item.category.toLowerCase().indexOf(criticalSearch.toLowerCase()) !== -1;
        return matchCat && matchSearch;
      });

      let critCardsHtml = '';
      filtered.forEach(function(item) {
        critCardsHtml += `
          <div class="critical-card-item">
            <div class="d-flex justify-between align-center">
              <span class="status-pill badge-critical">Emergency procedure</span>
              <span class="inst-category-chip">${item.category}</span>
            </div>
            <h4 class="critical-symptom-title">${item.title}</h4>
            <div class="critical-action-box">
              <div class="text-xs font-bold uppercase text-red mb-1">Emergency crew and flight surgeon response:</div>
              <div>${item.action}</div>
            </div>
            <div class="mt-auto pt-2">
              <button class="btn btn-danger btn-xs trigger-emergency-btn">Initiate emergency protocol</button>
            </div>
          </div>
        `;
      });

      if (!critCardsHtml) {
        critCardsHtml = '<div class="empty-state-box">No critical scenarios match the selected filters.</div>';
      }

      subviewHtml = `
        <div class="critical-header-alert">
          <h3 class="font-bold text-lg text-white mb-1">Critical Scenarios: Requiring External Intervention and Rescue Action</h3>
          <p class="text-secondary text-sm">In the event of life-threatening conditions or acute physiological decompensation, execute the rescue protocols below immediately.</p>
        </div>

        <div class="filter-bar-card">
          <div class="search-box-wrap">
            <input type="text" id="crit-search-input" class="search-input" placeholder="Search critical scenario..." value="${criticalSearch}" />
          </div>
          <div class="categories-row">
            ${pillsHtml}
          </div>
        </div>

        <div class="prophylaxis-grid">
          ${critCardsHtml}
        </div>
      `;
    }

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Instructions, Schedule and Medical Prevention</h1>
          <p class="view-subtitle">Sequential step-by-step procedures, FIFO backlog queue, and preventive/emergency protocols</p>
        </div>
        <div class="badge-tag">Protocol ARES-MED-V5</div>
      </div>

      <div class="instrukcje-subnav">
        <button class="subnav-btn ${instrukcjeSubTab === 'step' ? 'active' : ''}" data-subtab="step">
          1. Step-by-Step Procedures
        </button>
        <button class="subnav-btn ${instrukcjeSubTab === 'schedule' ? 'active' : ''}" data-subtab="schedule">
          2. Schedule and FIFO Queue
        </button>
        <button class="subnav-btn ${instrukcjeSubTab === 'prophylaxis' ? 'active' : ''}" data-subtab="prophylaxis">
          3. Deviations and Prevention
        </button>
        <button class="subnav-btn ${instrukcjeSubTab === 'critical' ? 'active' : ''}" data-subtab="critical">
          4. Critical and Rescue Scenarios
        </button>
      </div>

      ${subviewHtml}
    `;

    // Subtab navigation listeners
    mainEl.querySelectorAll('.subnav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        instrukcjeSubTab = btn.getAttribute('data-subtab');
        renderInstrukcje();
      });
    });

    // Step procedure selector listener
    const selectProcEl = document.getElementById('select-step-proc');
    if (selectProcEl) {
      selectProcEl.addEventListener('change', function() {
        activeStepProcId = selectProcEl.value;
        currentStepIndex = 0;
        completedStepsHistory = [];
        renderInstrukcje();
      });
    }

    // Next step / finish button listener
    const nextStepBtn = document.getElementById('btn-next-step');
    if (nextStepBtn) {
      nextStepBtn.addEventListener('click', function() {
        const procedures = appState.stepProcedures || [];
        const currentProc = procedures.find(function(p) { return p.id === activeStepProcId; }) || procedures[0];
        const totalSteps = currentProc ? currentProc.steps.length : 1;
        if (currentStepIndex < totalSteps) {
          completedStepsHistory.push({
            step: currentStepIndex + 1,
            text: currentProc.steps[currentStepIndex],
            time: new Date().toISOString()
          });
          currentStepIndex++;
        }
        renderInstrukcje();
      });
    }

    // Restart procedure button listeners
    const restartBtn = document.getElementById('btn-restart-proc');
    if (restartBtn) {
      restartBtn.addEventListener('click', function() {
        currentStepIndex = 0;
        completedStepsHistory = [];
        renderInstrukcje();
      });
    }
    const restartFinBtn = document.getElementById('btn-restart-proc-fin');
    if (restartFinBtn) {
      restartFinBtn.addEventListener('click', function() {
        currentStepIndex = 0;
        completedStepsHistory = [];
        renderInstrukcje();
      });
    }
    const goSchedBtn = document.getElementById('btn-go-schedule');
    if (goSchedBtn) {
      goSchedBtn.addEventListener('click', function() {
        instrukcjeSubTab = 'schedule';
        renderInstrukcje();
      });
    }

    // Schedule start procedure listeners
    mainEl.querySelectorAll('.start-specific-proc-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const procId = btn.getAttribute('data-proc');
        if (procId) {
          activeStepProcId = procId;
          currentStepIndex = 0;
          completedStepsHistory = [];
          instrukcjeSubTab = 'step';
          renderInstrukcje();
        }
      });
    });

    // FIFO catch-up button listeners
    mainEl.querySelectorAll('.run-fifo-item-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const procId = btn.getAttribute('data-proc');
        const fifoId = btn.getAttribute('data-id');
        if (appState.scheduleData && appState.scheduleData.overdueFifoQueue) {
          appState.scheduleData.overdueFifoQueue = appState.scheduleData.overdueFifoQueue.filter(function(i) {
            return i.id !== fifoId;
          });
        }
        if (procId) {
          activeStepProcId = procId;
          currentStepIndex = 0;
          completedStepsHistory = [];
          instrukcjeSubTab = 'step';
          renderInstrukcje();
        }
      });
    });

    // Prophylaxis filter and search listeners
    mainEl.querySelectorAll('.filter-proph-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        prophylaxisCategory = btn.getAttribute('data-cat');
        renderInstrukcje();
      });
    });
    const prophSearchInput = document.getElementById('proph-search-input');
    if (prophSearchInput) {
      prophSearchInput.addEventListener('input', function(e) {
        prophylaxisSearch = e.target.value.trim();
        renderInstrukcje();
      });
    }
    mainEl.querySelectorAll('.apply-proph-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        btn.textContent = 'Guideline applied';
        btn.disabled = true;
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
      });
    });

    // Critical scenario filter and search listeners
    mainEl.querySelectorAll('.filter-crit-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        criticalCategory = btn.getAttribute('data-cat');
        renderInstrukcje();
      });
    });
    const critSearchInput = document.getElementById('crit-search-input');
    if (critSearchInput) {
      critSearchInput.addEventListener('input', function(e) {
        criticalSearch = e.target.value.trim();
        renderInstrukcje();
      });
    }
    mainEl.querySelectorAll('.trigger-emergency-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        window.alert('Emergency procedure initiated. Telemetry report has been dispatched to the flight surgeon console and onboard crew.');
      });
    });

    enforceConstraints(mainEl);
  }


  // Helper functions for Motivation Module
  function ensureMotivationState() {
    const defMot = INITIAL_DATA.motivation;
    if (!appState.motivation) {
      appState.motivation = JSON.parse(JSON.stringify(defMot));
    }
    const mot = appState.motivation;
    if (!Array.isArray(mot.dailyCheckupLabels) || mot.dailyCheckupLabels.length === 0) {
      mot.dailyCheckupLabels = defMot.dailyCheckupLabels.slice();
    }
    if (!Array.isArray(mot.rewardsCatalog) || mot.rewardsCatalog.length === 0) {
      mot.rewardsCatalog = JSON.parse(JSON.stringify(defMot.rewardsCatalog));
    }
    if (!mot.crewProfiles || typeof mot.crewProfiles !== 'object') {
      mot.crewProfiles = JSON.parse(JSON.stringify(defMot.crewProfiles));
    }
    if (!Array.isArray(mot.teamMilestones)) {
      mot.teamMilestones = JSON.parse(JSON.stringify(defMot.teamMilestones));
    }
    if (!Array.isArray(mot.quotes)) {
      mot.quotes = JSON.parse(JSON.stringify(defMot.quotes));
    }
    if (!Array.isArray(mot.dailyTips)) {
      mot.dailyTips = defMot.dailyTips.slice();
    }
    return mot;
  }

  function getAstroMotivationProfile(astro) {
    const mot = ensureMotivationState();
    const id = astro ? astro.id : 'default';
    if (!mot.crewProfiles[id]) {
      const defProfile = INITIAL_DATA.motivation.crewProfiles[id];
      if (defProfile) {
        mot.crewProfiles[id] = JSON.parse(JSON.stringify(defProfile));
      } else {
        const modelIdx = astro && astro.modelSummary && astro.modelSummary.ogolny && typeof astro.modelSummary.ogolny.indeks === 'number'
          ? Math.round(astro.modelSummary.ogolny.indeks)
          : 92;
        mot.crewProfiles[id] = {
          completedIndices: [0, 1, 2, 3, 4, 5, 6],
          points: 2100,
          streakDays: 7,
          punctualityPct: 92,
          windowStart: 7,
          history7d: [90, 91, 89, 93, 94, 92, modelIdx],
          history30d: [88, 90, 91, modelIdx],
          trend7d: '+2.4%',
          trend30d: '+3.1%',
          redeemed: []
        };
      }
    }
    const prof = mot.crewProfiles[id];
    if (astro && astro.modelSummary && astro.modelSummary.ogolny && typeof astro.modelSummary.ogolny.indeks === 'number') {
      const liveIdx = Math.max(0, Math.min(100, Math.round(astro.modelSummary.ogolny.indeks)));
      prof.history7d[prof.history7d.length - 1] = liveIdx;
    }
    if (!Array.isArray(prof.redeemed)) prof.redeemed = [];
    if (!Array.isArray(prof.completedIndices)) prof.completedIndices = [];
    return prof;
  }

  function formatWindowRange(startHour) {
    const s = Math.max(5, Math.min(21, parseInt(startHour, 10) || 7));
    const e = (s + 3) % 24;
    const pad = function(n) { return String(n).padStart(2, '0') + ':00'; };
    return pad(s) + ' - ' + pad(e);
  }

  function formatPoints(val) {
    const num = Math.max(0, Math.round(Number(val) || 0));
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  function renderAstronautSilhouetteSvg() {
    return `
      <svg width="78" height="78" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="17" r="10" fill="currentColor" opacity="0.92"/>
        <rect x="26" y="13" width="12" height="7" rx="3.5" fill="#060b13" opacity="0.65"/>
        <path d="M18 32 C18 28 22 27 32 27 C42 27 46 28 46 32 L49 44 C50 47 46 49 44 46 L41 37 L41 56 C41 59 37 59 36 56 L34 45 L30 45 L28 56 C27 59 23 59 23 56 L23 37 L20 46 C18 49 14 47 15 44 Z" fill="currentColor" opacity="0.92"/>
        <rect x="28" y="32" width="8" height="5" rx="1.5" fill="#060b13" opacity="0.55"/>
      </svg>
    `;
  }

  function getAstronautVisualStatus(astro) {
    const status = astro && astro.overallStatus ? astro.overallStatus : 'normal';
    const idx = astro && astro.modelSummary && astro.modelSummary.ogolny && typeof astro.modelSummary.ogolny.indeks === 'number'
      ? Math.round(astro.modelSummary.ogolny.indeks)
      : null;
    if (status === 'critical') {
      return {
        cls: 'status-critical',
        dotColor: '#ef4444',
        title: 'Poor examination results',
        subtitle: 'Significant deviations detected : medical officer and commander consult advised',
        indexLabel: idx !== null ? 'Model index: ' + idx + '/100' : 'Critical analysis'
      };
    }
    if (status === 'warning') {
      return {
        cls: 'status-warning',
        dotColor: '#f59e0b',
        title: 'Isolated out-of-range results',
        subtitle: 'Mild parameter deviations : follow-up monitoring and rest recommended',
        indexLabel: idx !== null ? 'Model index: ' + idx + '/100' : 'Observation Required'
      };
    }
    return {
      cls: 'status-normal',
      dotColor: '#10b981',
      title: 'Everything nominal',
      subtitle: 'Parameters stable : full match with baseline profile',
      indexLabel: idx !== null ? 'Model index: ' + idx + '/100' : 'Stable Condition'
    };
  }

  function renderMotywacjaPulpitHtml(mot, astro, prof) {
    const labels = mot.dailyCheckupLabels;
    const totalChecks = labels.length;
    const doneCount = prof.completedIndices.length;
    const readinessPct = Math.min(100, Math.round((doneCount / totalChecks) * 100));
    const isFull = readinessPct >= 100;
    const visStatus = getAstronautVisualStatus(astro);

    const streakBonusPerTask = 100 + prof.streakDays * 5;
    const tasksHtml = labels.map(function(lbl, idx) {
      const done = prof.completedIndices.indexOf(idx) !== -1;
      return `
        <button type="button" class="vitalis-task-item ${done ? 'done' : ''}" data-task-idx="${idx}">
          <span>${lbl}</span>
          <span class="vitalis-task-dot">${done ? 'V' : ''}</span>
        </button>
      `;
    }).join('');

    const is7d = motivationPeriod !== '30d';
    const barsData = is7d ? prof.history7d : prof.history30d;
    const barLabels = is7d
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const avgStability = barsData.length > 0
      ? Math.round(barsData.reduce(function(acc, v) { return acc + v; }, 0) / barsData.length)
      : 90;
    const trendStr = is7d ? prof.trend7d : prof.trend30d;
    const trendIsUp = String(trendStr).indexOf('-') === -1;

    const barsHtml = barsData.map(function(val, i) {
      const clampVal = Math.max(12, Math.min(100, Math.round(val)));
      const barCls = clampVal < 45 ? 'bar-crit' : (clampVal < 75 ? 'bar-warn' : '');
      const lbl = barLabels[i] || ('D' + (i + 1));
      return `
        <div class="vitalis-bar-col" title="${lbl}: ${clampVal}%">
          <div class="vitalis-bar-track">
            <div class="vitalis-bar-fill ${barCls}" style="height: ${clampVal}%;"></div>
          </div>
          <span class="vitalis-bar-lbl">${lbl}</span>
        </div>
      `;
    }).join('');

    const nextReward = mot.rewardsCatalog
      .slice()
      .sort(function(a, b) { return a.cost - b.cost; })
      .find(function(r) { return r.cost > prof.points; }) || mot.rewardsCatalog[0];
    const pointsMissing = nextReward ? Math.max(0, nextReward.cost - prof.points) : 0;
    const rewardPct = nextReward ? Math.min(100, Math.round((prof.points / nextReward.cost) * 100)) : 100;

    return `
      <div class="vitalis-hero-grid">
        <div class="vitalis-card vitalis-readiness-card">
          <div>
            <div class="vitalis-readiness-head">
              <div>
                <div class="vitalis-card-eyebrow">Today Readiness</div>
                <div class="vitalis-readiness-pct">${readinessPct} %</div>
                <div class="vitalis-readiness-meta">
                  <span>${isFull ? 'Full operational readiness : all checks completed today' : doneCount + ' of ' + totalChecks + ' checks completed : +10% per check'}</span>
                </div>
              </div>
              <div class="vitalis-readiness-badge" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>

            <div class="vitalis-track" style="margin: 14px 0 10px 0;">
              <div class="vitalis-fill-emerald" style="width: ${readinessPct}%;"></div>
            </div>

            <div class="vitalis-readiness-meta">
              <span>Check window: ${formatWindowRange(prof.windowStart)}</span>
              <span>Streak bonus: +${streakBonusPerTask} pts</span>
            </div>
          </div>

          <div class="vitalis-readiness-actions">
            ${isFull
              ? '<span class="badge-tag badge-normal">100% Operational Readiness</span>'
              : '<button type="button" id="btn-vitalis-complete-next" class="btn btn-primary">Continue checks +10%</button>'}
            <button type="button" class="btn btn-outline btn-sm" data-vitalis-jump="ustawienia">Change 3h window</button>
          </div>

          <div class="vitalis-tasks-grid">
            ${tasksHtml}
          </div>
        </div>

        <div class="vitalis-card vitalis-silhouette-card">
          <div class="vitalis-card-eyebrow">Body condition by model</div>
          <div class="vitalis-aura ${visStatus.cls}">
            ${renderAstronautSilhouetteSvg()}
          </div>
          <div class="vitalis-status-title">
            <span class="vitalis-status-dot" style="background: ${visStatus.dotColor};"></span>
            <span>${visStatus.title}</span>
          </div>
          <div class="vitalis-status-sub">${visStatus.subtitle}</div>
          <div class="badge-tag">${visStatus.indexLabel}</div>
        </div>
      </div>

      <div class="vitalis-mid-grid">
        <div class="vitalis-card">
          <div class="vitalis-stability-head">
            <div>
              <div class="vitalis-card-eyebrow">Time within norm</div>
              <h3 style="margin-top: 4px; font-size: 18px;">Parameter stability</h3>
            </div>
            <div class="vitalis-period-switch">
              <button type="button" class="vitalis-period-btn ${is7d ? 'active' : ''}" data-vitalis-period="7d">7 days</button>
              <button type="button" class="vitalis-period-btn ${!is7d ? 'active' : ''}" data-vitalis-period="30d">30 days</button>
            </div>
          </div>

          <div class="vitalis-stability-metric-row">
            <span class="vitalis-stability-val">${avgStability}%</span>
            <span class="vitalis-trend-pill ${trendIsUp ? 'vitalis-trend-up' : 'vitalis-trend-down'}">
              ${trendIsUp ? 'Gain ' : 'Change '}${trendStr}
            </span>
          </div>

          <div class="vitalis-bars-grid ${is7d ? '' : 'bars-4'}">
            ${barsHtml}
          </div>
        </div>

        <div class="vitalis-card vitalis-points-card">
          <div class="vitalis-points-row">
            <div>
              <div class="vitalis-card-eyebrow">Mission Points</div>
              <div class="vitalis-points-big">${formatPoints(prof.points)} <span class="vitalis-points-unit">pts</span></div>
            </div>
            <div class="vitalis-medal-badge" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="9" r="6"></circle>
                <path d="M9 14.5 L8 22 L12 19.5 L16 22 L15 14.5"></path>
              </svg>
            </div>
          </div>

          <div>
            <div class="vitalis-readiness-meta" style="margin-bottom: 8px;">
              <span>Next reward: ${nextReward ? nextReward.title : 'Maximum tier'}</span>
              <span style="color: #fbbf24; font-weight: 700;">${pointsMissing > 0 ? formatPoints(pointsMissing) + ' pts needed' : 'Ready to redeem'}</span>
            </div>
            <div class="vitalis-track">
              <div class="vitalis-fill-amber" style="width: ${rewardPct}%;"></div>
            </div>
          </div>

          <div class="vitalis-readiness-meta">
            <span>Punctuality streak: ${prof.streakDays} days in a row</span>
            <span>Punctuality: ${prof.punctualityPct}%</span>
          </div>

          <button type="button" class="btn btn-outline btn-block" data-vitalis-jump="nagrody">
            Open rewards catalog
          </button>
        </div>
      </div>

      <div class="dashboard-split-layout">
        <div class="split-column-main">
          <div class="card-section">
            <div class="section-title-bar">
              <h2>Mission Progress and Crew Support</h2>
              <span class="badge-tag">Day ${mot.missionDay} of ${mot.totalPlannedDays}</span>
            </div>
            <div class="milestones-list">
              ${mot.teamMilestones.map(function(m) {
                return `
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
              }).join('')}
            </div>
          </div>
        </div>

        <div class="split-column-side">
          <div class="side-panel-card breathing-card">
            <h3>Guided Breathing Relaxation</h3>
            <p class="panel-intro-text">Autonomic regulation and cortisol reduction protocol:</p>
            <div class="breathing-display-box">
              <div class="breathing-circle-outer" id="breath-circle">
                <div class="breathing-circle-inner">
                  <div class="breath-phase-name" id="breath-phase-text">Ready</div>
                  <div class="breath-countdown" id="breath-timer-text">0</div>
                </div>
              </div>
              <div class="breath-instruction" id="breath-instruction-text">
                Press the button below to begin session
              </div>
            </div>
            <div class="breathing-controls">
              <button type="button" id="btn-toggle-breath" class="btn btn-primary btn-block">Start session</button>
            </div>
          </div>

          <div class="side-panel-card">
            <h3>Daily Psychological Tip</h3>
            <div class="daily-tip-box" id="daily-tip-box">
              <p id="tip-text" class="tip-text">${mot.dailyTips[0]}</p>
            </div>
            <button type="button" id="btn-next-tip" class="btn btn-outline btn-block mt-2">Next tip</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMotywacjaZdrowieHtml(astro) {
    const eclss = appState.eclssCabin || { temp: 24.1, pressure: 101.3, humidity: 39, co2: 2641 };
    const v = astro && astro.vitals ? astro.vitals : {};
    const avg30 = function(cur, drift) {
      const n = Number(cur);
      return Number.isFinite(n) ? (n + drift).toFixed(1) : '-';
    };
    const rows = [
      {
        name: 'Cabin temperature',
        source: 'ECLSS OSDR',
        cur: eclss.temp + ' deg C',
        avg: avg30(eclss.temp, -0.3) + ' deg C',
        norm: '21.0 - 25.5 deg C',
        ok: Number(eclss.temp) >= 21.0 && Number(eclss.temp) <= 25.5
      },
      {
        name: 'Cabin pressure',
        source: 'ECLSS',
        cur: eclss.pressure + ' kPa',
        avg: avg30(eclss.pressure, -0.1) + ' kPa',
        norm: 'Baseline ~101.3 kPa',
        ok: Number(eclss.pressure) >= 99.0 && Number(eclss.pressure) <= 103.0
      },
      {
        name: 'Relative humidity',
        source: 'ECLSS OSDR',
        cur: eclss.humidity + '%',
        avg: Math.round(Number(eclss.humidity || 39) + 2) + '%',
        norm: 'Controlled: 30 - 60%',
        ok: Number(eclss.humidity) >= 30 && Number(eclss.humidity) <= 60
      },
      {
        name: 'Cabin CO2 concentration',
        source: 'ECLSS OSDR',
        cur: eclss.co2 + ' ppm',
        avg: Math.round(Number(eclss.co2 || 2641) - 110) + ' ppm',
        norm: 'Operational limit below 3000 ppm',
        ok: Number(eclss.co2) < 3000
      },
      {
        name: 'Resting heart rate',
        source: 'Garmin Biometrics',
        cur: (v.hr || 68) + ' bpm',
        avg: Math.round(Number(v.hr || 68) - 2) + ' bpm',
        norm: 'Baseline: 50 - 90 bpm',
        ok: Number(v.hr) >= 50 && Number(v.hr) <= 90
      },
      {
        name: 'SpO2 saturation',
        source: 'Pulse oximeter',
        cur: (v.spo2 || 98) + '%',
        avg: Math.min(100, Number(v.spo2 || 98) + 0.4).toFixed(1) + '%',
        norm: 'Baseline: 95 - 100%',
        ok: Number(v.spo2) >= 95
      },
      {
        name: 'Sweat cortisol',
        source: 'Biopatch',
        cur: (v.cortisol || 4.2) + ' ng/ml',
        avg: avg30(v.cortisol || 4.2, -0.4) + ' ng/ml',
        norm: 'Baseline: below 10 ng/ml',
        ok: Number(v.cortisol || 4.2) < 10.0
      },
      {
        name: 'EEG cognitive readiness',
        source: 'EEG sensor',
        cur: (v.cognitiveReadiness || 90) + '%',
        avg: Math.min(100, Math.round(Number(v.cognitiveReadiness || 90) + 3)) + '%',
        norm: 'Baseline: 75 - 100%',
        ok: Number(v.cognitiveReadiness || 90) >= 75
      }
    ];

    const cardsHtml = rows.map(function(r) {
      return `
        <div class="vitalis-health-card">
          <div class="vitalis-health-top">
            <div>
              <div style="font-weight: 700; font-size: 14px;">${r.name}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${r.source}</div>
            </div>
            <span class="badge-tag ${r.ok ? 'badge-normal' : 'badge-warning'}">${r.ok ? 'Normal' : 'Out of range'}</span>
          </div>
          <div class="vitalis-health-val">${r.cur}</div>
          <div class="vitalis-health-avg">30-day average: ${r.avg}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">${r.norm}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="card-section">
        <div class="section-title-bar">
          <div>
            <h2>Current Health and Cabin Metrics with 30-Day Averages</h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              Live biometric and ECLSS cabin summary compared against operational limits and 30-day baselines
            </p>
          </div>
          <span class="badge-tag badge-normal">Systems online</span>
        </div>
        <div class="vitalis-health-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  function renderMotywacjaNagrodyHtml(mot, prof) {
    const cardsHtml = mot.rewardsCatalog.map(function(rew) {
      const canBuy = prof.points >= rew.cost;
      const missing = Math.max(0, rew.cost - prof.points);
      const pct = Math.min(100, Math.round((prof.points / rew.cost) * 100));
      return `
        <div class="vitalis-reward-card ${canBuy ? 'available' : ''}">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="badge-tag">${rew.category}</span>
              <span class="vitalis-reward-cost">${formatPoints(rew.cost)} pts</span>
            </div>
            <h3 style="font-size: 16px; margin-bottom: 6px;">${rew.title}</h3>
            <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">${rew.description}</p>
          </div>
          <div>
            <div class="vitalis-track" style="margin-bottom: 8px;">
              <div class="vitalis-fill-amber" style="width: ${pct}%;"></div>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">
              ${canBuy ? 'Available to redeem immediately' : formatPoints(missing) + ' pts remaining to unlock'}
            </div>
            ${canBuy
              ? '<button type="button" class="btn btn-primary btn-block btn-redeem-reward" data-reward-id="' + rew.id + '">Redeem for ' + formatPoints(rew.cost) + ' pts</button>'
              : '<button type="button" class="btn btn-outline btn-block" disabled>Locked</button>'}
          </div>
        </div>
      `;
    }).join('');

    const redeemedHtml = prof.redeemed.length > 0
      ? prof.redeemed.map(function(item) {
          return '<div class="milestone-item milestone-achieved"><div class="milestone-content"><div class="milestone-title-row"><span class="milestone-title">' + item.title + '</span><span class="milestone-date">' + item.date + '</span></div><p class="milestone-desc">Redeemed for ' + formatPoints(item.cost) + ' mission pts</p></div></div>';
        }).join('')
      : '<p style="font-size: 13px; color: var(--text-muted);">No redeemed perks in the current session.</p>';

    return `
      <div class="vitalis-balance-banner">
        <div>
          <div class="vitalis-card-eyebrow">Mission Points Balance</div>
          <div class="vitalis-points-big" style="margin-top: 6px;">${formatPoints(prof.points)} <span class="vitalis-points-unit">pts</span></div>
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px; max-width: 620px;">
            Points are awarded for punctuality and regularity in completing checks. Longer unbroken streaks earn higher bonuses redeemable for crew privileges.
          </p>
        </div>
        <div class="safe-days-col">
          <span class="safe-days-count" style="color: #fbbf24;">${prof.streakDays}</span>
          <span class="safe-days-title">Consecutive Streak Days</span>
          <span class="safe-days-sub">Bonus: +${100 + prof.streakDays * 5} pts per check</span>
        </div>
      </div>

      <div class="card-section">
        <div class="section-title-bar">
          <h2>Available Mission Rewards and Perks</h2>
          <span class="badge-tag">Motivation System</span>
        </div>
        <div class="vitalis-rewards-grid">
          ${cardsHtml}
        </div>
      </div>

      <div class="card-section">
        <div class="section-title-bar">
          <h2>Redeemed Perks</h2>
          <span class="badge-tag">${prof.redeemed.length} items</span>
        </div>
        <div class="milestones-list">
          ${redeemedHtml}
        </div>
      </div>
    `;
  }

  function renderMotywacjaRankingHtml(mot, currentAstro) {
    const entries = appState.astronauts.map(function(a) {
      const p = getAstroMotivationProfile(a);
      const readiness = Math.min(100, Math.round((p.completedIndices.length / mot.dailyCheckupLabels.length) * 100));
      const modelIdx = a.modelSummary && a.modelSummary.ogolny && typeof a.modelSummary.ogolny.indeks === 'number'
        ? Math.round(a.modelSummary.ogolny.indeks)
        : 90;
      return {
        astro: a,
        profile: p,
        readiness: readiness,
        modelIdx: modelIdx
      };
    });

    entries.sort(function(a, b) {
      return b.profile.points - a.profile.points;
    });

    const rowsHtml = entries.length > 0
      ? entries.map(function(item, idx) {
          const isMe = currentAstro && item.astro.id === currentAstro.id;
          return `
            <div class="vitalis-rank-row ${isMe ? 'rank-current' : ''}">
              <div style="display: flex; align-items: center; gap: 14px;">
                <span class="vitalis-rank-num">#${idx + 1}</span>
                <div>
                  <div style="font-weight: 700; font-size: 15px;">${item.astro.name}</div>
                  <div style="font-size: 12px; color: var(--text-secondary);">
                    Streak: ${item.profile.streakDays} days | Punctuality: ${item.profile.punctualityPct}% | Today readiness: ${item.readiness}%
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="badge-tag">Model: ${item.modelIdx}/100</span>
                <span style="font-family: var(--font-mono); font-weight: 800; font-size: 16px; color: #fbbf24;">${formatPoints(item.profile.points)} pts</span>
              </div>
            </div>
          `;
        }).join('')
      : '<p style="font-size: 13px; color: var(--text-muted);">No active astronauts in crew ranking.</p>';

    return `
      <div class="card-section">
        <div class="section-title-bar">
          <div>
            <h2>Crew Punctuality and Points Leaderboard</h2>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
              Leaderboard tracking points earned for regular checks completed within each flexible 3-hour window and streak bonuses
            </p>
          </div>
          <span class="badge-tag">${entries.length} crew members</span>
        </div>
        <div class="vitalis-ranking-list">
          ${rowsHtml}
        </div>
      </div>
    `;
  }

  function renderMotywacjaUstawieniaHtml(prof, astro) {
    const startHours = [6, 7, 8, 9, 11, 14, 17, 19];
    const currentWin = parseInt(prof.windowStart, 10) || 7;
    const theme = appState.themeMode === 'day' ? 'day' : 'night';

    const winBtnsHtml = startHours.map(function(h) {
      const active = h === currentWin;
      return `
        <button type="button" class="vitalis-window-btn ${active ? 'active' : ''}" data-window-start="${h}">
          ${formatWindowRange(h)}
        </button>
      `;
    }).join('');

    return `
      <div class="vitalis-settings-grid">
        <div class="vitalis-card">
          <div class="vitalis-card-eyebrow">Measurement Schedule</div>
          <h2 style="font-size: 18px; margin-top: 4px;">Flexible 3-Hour Measurement Window</h2>
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
            Instead of a rigid measurement timestamp, select a 3-hour window tailored to ${astro ? astro.name : ''} shift duties. Completing checks inside this window preserves your streak.
          </p>
          <div style="margin-top: 14px; font-size: 13px;">
            Active window: <strong style="color: var(--primary-cyan); font-family: var(--font-mono);">${formatWindowRange(currentWin)}</strong>
          </div>
          <div class="vitalis-window-grid">
            ${winBtnsHtml}
          </div>
        </div>

        <div class="vitalis-card">
          <div class="vitalis-card-eyebrow">Visual Comfort</div>
          <h2 style="font-size: 18px; margin-top: 4px;">Day and Night Interface Theme</h2>
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
            Switch UI color theme to match module ambient lighting. Orbital night mode lowers visual strain during night watches.
          </p>
          <div class="vitalis-theme-options">
            <button type="button" class="vitalis-theme-btn ${theme === 'night' ? 'active' : ''}" data-theme-select="night">
              <strong style="font-size: 14px;">Orbital night mode</strong>
              <span style="font-size: 12px; color: var(--text-secondary);">Low-glare dark interface</span>
            </button>
            <button type="button" class="vitalis-theme-btn ${theme === 'day' ? 'active' : ''}" data-theme-select="day">
              <strong style="font-size: 14px;">Station day mode</strong>
              <span style="font-size: 12px; color: var(--text-secondary);">Higher-luminance daytime palette</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // VIEW 4: Motivation Module
  function renderMotywacja() {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;
    if (breathingActive) {
      stopBreathingExercise();
    }

    const mot = ensureMotivationState();
    const commanderFlag = isCommander();
    const currentUser = getCurrentUser();
    let targetAstro = null;

    if (commanderFlag) {
      targetAstro = getAstronautById(selectedAstroId) || (appState.astronauts && appState.astronauts[0]) || null;
      if (targetAstro) selectedAstroId = targetAstro.id;
    } else {
      targetAstro = getAstronautById(appState.currentUser) || (appState.astronauts && appState.astronauts[0]) || null;
    }

    const prof = getAstroMotivationProfile(targetAstro);
    const displayName = targetAstro ? targetAstro.name.split(' ')[0] : (currentUser ? currentUser.name.split(' ')[0] : 'Astronaut');
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    const astroSelectHtml = commanderFlag && appState.astronauts.length > 0
      ? '<div style="display: flex; align-items: center; gap: 10px;"><label for="mot-astro-select" style="font-size: 12px; color: var(--text-secondary); font-weight: 700;">Profile:</label><select id="mot-astro-select" class="live-select-input">' +
        appState.astronauts.map(function(a) {
          return '<option value="' + a.id + '" ' + (targetAstro && a.id === targetAstro.id ? 'selected' : '') + '>' + a.name + '</option>';
        }).join('') + '</select></div>'
      : '';

    let contentHtml = '';
    if (motivationSubTab === 'zdrowie') {
      contentHtml = renderMotywacjaZdrowieHtml(targetAstro);
    } else if (motivationSubTab === 'nagrody') {
      contentHtml = renderMotywacjaNagrodyHtml(mot, prof);
    } else if (motivationSubTab === 'ranking') {
      contentHtml = renderMotywacjaRankingHtml(mot, targetAstro);
    } else if (motivationSubTab === 'ustawienia') {
      contentHtml = renderMotywacjaUstawieniaHtml(prof, targetAstro);
    } else {
      contentHtml = renderMotywacjaPulpitHtml(mot, targetAstro, prof);
    }

    mainEl.innerHTML = `
      <div class="vitalis-topbar">
        <div>
          <div class="vitalis-greeting-date">${todayStr} | Mission day ${mot.missionDay}</div>
          <h1 class="view-title">Good day, ${displayName}</h1>
          <p class="view-subtitle">Crew Motivation Module : check readiness, parameter stability, mission points, and rewards</p>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          ${astroSelectHtml}
          <span class="badge-tag">${formatPoints(prof.points)} mission pts</span>
        </div>
      </div>

      <div class="vitalis-subnav" role="tablist" aria-label="Motivation Module Sections">
        <button type="button" class="vitalis-subtab-btn ${motivationSubTab === 'pulpit' ? 'active' : ''}" data-vitalis-tab="pulpit">
          Readiness Dashboard
        </button>
        <button type="button" class="vitalis-subtab-btn ${motivationSubTab === 'zdrowie' ? 'active' : ''}" data-vitalis-tab="zdrowie">
          Health and 30 Days
        </button>
        <button type="button" class="vitalis-subtab-btn ${motivationSubTab === 'nagrody' ? 'active' : ''}" data-vitalis-tab="nagrody">
          Rewards and Points
        </button>
        <button type="button" class="vitalis-subtab-btn ${motivationSubTab === 'ranking' ? 'active' : ''}" data-vitalis-tab="ranking">
          Crew Ranking
        </button>
        <button type="button" class="vitalis-subtab-btn ${motivationSubTab === 'ustawienia' ? 'active' : ''}" data-vitalis-tab="ustawienia">
          3h Window and Mode
        </button>
      </div>

      ${contentHtml}
    `;

    // Motivation subtab switch listeners
    mainEl.querySelectorAll('[data-vitalis-tab]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        motivationSubTab = btn.getAttribute('data-vitalis-tab');
        renderMotywacja();
      });
    });

    mainEl.querySelectorAll('[data-vitalis-jump]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        motivationSubTab = btn.getAttribute('data-vitalis-jump');
        renderMotywacja();
      });
    });

    const astroSel = document.getElementById('mot-astro-select');
    if (astroSel) {
      astroSel.addEventListener('change', function() {
        selectedAstroId = astroSel.value;
        renderMotywacja();
      });
    }

    // 7 days / 30 days toggle listeners
    mainEl.querySelectorAll('[data-vitalis-period]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        motivationPeriod = btn.getAttribute('data-vitalis-period');
        renderMotywacja();
      });
    });

    // Complete next check +10% listener
    const completeNextBtn = document.getElementById('btn-vitalis-complete-next');
    if (completeNextBtn) {
      completeNextBtn.addEventListener('click', function() {
        const total = mot.dailyCheckupLabels.length;
        for (let i = 0; i < total; i++) {
          if (prof.completedIndices.indexOf(i) === -1) {
            prof.completedIndices.push(i);
            prof.points += 100 + prof.streakDays * 5;
            break;
          }
        }
        saveState(appState);
        renderMotywacja();
      });
    }

    // Manual check task toggle listener
    mainEl.querySelectorAll('.vitalis-task-item').forEach(function(itemBtn) {
      itemBtn.addEventListener('click', function() {
        const idx = parseInt(itemBtn.getAttribute('data-task-idx'), 10);
        const pos = prof.completedIndices.indexOf(idx);
        const deltaPts = 100 + prof.streakDays * 5;
        if (pos === -1) {
          prof.completedIndices.push(idx);
          prof.points += deltaPts;
        } else {
          prof.completedIndices.splice(pos, 1);
          prof.points = Math.max(0, prof.points - deltaPts);
        }
        saveState(appState);
        renderMotywacja();
      });
    });

    // Redeem reward button listener
    mainEl.querySelectorAll('.btn-redeem-reward').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const rewId = btn.getAttribute('data-reward-id');
        const rew = mot.rewardsCatalog.find(function(r) { return r.id === rewId; });
        if (!rew || prof.points < rew.cost) return;
        prof.points -= rew.cost;
        prof.redeemed.unshift({
          id: rew.id,
          title: rew.title,
          cost: rew.cost,
          date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        });
        saveState(appState);
        renderMotywacja();
      });
    });

    // 3-hour window selector listener
    mainEl.querySelectorAll('[data-window-start]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        prof.windowStart = parseInt(btn.getAttribute('data-window-start'), 10) || 7;
        saveState(appState);
        renderMotywacja();
      });
    });

    // Day / night theme mode listener
    mainEl.querySelectorAll('[data-theme-select]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        applyThemeMode(btn.getAttribute('data-theme-select'));
        saveState(appState);
        renderMotywacja();
      });
    });

    // Breathing exercise button listener
    const toggleBreathBtn = document.getElementById('btn-toggle-breath');
    if (toggleBreathBtn) {
      toggleBreathBtn.addEventListener('click', function() {
        if (breathingActive) {
          stopBreathingExercise();
          toggleBreathBtn.textContent = 'Start session';
          toggleBreathBtn.classList.remove('btn-danger');
          toggleBreathBtn.classList.add('btn-primary');
        } else {
          startBreathingExercise();
          toggleBreathBtn.textContent = 'Stop session';
          toggleBreathBtn.classList.remove('btn-primary');
          toggleBreathBtn.classList.add('btn-danger');
        }
      });
    }

    // Next psychological tip listener
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

    enforceConstraints(mainEl);
  }

  // Breathing session timer helpers
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

    if (phaseEl) phaseEl.textContent = 'Ready';
    if (timerEl) timerEl.textContent = '0';
    if (instrEl) instrEl.textContent = 'Press the button below to begin session';
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

  // VIEW 4B: Daily Schedule - empty without sample data
  function renderHarmonogramDnia() {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Daily Schedule</h1>
          <p class="view-subtitle">Daily task and examination plan</p>
        </div>
      </div>

      <div class="card-section" id="daily-schedule-empty-panel">
        <div class="section-title-bar">
          <h2>Schedule items</h2>
          <span class="badge-tag">0 items</span>
        </div>
        <p style="color: var(--text-muted); padding: 36px 16px; text-align: center;">
          The daily schedule is empty. No scheduled items.
        </p>
      </div>
    `;

    enforceConstraints(mainEl);
  }

  // VIEW 5: Medical Event Log
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
          <td><span class="status-pill ${badgeClass}">${priorityLabel(o.priority)}</span></td>
          <td>${o.text}</td>
        </tr>
      `;
    });

    if (!ordersRowsHtml) {
      ordersRowsHtml = '<tr><td colspan="5" class="text-center text-muted">No entries in the medical orders register.</td></tr>';
    }

    let checksRowsHtml = '';
    allChecks.forEach(function(c) {
      checksRowsHtml += `
        <tr>
          <td><span class="mono-date">${c.date}</span></td>
          <td><strong>${c.astroName}</strong></td>
          <td><span class="task-badge ${c.trainedAred ? 'task-done' : 'task-missed'}">${c.trainedAred ? 'Completed' : 'Missed'}</span></td>
          <td><span class="task-badge ${c.trainedT2 ? 'task-done' : 'task-missed'}">${c.trainedT2 ? 'Completed' : 'Missed'}</span></td>
          <td>${c.wellbeing}</td>
        </tr>
      `;
    });

    if (!checksRowsHtml) {
      checksRowsHtml = '<tr><td colspan="5" class="text-center text-muted">No entries in the daily wellbeing log.</td></tr>';
    }

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Event and Medical Report Log</h1>
          <p class="view-subtitle">${commanderFlag ? 'Register of all medical orders and crew wellbeing reports' : 'Log of your daily health check-ins and assigned medical directives'}</p>
        </div>
      </div>

      <div class="card-section mb-4">
        <div class="section-title-bar">
          <h2>Issued Medical Directives and Orders</h2>
          <span class="badge-tag">Order History</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Astronaut</th>
                <th>Author</th>
                <th>Priority</th>
                <th>Directive</th>
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
          <h2>Wellbeing Check-Ins and Exercise Logs</h2>
          <span class="badge-tag">Daily Cards</span>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Astronaut</th>
                <th>ARED Training</th>
                <th>T2 Treadmill</th>
                <th>Reported Wellbeing</th>
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

  // Commander modal for issuing medical orders
  function openOrderModal(astroId) {
    const astro = getAstronautById(astroId);
    if (!astro) return;

    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.id = 'order-modal-backdrop';

    modalBackdrop.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Issue Medical Order</h3>
          <button class="modal-close-btn" id="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-patient-info">
            <span class="patient-label">Subject:</span>
            <strong>${astro.name}</strong>
            ${astro.role ? `<span class="patient-role">${astro.role}</span>` : ''}
          </div>

          <form id="order-submit-form" class="form-vertical">
            <div class="form-group">
              <label for="order-priority" class="form-label">Order priority:</label>
              <select id="order-priority" class="form-input">
                <option value="standard">Standard</option>
                <option value="wysoki">High</option>
                <option value="krytyczny">Critical</option>
              </select>
            </div>

            <div class="form-group">
              <label for="order-text" class="form-label">Medical order text:</label>
              <textarea id="order-text" class="form-textarea" rows="4" placeholder="Enter exact instruction, workout modification, or dosage" required></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Confirm and send</button>
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

  // VIEW 6: Settings and Crew Management
  function renderUstawienia() {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;

    const commanderFlag = isCommander();
    const isRealMode = appState.mode !== 'demo';

    let usersRowsHtml = '';
    appState.users.forEach(function(u) {
      const isCurrent = u.id === appState.currentUser;
      const astro = getAstronautById(u.id);
      const statusLabel = astro ? astro.statusLabel : 'Station staff';
      let statusClass = 'badge-normal';
      if (astro && astro.overallStatus === 'warning') statusClass = 'badge-warning';
      if (astro && astro.overallStatus === 'critical') statusClass = 'badge-critical';

      usersRowsHtml += `
        <tr>
          <td><span class="user-avatar-small">${u.avatarCode}</span></td>
          <td><strong>${u.name}</strong> ${isCurrent ? '<span class="chip-current">You</span>' : ''}</td>
          <td>${u.role || '-'}</td>
          <td><code class="mono-code">${u.login}</code></td>
          <td><code class="mono-code">${u.password}</code></td>
          <td><span class="badge-tag">${u.accessLevel}</span></td>
          <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
          <td>
            <div class="table-actions">
              ${astro ? `<button class="btn btn-outline btn-sm quick-log-vital-btn" data-id="${astro.id}">Log reading</button>` : ''}
              ${!isCurrent && commanderFlag ? `<button class="btn btn-danger btn-sm delete-user-btn" data-id="${u.id}">Remove</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    if (!usersRowsHtml) {
      usersRowsHtml = '<tr><td colspan="8" class="text-center text-muted">No registered user accounts.</td></tr>';
    }

    let astroSelectOptions = '';
    appState.astronauts.forEach(function(a) {
      astroSelectOptions += `<option value="${a.id}">${a.name}${a.role ? ' : ' + a.role : ''}</option>`;
    });

    mainEl.innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Settings and HMS-of-A System Configuration</h1>
          <p class="view-subtitle">Operational mode management, crew registry, access accounts, and telemetry controls</p>
        </div>
        <div class="role-indicator-badge">
          ${isRealMode ? 'Operational mode: Real-world' : 'Operational mode: Demo'}
        </div>
      </div>

      <!-- SECTION 1: Operational mode selection -->
      <div class="card-section mb-4">
        <div class="section-title-bar">
          <h2>System Operational Mode</h2>
          <span class="badge-tag">Environment Config</span>
        </div>
        <p class="settings-desc-text">Choose between real-world operation and demo mode. Real-world mode operates on your active crew and live measurements.</p>

        <div class="mode-cards-grid">
          <div class="mode-option-card ${isRealMode ? 'active' : ''}" id="mode-card-real">
            <div class="mode-card-top">
              <span class="mode-radio-visual ${isRealMode ? 'checked' : ''}"></span>
              <h3 class="mode-card-title">Real-world Operational Mode</h3>
            </div>
            <p class="mode-card-desc">Full environment for monitoring live crew members. All readings, medical orders, and exercise logs are saved to station storage.</p>
            <div class="mode-card-footer">
              <span class="mode-status-text">${isRealMode ? 'Active environment' : 'Click to activate'}</span>
            </div>
          </div>

          <div class="mode-option-card ${!isRealMode ? 'active' : ''}" id="mode-card-demo">
            <div class="mode-card-top">
              <span class="mode-radio-visual ${!isRealMode ? 'checked' : ''}"></span>
              <h3 class="mode-card-title">Mission Demo Mode</h3>
            </div>
            <p class="mode-card-desc">Presentation environment with preconfigured test crew, simulated biometric deviations, and telemetry history for demonstrations.</p>
            <div class="mode-card-footer">
              <span class="mode-status-text">${!isRealMode ? 'Active environment' : 'Click to activate'}</span>
            </div>
          </div>
        </div>

        <div class="mode-actions-bar">
          <button id="btn-reset-demo" class="btn btn-outline btn-sm">
            Restore factory demo dataset
          </button>
          ${commanderFlag ? `
            <button id="btn-clear-mission" class="btn btn-danger btn-sm">
              Clear database for new real-world mission
            </button>
          ` : ''}
        </div>
      </div>

      <!-- SECTION 2: Live telemetry stream and simulation -->
      <div class="card-section mb-4">
        <div class="section-title-bar">
          <h2>Biometric Telemetry Stream and Controls</h2>
          <span class="badge-tag">Data Stream</span>
        </div>
        <p class="settings-desc-text">Manage active telemetry streaming, sampling rate, mission scenarios, and Garmin device import:</p>

        ${renderLiveBarHtml()}
      </div>

      <!-- SECTION 3: Crew and user account management -->
      <div class="card-section mb-4">
        <div class="section-title-bar">
          <h2>Crew and User Account Management</h2>
          ${commanderFlag ? `
            <button id="btn-open-add-astro" class="btn btn-primary btn-sm">
              Add new crew member
            </button>
          ` : ''}
        </div>
        <p class="settings-desc-text">Directory of active access accounts and linked astronaut medical profiles.</p>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Full Name</th>
                <th>Mission Role</th>
                <th>Login</th>
                <th>Password</th>
                <th>Access Level</th>
                <th>Medical Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${usersRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 4: Manual telemetry reading entry -->
      <div class="card-section" id="section-telemetry-entry">
        <div class="section-title-bar">
          <h2>Log New Telemetry Reading</h2>
          <span class="badge-tag">Current Telemetry</span>
        </div>
        ${appState.astronauts.length > 0 ? `
        <p class="settings-desc-text">Enter new biometric instrument readings. Values immediately update status cards and trend charts.</p>

        <form id="telemetry-input-form" class="telemetry-entry-form">
          <div class="form-grid-3">
            <div class="form-group">
              <label for="entry-astro-select" class="form-label">Astronaut:</label>
              <select id="entry-astro-select" class="form-input">
                ${astroSelectOptions}
              </select>
            </div>

            <div class="form-group">
              <label for="entry-hr" class="form-label">Heart rate: bpm</label>
              <input type="number" id="entry-hr" class="form-input" min="40" max="220" value="72" required />
            </div>

            <div class="form-group">
              <label for="entry-bp-sys" class="form-label">Systolic pressure: mmHg</label>
              <input type="number" id="entry-bp-sys" class="form-input" min="70" max="220" value="120" required />
            </div>

            <div class="form-group">
              <label for="entry-bp-dia" class="form-label">Diastolic pressure: mmHg</label>
              <input type="number" id="entry-bp-dia" class="form-input" min="40" max="140" value="80" required />
            </div>

            <div class="form-group">
              <label for="entry-spo2" class="form-label">SpO2 saturation: percent</label>
              <input type="number" id="entry-spo2" class="form-input" min="70" max="100" value="99" required />
            </div>

            <div class="form-group">
              <label for="entry-temp" class="form-label">Temperature: deg C</label>
              <input type="number" id="entry-temp" class="form-input" min="34.0" max="42.0" step="0.1" value="36.6" required />
            </div>

            <div class="form-group">
              <label for="entry-resp" class="form-label">Breaths per minute:</label>
              <input type="number" id="entry-resp" class="form-input" min="8" max="40" value="14" required />
            </div>

            <div class="form-group">
              <label for="entry-rad" class="form-label">Cumulative radiation: mSv</label>
              <input type="number" id="entry-rad" class="form-input" min="0" max="200" step="0.1" value="14.5" required />
            </div>

            <div class="form-group">
              <label for="entry-stress" class="form-label">Stress level: percent</label>
              <input type="number" id="entry-stress" class="form-input" min="0" max="100" value="25" required />
            </div>

            <div class="form-group">
              <label for="entry-bone" class="form-label">Bone density: percent norm</label>
              <input type="number" id="entry-bone" class="form-input" min="50" max="120" value="97" required />
            </div>

            <div class="form-group">
              <label for="entry-muscle" class="form-label">Muscle mass: percent norm</label>
              <input type="number" id="entry-muscle" class="form-input" min="50" max="120" value="98" required />
            </div>

            <div class="form-group">
              <label for="entry-sleep-score" class="form-label">Sleep Score: pts</label>
              <input type="number" id="entry-sleep-score" class="form-input" min="10" max="100" value="88" required />
            </div>

            <div class="form-group">
              <label for="entry-cortisol" class="form-label">Sweat cortisol: ng/ml</label>
              <input type="number" id="entry-cortisol" class="form-input" min="1.0" max="30.0" step="0.1" value="4.2" required />
            </div>

            <div class="form-group">
              <label for="entry-lactate" class="form-label">Sweat lactate: mmol/l</label>
              <input type="number" id="entry-lactate" class="form-input" min="0.5" max="12.0" step="0.1" value="1.6" required />
            </div>

            <div class="form-group">
              <label for="entry-eeg" class="form-label">EEG cognitive readiness: percent</label>
              <input type="number" id="entry-eeg" class="form-input" min="20" max="100" value="92" required />
            </div>

            <div class="form-group">
              <label for="entry-status" class="form-label">Overall status assessment:</label>
              <select id="entry-status" class="form-input">
                <option value="auto" selected>Automatic ML model assessment</option>
                <option value="normal">Stable Condition</option>
                <option value="warning">Observation Required</option>
                <option value="critical">Elevated Risk</option>
              </select>
            </div>
          </div>

          <div class="form-actions-row">
            <button type="submit" class="btn btn-primary">
              Save telemetry reading to database
            </button>
            <span id="telemetry-save-feedback" class="feedback-inline" style="display: none;">Measurement logged and recomputed by the model.</span>
          </div>
        </form>
        ` : `
        <div class="empty-state-box">
          No astronauts defined in the current mission. Use Add new crew member above to create a profile and record biometric data.
        </div>
        `}
      </div>
    `;

    // Real mode switch listener
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
            })
              .then(function(r) { return r.json(); })
              .then(function(res) {
                if (res && res.success) {
                  if (res.users) appState.users = res.users;
                  if (res.astronauts) appState.astronauts = res.astronauts;
                  if (res.crewSummary) appState.crewSummary = res.crewSummary;
                  sanitizeCrewState(appState);
                  saveState(appState);
                  renderApp();
                }
              })
              .catch(function() {});
          }
          saveState(appState);
          renderApp();
        }
      });
    }

    // Demo mode switch listener
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
            })
              .then(function(r) { return r.json(); })
              .then(function(res) {
                if (res && res.success) {
                  if (res.users) appState.users = res.users;
                  if (res.astronauts) appState.astronauts = res.astronauts;
                  if (res.crewSummary) appState.crewSummary = res.crewSummary;
                  sanitizeCrewState(appState);
                  saveState(appState);
                  renderApp();
                }
              })
              .catch(function() {});
          }
          saveState(appState);
          renderApp();
        }
      });
    }

    // Reset demo dataset listener
    const resetDemoBtn = document.getElementById('btn-reset-demo');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', function() {
        const confirmed = window.confirm('Restore factory demonstration dataset? This activates demo mode with the test crew.');
        if (confirmed) {
          appState.mode = 'demo';
          appState.demoUsers = JSON.parse(JSON.stringify(DEMO_USERS));
          appState.demoAstronauts = JSON.parse(JSON.stringify(DEMO_ASTRONAUTS));
          appState.users = JSON.parse(JSON.stringify(DEMO_USERS));
          appState.astronauts = JSON.parse(JSON.stringify(DEMO_ASTRONAUTS));
          appState.currentUser = null;
          if (window.location.protocol.indexOf('http') === 0) {
            fetch('/api/mission/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: 'demo' })
            })
              .then(function(r) { return r.json(); })
              .then(function(res) {
                if (res && res.success) {
                  appState.users = res.users || appState.users;
                  appState.astronauts = res.astronauts || appState.astronauts;
                  if (res.eclssCabin) appState.eclssCabin = res.eclssCabin;
                  if (res.crewSummary) appState.crewSummary = res.crewSummary;
                  sanitizeCrewState(appState);
                  saveState(appState);
                  renderApp();
                }
              })
              .catch(function() {});
          }
          saveState(appState);
          renderApp();
        }
      });
    }

    // Clear mission database listener
    const clearBtn = document.getElementById('btn-clear-mission');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        const confirmed = window.confirm('Clear the database for a new real-world mission? This removes crew accounts and retains only the commander account.');
        if (confirmed) {
          const currentU = getCurrentUser();
          const kierownikUser = (currentU && currentU.id === 'kierownik') ? currentU : DEMO_USERS[0];
          appState.mode = 'real';
          appState.users = [JSON.parse(JSON.stringify(kierownikUser))];
          appState.astronauts = [];
          appState.realUsers = JSON.parse(JSON.stringify(appState.users));
          appState.realAstronauts = [];
          appState.currentUser = null;
          if (window.location.protocol.indexOf('http') === 0) {
            fetch('/api/mission/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target: 'clear' })
            })
              .then(function(r) { return r.json(); })
              .then(function(res) {
                if (res && res.success) {
                  appState.users = res.users || appState.users;
                  appState.astronauts = res.astronauts || [];
                  if (res.crewSummary) appState.crewSummary = res.crewSummary;
                  sanitizeCrewState(appState);
                  saveState(appState);
                  renderApp();
                }
              })
              .catch(function() {});
          }
          saveState(appState);
          renderApp();
        }
      });
    }

    // Open add astronaut modal listener
    const openAddBtn = document.getElementById('btn-open-add-astro');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', function() {
        openAddAstronautModal();
      });
    }

    // Remove user account listener
    mainEl.querySelectorAll('.delete-user-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const uid = btn.getAttribute('data-id');
        const userToDelete = appState.users.find(function(u) { return u.id === uid; });
        const name = userToDelete ? userToDelete.name : uid;
        const confirmed = window.confirm('Are you sure you want to remove account ' + name + ' and linked telemetry?');
        if (confirmed) {
          appState.users = appState.users.filter(function(u) { return u.id !== uid; });
          appState.astronauts = appState.astronauts.filter(function(a) { return a.id !== uid; });
          if (window.location.protocol.indexOf('http') === 0) {
            fetch('/api/astronauts/' + encodeURIComponent(uid), { method: 'DELETE' })
              .then(function(r) { return r.json(); })
              .then(function(res) {
                if (res && res.crewSummary) {
                  appState.crewSummary = res.crewSummary;
                  saveState(appState);
                }
              })
              .catch(function() {});
          }
          saveState(appState);
          renderUstawienia();
        }
      });
    });

    // Quick telemetry entry prefill listener
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

    // Astronaut dropdown change prefills current vital readings
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
          const ssEl = document.getElementById('entry-sleep-score');
          if (ssEl) ssEl.value = v.sleepScore !== undefined ? v.sleepScore : 88;
          const coEl = document.getElementById('entry-cortisol');
          if (coEl) coEl.value = v.cortisol !== undefined ? v.cortisol : 4.2;
          const laEl = document.getElementById('entry-lactate');
          if (laEl) laEl.value = v.lactate !== undefined ? v.lactate : 1.6;
          const egEl = document.getElementById('entry-eeg');
          if (egEl) egEl.value = v.cognitiveReadiness !== undefined ? v.cognitiveReadiness : 92;
          document.getElementById('entry-status').value = 'auto';
        }
      });
    }

    // Manual telemetry entry submit handler
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
        const sleepScore = parseInt(document.getElementById('entry-sleep-score').value, 10);
        const cortisol = parseFloat(document.getElementById('entry-cortisol').value);
        const lactate = parseFloat(document.getElementById('entry-lactate').value);
        const cognitiveReadiness = parseInt(document.getElementById('entry-eeg').value, 10);
        const statusChoice = document.getElementById('entry-status').value;

        targetAstro.vitals.hr = hr;
        targetAstro.vitals.rr = Math.round(60000 / Math.max(hr, 30));
        targetAstro.vitals.bpSys = bpSys;
        targetAstro.vitals.bpDia = bpDia;
        targetAstro.vitals.spo2 = spo2;
        targetAstro.vitals.temp = temp;
        targetAstro.vitals.resp = resp;
        targetAstro.vitals.radDose = rad;
        targetAstro.vitals.stressLevel = stress;
        targetAstro.vitals.boneDensity = bone;
        targetAstro.vitals.muscleMass = muscle;
        targetAstro.vitals.sleepScore = sleepScore;
        targetAstro.vitals.cortisol = cortisol;
        targetAstro.vitals.lactate = lactate;
        targetAstro.vitals.cognitiveReadiness = cognitiveReadiness;

        if (statusChoice === 'normal') {
          targetAstro.overallStatus = 'normal';
          targetAstro.statusLabel = 'Stable Condition';
          targetAstro.statusDescription = 'All biometric indicators remain within the defined safety envelope.';
        } else if (statusChoice === 'warning') {
          targetAstro.overallStatus = 'warning';
          targetAstro.statusLabel = 'Observation Required';
          targetAstro.statusDescription = 'Physiological parameter deviations from baseline detected.';
        } else if (statusChoice === 'critical') {
          targetAstro.overallStatus = 'critical';
          targetAstro.statusLabel = 'Elevated Risk';
          targetAstro.statusDescription = 'Metrics require immediate mission medical attention.';
        }

        const historyLen = targetAstro.telemetryHistory.length;
        targetAstro.telemetryHistory.push({
          day: 'Day ' + (184 + historyLen),
          hr: hr,
          bpSys: bpSys,
          spo2: spo2,
          stress: stress,
          rad: rad
        });

        const showSaved = function() {
          const feedback = document.getElementById('telemetry-save-feedback');
          if (feedback) {
            feedback.style.display = 'inline-block';
            setTimeout(function() { feedback.style.display = 'none'; }, 3500);
          }
        };

        if (window.location.protocol.indexOf('http') === 0) {
          const payload = {
            astroId: targetId,
            hr: hr,
            bpSys: bpSys,
            bpDia: bpDia,
            spo2: spo2,
            temp: temp,
            resp: resp,
            radDose: rad,
            stressLevel: stress,
            boneDensity: bone,
            muscleMass: muscle,
            sleepScore: sleepScore,
            cortisol: cortisol,
            lactate: lactate,
            cognitiveReadiness: cognitiveReadiness
          };
          if (statusChoice !== 'auto') payload.overallStatus = statusChoice;
          fetch('/api/telemetry/entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
            .then(function(r) { return r.json(); })
            .then(function(res) {
              if (res && res.success && res.astronaut) {
                const idx = appState.astronauts.findIndex(function(a) { return a.id === targetId; });
                if (idx !== -1) appState.astronauts[idx] = res.astronaut;
                if (res.crewSummary) appState.crewSummary = res.crewSummary;
                sanitizeCrewState(appState);
                saveState(appState);
              }
              showSaved();
            })
            .catch(function() {
              saveState(appState);
              showSaved();
            });
        } else {
          saveState(appState);
          showSaved();
        }
      });
    }

    bindLiveBarEvents();
    enforceConstraints(mainEl);
  }

  // Modal for creating a new astronaut and account
  function openAddAstronautModal() {
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    modalBackdrop.id = 'add-astro-modal-backdrop';

    modalBackdrop.innerHTML = `
      <div class="modal-dialog modal-dialog-lg">
        <div class="modal-header">
          <h3 class="modal-title">Add New Crew Member and Account</h3>
          <button class="modal-close-btn" id="add-modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form id="new-astronaut-form" class="form-vertical">
            <div class="form-grid-2">
              <div class="form-group">
                <label for="new-astro-name" class="form-label">Full name:</label>
                <input type="text" id="new-astro-name" class="form-input" placeholder="Enter full name" required />
              </div>

              <div class="form-group">
                <label for="new-astro-role" class="form-label">Optional role:</label>
                <input type="text" id="new-astro-role" class="form-input" placeholder="Optional" />
              </div>

              <div class="form-group">
                <label for="new-astro-title" class="form-label">Optional title:</label>
                <input type="text" id="new-astro-title" class="form-input" placeholder="Optional" />
              </div>

              <div class="form-group">
                <label for="new-astro-type" class="form-label">Account type and permissions:</label>
                <select id="new-astro-type" class="form-input">
                  <option value="astro">Astronaut account : Personal dashboard</option>
                  <option value="kierownik">Commander account : Crew oversight</option>
                </select>
              </div>

              <div class="form-group">
                <label for="new-astro-login" class="form-label">Login ID:</label>
                <input type="text" id="new-astro-login" class="form-input" placeholder="Enter login" required autocomplete="username" />
              </div>

              <div class="form-group">
                <label for="new-astro-pass" class="form-label">Access password:</label>
                <input type="password" id="new-astro-pass" class="form-input" placeholder="Enter password" required autocomplete="new-password" />
              </div>

              <div class="form-group">
                <label for="new-astro-age" class="form-label">Age in years:</label>
                <input type="number" id="new-astro-age" class="form-input" min="20" max="75" value="35" required />
              </div>

              <div class="form-group">
                <label for="new-astro-blood" class="form-label">Blood group:</label>
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
              <h4>Initial physiological parameters</h4>
            </div>

            <div class="form-grid-3">
              <div class="form-group">
                <label for="new-astro-hr" class="form-label">Heart rate: bpm</label>
                <input type="number" id="new-astro-hr" class="form-input" value="70" required />
              </div>

              <div class="form-group">
                <label for="new-astro-bp-sys" class="form-label">Pressure: systolic</label>
                <input type="number" id="new-astro-bp-sys" class="form-input" value="120" required />
              </div>

              <div class="form-group">
                <label for="new-astro-bp-dia" class="form-label">Pressure: diastolic</label>
                <input type="number" id="new-astro-bp-dia" class="form-input" value="80" required />
              </div>

              <div class="form-group">
                <label for="new-astro-spo2" class="form-label">SpO2 saturation: percent</label>
                <input type="number" id="new-astro-spo2" class="form-input" value="99" required />
              </div>

              <div class="form-group">
                <label for="new-astro-temp" class="form-label">Temperature: deg C</label>
                <input type="number" id="new-astro-temp" class="form-input" step="0.1" value="36.6" required />
              </div>

              <div class="form-group">
                <label for="new-astro-resp" class="form-label">Breaths per minute:</label>
                <input type="number" id="new-astro-resp" class="form-input" value="14" required />
              </div>
            </div>

            <div id="add-astro-error" class="login-error-box" style="display: none; margin-top: 10px;"></div>

            <div class="modal-actions">
              <button type="button" class="btn btn-outline" id="add-modal-cancel-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Create account and add to database</button>
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

      const loginExists = appState.users.some(function(u) {
        return u.login.toLowerCase() === login.toLowerCase();
      });

      if (loginExists) {
        errEl.textContent = 'Error: That login ID is already in use.';
        errEl.style.display = 'block';
        return;
      }

      const hr = parseInt(document.getElementById('new-astro-hr').value, 10) || 72;
      const bpSys = parseInt(document.getElementById('new-astro-bp-sys').value, 10) || 120;
      const bpDia = parseInt(document.getElementById('new-astro-bp-dia').value, 10) || 80;
      const spo2 = parseInt(document.getElementById('new-astro-spo2').value, 10) || 99;
      const temp = parseFloat(document.getElementById('new-astro-temp').value) || 36.6;
      const resp = parseInt(document.getElementById('new-astro-resp').value, 10) || 14;

      const applyLocalCreate = function() {
        const newId = (type === 'kierownik' ? 'kierownik-' : 'astro-') + Date.now();
        const initials = extractInitials(name);
        const newUser = {
          id: newId,
          login: login,
          password: pass,
          name: name,
          role: type === 'kierownik' ? (role || 'Commander') : '',
          title: '',
          accessLevel: type === 'kierownik' ? 'Full oversight' : 'Personal account',
          avatarCode: initials
        };
        appState.users.push(newUser);
        if (type === 'astro') {
          appState.astronauts.push({
            id: newId,
            name: name,
            role: '',
            avatarCode: initials,
            age: age,
            bloodType: blood,
            missionDay: 184,
            evaHours: 0,
            overallStatus: 'normal',
            statusLabel: 'Stable Condition',
            statusDescription: 'Newly onboarded crew member. Baseline parameters loaded into the system.',
            vitals: {
              hr: hr, hrUnit: 'bpm',
              rr: Math.round(60000 / Math.max(hr, 30)), rrUnit: 'ms',
              hrv: 65, hrvUnit: 'ms',
              bpSys: bpSys, bpDia: bpDia, bpUnit: 'mmHg',
              spo2: spo2, spo2Unit: '%',
              temp: temp, tempUnit: 'deg C',
              resp: resp, respUnit: 'breaths/min',
              radDose: 0.5, radUnit: 'mSv',
              boneDensity: 100, boneUnit: '% norm',
              muscleMass: 100, muscleUnit: '% norm',
              hydration: 98, hydrationUnit: '%',
              sleepHours: 8.0, sleepUnit: 'h',
              sleepScore: 88, sleepScoreUnit: 'pts',
              stressLevel: 15, stressUnit: 'pts',
              bodyBattery: 90, bodyBatteryUnit: 'pts',
              cortisol: 4.0, cortisolUnit: 'ng/ml',
              lactate: 1.5, lactateUnit: 'mmol/l',
              cognitiveReadiness: 92, cognitiveUnit: '%'
            },
            telemetryHistory: [
              { day: 'Day 184', hr: hr, bpSys: bpSys, spo2: spo2, stress: 15, rad: 0.5 }
            ],
            orders: [],
            dailyChecks: []
          });
        }
        saveState(appState);
        closeModal();
        renderApp();
      };

      if (window.location.protocol.indexOf('http') === 0) {
        fetch('/api/astronauts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            role: role,
            title: title,
            type: type,
            login: login,
            password: pass,
            age: age,
            bloodType: blood,
            hr: hr,
            bpSys: bpSys,
            bpDia: bpDia,
            spo2: spo2,
            temp: temp,
            resp: resp
          })
        })
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (res && res.success) {
              if (res.user) appState.users.push(res.user);
              if (res.astronaut) appState.astronauts.push(res.astronaut);
              if (res.crewSummary) appState.crewSummary = res.crewSummary;
              sanitizeCrewState(appState);
              saveState(appState);
              closeModal();
              renderApp();
            } else {
              applyLocalCreate();
            }
          })
          .catch(function() {
            applyLocalCreate();
          });
      } else {
        applyLocalCreate();
      }
    });

    enforceConstraints(modalBackdrop);
  }

  // Main view dispatcher
  function renderApp() {
    applyThemeMode(appState.themeMode || 'night');
    if (activeTab !== 'motywacja' && breathingActive) {
      stopBreathingExercise();
    }
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
    } else if (activeTab === 'harmonogram') {
      renderHarmonogramDnia();
    } else if (activeTab === 'motywacja') {
      renderMotywacja();
    } else if (activeTab === 'dziennik') {
      renderDziennik();
    } else if (activeTab === 'ustawienia') {
      renderUstawienia();
    }

    // Live stream control bar integrated in Settings

    // Ensure strict display rules: no emojis, no parentheses, no long dashes
    enforceConstraints(document.body);
  }

  // Live biometric telemetry control bar
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
            ${totalAstro > 0 ? (isRunning ? 'Biometric Stream: Live' : 'Biometric Stream: Paused') : 'Stream: Waiting for crew'}
          </span>
          <span class="live-packet-tag" id="live-packet-badge">Packet #${packet}</span>
          <span class="live-time-tag" id="live-time-badge">Last reading: ${time} UTC</span>
        </div>

        <div class="live-controls-block">
          <button id="btn-toggle-stream" class="btn btn-xs ${isRunning ? 'btn-outline' : 'btn-success'}">
            ${isRunning ? 'Pause' : 'Resume stream'}
          </button>

          <div class="live-scenario-select-wrap">
            <span class="live-control-label">Mission profile:</span>
            <select id="live-scenario-select" class="live-select-input">
              <option value="resting" ${scenario === 'resting' ? 'selected' : ''}>Baseline Rest</option>
              <option value="training" ${scenario === 'training' ? 'selected' : ''}>ARED Strength Training</option>
              <option value="eva" ${scenario === 'eva' ? 'selected' : ''}>EVA Spacewalk</option>
              <option value="anomaly" ${scenario === 'anomaly' ? 'selected' : ''}>Anomaly Simulation</option>
            </select>
          </div>

          <div class="live-rate-select-wrap">
            <span class="live-control-label">Refresh rate:</span>
            <select id="live-rate-select" class="live-select-input">
              <option value="1000" ${intervalMs === 1000 ? 'selected' : ''}>1 second</option>
              <option value="2500" ${intervalMs === 2500 ? 'selected' : ''}>2.5 seconds</option>
              <option value="5000" ${intervalMs === 5000 ? 'selected' : ''}>5 seconds</option>
            </select>
          </div>

          <button id="btn-load-garmin" class="btn btn-xs btn-primary">
            Load Garmin profile
          </button>
        </div>
      </div>
    `;
  }

  function bindLiveBarEvents() {
    const toggleBtn = document.getElementById('btn-toggle-stream');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        const running = TelemetryStream.toggle(appState);
        toggleBtn.textContent = running ? 'Pause' : 'Resume stream';
        toggleBtn.className = 'btn btn-xs ' + (running ? 'btn-outline' : 'btn-success');
        const beacon = document.getElementById('live-beacon');
        if (beacon) {
          beacon.className = 'live-indicator-beacon ' + (running ? 'active' : 'paused');
        }
        const title = document.getElementById('live-status-title');
        if (title) {
          title.textContent = running ? 'Biometric Stream: Live' : 'Biometric Stream: Paused';
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
                appState.users.push(data.user || {
                  id: data.astronaut.id,
                  login: 'garmin',
                  password: 'kosmos2026',
                  name: data.astronaut.name,
                  role: '',
                  title: '',
                  accessLevel: 'Personal account',
                  avatarCode: data.astronaut.avatarCode
                });
                if (data.crewSummary) appState.crewSummary = data.crewSummary;
                sanitizeCrewState(appState);
                saveState(appState);
                renderApp();
              } else if (data && data.error) {
                window.alert(data.error);
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
          role: '',
          title: '',
          accessLevel: 'Personal account',
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
        window.alert('Garmin sensor profile has already been integrated into the crew.');
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
      title.textContent = totalAstro > 0 ? (isRunning ? 'Biometric Stream: Live' : 'Biometric Stream: Paused') : 'Stream: Waiting for crew';
    }
    const badge = document.getElementById('live-packet-badge');
    if (badge) {
      badge.textContent = 'Packet #' + packet;
    }
    const timeEl = document.getElementById('live-time-badge');
    if (timeEl) {
      timeEl.textContent = 'Last reading: ' + time + ' UTC';
    }
  }

  // Live telemetry packet subscriber
  TelemetryStream.onPacket(function(data) {
    updateLiveBarElements();

    if (activeTab === 'pulpit' && isCommander()) {
      const container = document.getElementById('app-main');
      if (!container) return;

      const eclss = (data && data.eclssCabin) ? data.eclssCabin : (appState.eclssCabin || {});
      const setElText = function(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      if (eclss.temp !== undefined) setElText('eclss-temp', eclss.temp + ' deg C');
      if (eclss.pressure !== undefined) setElText('eclss-pressure', eclss.pressure + ' kPa');
      if (eclss.humidity !== undefined) setElText('eclss-humidity', eclss.humidity + ' %');
      if (eclss.o2 !== undefined) setElText('eclss-o2', eclss.o2 + ' %');
      if (eclss.co2 !== undefined) setElText('eclss-co2', eclss.co2 + ' ppm');
      if (eclss.dailyRadiation !== undefined) setElText('eclss-rad', eclss.dailyRadiation + ' mGy/d');
      if (eclss.waterTanks !== undefined) setElText('eclss-water', eclss.waterTanks + ' %');
      if (eclss.sourceTime) setElText('eclss-source-tag', sanitizeModelText(eclss.sourceTime));

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
            descEl.textContent = sanitizeModelText(a.statusDescription);
          }

          const ms = a.modelSummary || null;
          const modelValEl = cardEl.querySelector('.metric-val-model');
          if (modelValEl) {
            const msIndeks = (ms && ms.ogolny && ms.ogolny.indeks !== null && ms.ogolny.indeks !== undefined) ? Math.round(ms.ogolny.indeks) + '/100' : '--';
            const msAnom = (ms && ms.anomalia && ms.anomalia.wynik !== null && ms.anomalia.wynik !== undefined) ? Math.round(ms.anomalia.wynik) + '/100' : '--';
            modelValEl.textContent = 'Index ' + msIndeks + ' | Anomaly ' + msAnom;
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
            bpVal.textContent = a.vitals.bpSys + '/' + a.vitals.bpDia + ' ' + a.vitals.bpUnit;
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

          const hrvVal = cardEl.querySelector('.metric-val-hrv');
          if (hrvVal) hrvVal.textContent = (a.vitals.hrv || 64) + ' ms';

          const respVal = cardEl.querySelector('.metric-val-resp');
          if (respVal) respVal.textContent = a.vitals.resp + ' breaths/min';

          const stressVal = cardEl.querySelector('.metric-val-stress');
          if (stressVal) {
            stressVal.textContent = a.vitals.stressLevel + ' pts / BB ' + (a.vitals.bodyBattery || 80) + ' pts';
            stressVal.classList.remove('val-updated');
            void stressVal.offsetWidth;
            stressVal.classList.add('val-updated');
          }
        }
      });

      setElText('stat-count-total', totalAstro);
      setElText('stat-count-normal', normalCount);
      setElText('stat-count-warning', warningCount);
      setElText('stat-count-critical', criticalCount);

      const alertBox = document.getElementById('dashboard-alert-box');
      const alertText = document.getElementById('dashboard-alert-text');
      if (alertBox && alertText) {
        if (criticalCount > 0) alertBox.className = 'alert-banner-box banner-critical';
        else if (warningCount > 0) alertBox.className = 'alert-banner-box banner-warning';
        else alertBox.className = 'alert-banner-box banner-info';

        if (appState.crewSummary && appState.crewSummary.summaryText) {
          alertText.textContent = sanitizeModelText(appState.crewSummary.summaryText);
        } else if (criticalCount > 0) {
          alertText.textContent = 'Elevated cardiovascular risk detected in a crew member. Immediate intervention protocol recommended.';
        } else if (warningCount > 0) {
          alertText.textContent = 'Biometric parameters of a crew member require closer observation.';
        } else if (totalAstro === 0) {
          alertText.textContent = 'No active mission crew. Open Settings to onboard orbital personnel.';
        } else {
          alertText.textContent = 'All monitored astronauts maintain satisfactory physiological balance.';
        }
      }

      const crewModelPanel = document.getElementById('crew-model-summary-panel');
      if (crewModelPanel) {
        crewModelPanel.innerHTML = renderCrewModelSummaryInnerHtml(appState.crewSummary, appState.astronauts, eclss);
      }

      const avgHr = totalAstro > 0 ? Math.round(totalHr / totalAstro) : 0;
      const avgSpo2 = totalAstro > 0 ? Math.round(totalSpo2 / totalAstro) : 0;
      const avgRad = totalAstro > 0 ? Math.round((totalRad / totalAstro) * 10) / 10 : 0;

      setElText('agg-val-hr', avgHr + ' bpm');
      setElText('agg-val-spo2', avgSpo2 + ' %');
      setElText('agg-val-rad', avgRad + ' mSv');

      TelemetryCharts.renderCrewComparison('crew-hr-chart', appState.astronauts, 'hr', 'Heart Rate', 'bpm');
      TelemetryCharts.renderCrewComparison('crew-stress-chart', appState.astronauts, 'stressLevel', 'Stress Level', '%');
      enforceConstraints(container);
    }

    if (activeTab === 'pulpit' && !isCommander()) {
      const currentAstro = getAstronautById(appState.currentUser);
      if (currentAstro && currentAstro.vitals) {
        const v = currentAstro.vitals;
        const setVal = function(id, txt) {
          const el = document.getElementById(id);
          if (el) el.textContent = txt;
        };
        setVal('astro-sensor-hr', v.hr);
        setVal('astro-sensor-bp', v.bpSys + '/' + v.bpDia);
        setVal('astro-sensor-spo2', v.spo2);
        setVal('astro-sensor-temp', v.temp);
        setVal('astro-sensor-resp', v.resp);
        setVal('astro-sensor-rr', (v.rr || Math.round(60000 / v.hr)));
        setVal('astro-sensor-hrv', (v.hrv || 64));
        setVal('astro-sensor-stress', v.stressLevel);
        setVal('astro-sensor-bb', (v.bodyBattery || 82));
        setVal('astro-sensor-sleep-score', (v.sleepScore !== undefined ? v.sleepScore : 85));
        setVal('astro-sensor-cortisol', (v.cortisol !== undefined ? v.cortisol : 4.2));
        setVal('astro-sensor-lactate', (v.lactate !== undefined ? v.lactate : 1.6));
        setVal('astro-sensor-eeg', (v.cognitiveReadiness !== undefined ? v.cognitiveReadiness : 90));
        setVal('astro-sensor-rad', v.radDose);

        const bannerEl = document.getElementById('astro-status-banner');
        if (bannerEl) {
          bannerEl.className = 'astro-overall-status-banner ' + (
            currentAstro.overallStatus === 'critical' ? 'status-banner-critical' :
            (currentAstro.overallStatus === 'warning' ? 'status-banner-warning' : 'status-banner-normal')
          );
        }
        const badgeTop = document.getElementById('astro-status-badge-top');
        const badgeMain = document.getElementById('astro-status-badge-main');
        [badgeTop, badgeMain].forEach(function(b) {
          if (b) {
            b.textContent = currentAstro.statusLabel;
            b.className = 'status-pill ' + statusBadgeFor(currentAstro.overallStatus);
          }
        });
        setVal('astro-status-headline',
          currentAstro.overallStatus === 'critical'
            ? 'GENERAL HEALTH STATUS : CRITICAL CONDITION - URGENT ACTION REQUIRED'
            : (currentAstro.overallStatus === 'warning'
              ? 'GENERAL HEALTH STATUS : OBSERVATION REQUIRED - DEVIATIONS LOGGED'
              : 'GENERAL HEALTH STATUS : PARAMETERS NORMAL - NO RISK'));
        setVal('astro-status-subline', sanitizeModelText(currentAstro.statusDescription));
        setVal('astro-personal-desc', sanitizeModelText(currentAstro.statusDescription));

        const checkEl = document.getElementById('astro-checklist-container');
        if (checkEl) checkEl.innerHTML = renderChecklistChipsHtml(currentAstro);

        const astroModelPanel = document.getElementById('astro-model-summary-panel');
        if (astroModelPanel) astroModelPanel.innerHTML = renderModelSummaryInnerHtml(currentAstro);
        enforceConstraints(document.getElementById('app-main'));
      }
    }

    if (activeTab === 'telemetria') {
      const currentAstro = getAstronautById(selectedAstroId) || appState.astronauts[0];
      if (currentAstro && currentAstro.vitals) {
        const v = currentAstro.vitals;
        const setT = function(id, txt) {
          const el = document.getElementById(id);
          if (el) el.textContent = txt;
        };
        setT('tel-val-hr', v.hr);
        setT('tel-val-bp', v.bpSys + '/' + v.bpDia);
        setT('tel-val-rr', (v.rr || Math.round(60000 / v.hr)));
        setT('tel-val-hrv', (v.hrv || 64));
        setT('tel-val-spo2', v.spo2);
        setT('tel-val-temp', v.temp);
        setT('tel-val-resp', v.resp);
        setT('tel-val-stress', v.stressLevel);
        setT('tel-val-bb', (v.bodyBattery || 82));
        setT('tel-val-bio', (v.cortisol !== undefined ? v.cortisol : 4.2) + ' / ' + (v.lactate !== undefined ? v.lactate : 1.6));
        setT('tel-val-eeg', (v.cognitiveReadiness !== undefined ? v.cognitiveReadiness : 90) + '% / ' + (v.sleepScore !== undefined ? v.sleepScore : 85));
        setT('tel-val-rad', v.radDose);

        const heroPill = document.getElementById('tel-hero-status-pill');
        if (heroPill) {
          heroPill.textContent = currentAstro.statusLabel;
          heroPill.className = 'status-pill ' + statusBadgeFor(currentAstro.overallStatus);
        }

        const heroDesc = document.getElementById('tel-hero-status-desc');
        if (heroDesc) {
          heroDesc.textContent = sanitizeModelText(currentAstro.statusDescription);
        }

        const telModelPanel = document.getElementById('telemetry-model-summary-panel');
        if (telModelPanel) {
          telModelPanel.innerHTML = renderModelSummaryInnerHtml(currentAstro);
        }

        const chartPoints = (currentAstro.liveTelemetry && currentAstro.liveTelemetry.length > 0)
          ? currentAstro.liveTelemetry
          : currentAstro.telemetryHistory;
        let metricLabel = 'Heart Rate';
        let unit = 'bpm';
        if (activeChartMetric === 'bpSys') { metricLabel = 'Systolic BP'; unit = 'mmHg'; }
        else if (activeChartMetric === 'spo2') { metricLabel = 'Oxygen Saturation'; unit = '%'; }
        else if (activeChartMetric === 'stress' || activeChartMetric === 'stressLevel') { metricLabel = 'Stress Level'; unit = 'pts'; }
        else if (activeChartMetric === 'rad' || activeChartMetric === 'radDose') { metricLabel = 'Cumulative Radiation'; unit = 'mSv'; }

        TelemetryCharts.renderLineChart('telemetry-detail-chart', chartPoints, activeChartMetric, metricLabel, unit);

        TelemetryCharts.renderRadialGauge('gauge-bone', v.boneDensity, 100, 'Bone density', '%', v.boneDensity < 92 ? '#ef4444' : '#00d4ff');
        TelemetryCharts.renderRadialGauge('gauge-muscle', v.muscleMass, 100, 'Muscle mass', '%', v.muscleMass < 92 ? '#ef4444' : '#00d4ff');
        TelemetryCharts.renderRadialGauge('gauge-hydration', v.hydration, 100, 'Hydration', '%', v.hydration < 88 ? '#f59e0b' : '#10b981');
        TelemetryCharts.renderRadialGauge('gauge-stress', v.stressLevel, 100, 'Stress Level', '%', v.stressLevel > 60 ? '#ef4444' : '#00d4ff');
        enforceConstraints(document.getElementById('app-main'));
      }
    }

    if (data.packet % 10 === 0) {
      saveState(appState);
    }
  });

  // Initialize application on DOM load
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
            if (serverState.eclssCabin) appState.eclssCabin = serverState.eclssCabin;
            if (serverState.crewSummary) appState.crewSummary = serverState.crewSummary;
            if (serverState.stepProcedures && serverState.stepProcedures.length > 0) appState.stepProcedures = serverState.stepProcedures;
            if (serverState.scheduleData) appState.scheduleData = serverState.scheduleData;
            if (serverState.prophylaxisGuidelines && serverState.prophylaxisGuidelines.length > 0) appState.prophylaxisGuidelines = serverState.prophylaxisGuidelines;
            if (serverState.criticalScenarios && serverState.criticalScenarios.length > 0) appState.criticalScenarios = serverState.criticalScenarios;
            sanitizeCrewState(appState);
            saveState(appState);
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
