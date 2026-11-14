// Real-time medical telemetry streaming engine
// HMS-of-A : Health Monitoring System of Astronauts
// Note: no emojis, no parentheses in UI strings, no long dashes

const TelemetryStream = (function() {
  'use strict';

  let isRunning = true;
  let intervalMs = 2500;
  let timerId = null;
  let scenario = 'resting';
  let packetCounter = 1240;
  let lastPacketTime = '';
  const listeners = [];

  // Simulation scenarios
  const SCENARIOS = {
    resting: {
      name: 'Baseline Rest',
      desc: 'Standard resting conditions aboard the station',
      hrTarget: 68,
      hrRange: 4,
      spo2Target: 99,
      spo2Range: 1,
      bpSysTarget: 120,
      bpDiaTarget: 80,
      respTarget: 14,
      stressTarget: 22,
      radRate: 0.001,
      tempTarget: 36.6
    },
    training: {
      name: 'ARED Strength Training',
      desc: 'High-intensity resistance exercise session',
      hrTarget: 148,
      hrRange: 8,
      spo2Target: 97,
      spo2Range: 1,
      bpSysTarget: 152,
      bpDiaTarget: 88,
      respTarget: 26,
      stressTarget: 56,
      radRate: 0.001,
      tempTarget: 37.3
    },
    eva: {
      name: 'EVA Spacewalk',
      desc: 'Extravehicular activity outside the station in EMU suit',
      hrTarget: 96,
      hrRange: 6,
      spo2Target: 98,
      spo2Range: 1,
      bpSysTarget: 130,
      bpDiaTarget: 84,
      respTarget: 18,
      stressTarget: 46,
      radRate: 0.012,
      tempTarget: 36.7
    },
    anomaly: {
      name: 'Cardiovascular Anomaly Simulation',
      desc: 'Sudden tachycardia and desaturation episode in a crew member',
      hrTarget: 136,
      hrRange: 10,
      spo2Target: 93,
      spo2Range: 2,
      bpSysTarget: 162,
      bpDiaTarget: 96,
      respTarget: 24,
      stressTarget: 82,
      radRate: 0.002,
      tempTarget: 37.5
    }
  };

  function getUtcTimeString() {
    const now = new Date();
    const h = String(now.getUTCHours()).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    const s = String(now.getUTCSeconds()).padStart(2, '0');
    return h + ':' + m + ':' + s;
  }

  function simulateStep(astronauts) {
    if (!astronauts || astronauts.length === 0) return [];

    packetCounter++;
    lastPacketTime = getUtcTimeString();
    const sc = SCENARIOS[scenario] || SCENARIOS.resting;

    const updatedAstroIds = [];

    astronauts.forEach(function(a) {
      if (!a.vitals) return;

      let astroSc = sc;
      if (scenario === 'anomaly' && a.id === 'astro-4') {
        astroSc = {
          hrTarget: 106,
          hrRange: 8,
          spo2Target: 94,
          spo2Range: 2,
          bpSysTarget: 148,
          bpDiaTarget: 96,
          respTarget: 21,
          stressTarget: 82,
          radRate: 0.002,
          tempTarget: 37.5
        };
      } else if (scenario === 'anomaly' && a.id === 'astro-3') {
        astroSc = {
          hrTarget: 86,
          hrRange: 4,
          spo2Target: 97,
          spo2Range: 1,
          bpSysTarget: 138,
          bpDiaTarget: 88,
          respTarget: 17,
          stressTarget: 56,
          radRate: 0.001,
          tempTarget: 37.1
        };
      }

      const v = a.vitals;

      // Smooth convergence toward scenario target with micro-drift
      const hrDrift = (Math.random() * 2 - 1) * astroSc.hrRange * 0.4;
      const hrStep = Math.round((astroSc.hrTarget - v.hr) * 0.22 + hrDrift);
      v.hr = Math.max(45, Math.min(200, v.hr + hrStep));

      // Compute RR interval and HRV RMSSD variability
      v.rr = Math.round(60000 / v.hr);
      const hrvTarget = Math.max(20, Math.min(95, Math.round(100 - (v.stressLevel * 0.8))));
      v.hrv = Math.max(15, Math.min(120, Math.round(v.hrv + (hrvTarget - v.hrv) * 0.2 + (Math.random() * 2 - 1))));

      // SpO2
      const spo2Step = Math.round((astroSc.spo2Target - v.spo2) * 0.25);
      const spo2Rand = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
      v.spo2 = Math.max(85, Math.min(100, v.spo2 + spo2Step + spo2Rand));

      // Systolic and diastolic blood pressure
      const bpSysStep = Math.round((astroSc.bpSysTarget - v.bpSys) * 0.18 + (Math.random() * 2 - 1));
      v.bpSys = Math.max(80, Math.min(210, v.bpSys + bpSysStep));

      const bpDiaStep = Math.round((astroSc.bpDiaTarget - v.bpDia) * 0.18 + (Math.random() * 2 - 1));
      v.bpDia = Math.max(50, Math.min(130, v.bpDia + bpDiaStep));

      // Respiratory rate
      const respStep = Math.round((astroSc.respTarget - v.resp) * 0.2 + (Math.random() * 1.5 - 0.75));
      v.resp = Math.max(8, Math.min(36, v.resp + respStep));

      // Stress level
      const stressStep = Math.round((astroSc.stressTarget - v.stressLevel) * 0.18 + (Math.random() * 2 - 1));
      v.stressLevel = Math.max(5, Math.min(99, v.stressLevel + stressStep));

      // Body Battery
      if (typeof v.bodyBattery === 'number') {
        const bbDelta = v.stressLevel > 50 ? -0.1 : 0.05;
        v.bodyBattery = Math.max(5, Math.min(100, Math.round((v.bodyBattery + bbDelta + (Math.random() * 0.2 - 0.1)) * 10) / 10));
      }

      // Radiation dose accumulation
      v.radDose = Math.round((v.radDose + astroSc.radRate) * 1000) / 1000;

      // Skin body temperature
      const tempDelta = Math.round((astroSc.tempTarget - v.temp) * 0.15 * 10) / 10;
      v.temp = Math.max(35.5, Math.min(39.5, Math.round((v.temp + tempDelta + (Math.random() * 0.06 - 0.03)) * 10) / 10));

      // Overall status evaluation
      if (v.hr > 125 || v.spo2 < 95 || v.stressLevel > 74 || v.bpSys > 158) {
        a.overallStatus = 'critical';
        a.statusLabel = 'Elevated Risk';
        a.statusDescription = 'Biometric thresholds exceeded. Immediate medical verification required.';
      } else if (v.hr > 95 || v.spo2 < 97 || v.stressLevel > 48 || v.bpSys > 138) {
        a.overallStatus = 'warning';
        a.statusLabel = 'Observation Required';
        a.statusDescription = 'Physiological metrics indicate increased physiological strain.';
      } else {
        a.overallStatus = 'normal';
        a.statusLabel = 'Stable Condition';
        a.statusDescription = 'All biometric indicators remain within the defined safety envelope.';
      }

      // Update live telemetry ring buffer
      if (!a.liveTelemetry) {
        a.liveTelemetry = [];
      }
      a.liveTelemetry.push({
        time: lastPacketTime,
        day: lastPacketTime,
        hr: v.hr,
        spo2: v.spo2,
        bpSys: v.bpSys,
        stress: v.stressLevel,
        rad: v.radDose
      });
      if (a.liveTelemetry.length > 20) {
        a.liveTelemetry.shift();
      }

      updatedAstroIds.push(a.id);
    });

    return updatedAstroIds;
  }

  function tick(appState) {
    if (!isRunning) return;

    if (window.location.protocol.indexOf('http') === 0) {
      // Poll live telemetry from Python server
      fetch('/api/telemetry/live')
        .then(function(res) {
          if (!res.ok) throw new Error('HTTP status error');
          return res.json();
        })
        .then(function(data) {
          if (!data) return;
          packetCounter = data.packet;
          lastPacketTime = data.time;
          scenario = data.scenario;
          if (data.astronauts && appState) {
            appState.astronauts = data.astronauts;
          }
          if (data.eclssCabin && appState) {
            appState.eclssCabin = data.eclssCabin;
          }
          if (data.crewSummary && appState) {
            appState.crewSummary = data.crewSummary;
          }
          listeners.forEach(function(fn) {
            try {
              fn({
                packet: packetCounter,
                time: lastPacketTime,
                scenario: scenario,
                updatedIds: (data.astronauts || []).map(function(a) { return a.id; }),
                astronauts: data.astronauts || [],
                eclssCabin: data.eclssCabin || (appState ? appState.eclssCabin : null),
                crewSummary: data.crewSummary || (appState ? appState.crewSummary : null)
              });
            } catch (err) {
              console.warn('Telemetry stream listener error:', err);
            }
          });
        })
        .catch(function() {
          runLocalTick(appState);
        });
    } else {
      runLocalTick(appState);
    }
  }

  function runLocalTick(appState) {
    if (!appState || !appState.astronauts) return;
    const updatedIds = simulateStep(appState.astronauts);

    listeners.forEach(function(fn) {
      try {
        fn({
          packet: packetCounter,
          time: lastPacketTime,
          scenario: scenario,
          updatedIds: updatedIds,
          astronauts: appState.astronauts,
          eclssCabin: appState.eclssCabin || null,
          crewSummary: appState.crewSummary || null
        });
      } catch (err) {
        console.warn('Telemetry stream listener error:', err);
      }
    });
  }

  function start(appState) {
    if (timerId) clearInterval(timerId);
    isRunning = true;
    lastPacketTime = getUtcTimeString();
    timerId = setInterval(function() {
      tick(appState);
    }, intervalMs);
  }

  function stop() {
    isRunning = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function toggle(appState) {
    if (isRunning) {
      stop();
    } else {
      start(appState);
    }
    if (window.location.protocol.indexOf('http') === 0) {
      fetch('/api/telemetry/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isRunning ? 'start' : 'stop' })
      }).catch(function() {});
    }
    return isRunning;
  }

  function setRate(newMs, appState) {
    intervalMs = parseInt(newMs, 10) || 2500;
    if (window.location.protocol.indexOf('http') === 0) {
      fetch('/api/telemetry/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: intervalMs / 1000 })
      }).catch(function() {});
    }
    if (isRunning) {
      start(appState);
    }
  }

  function setScenario(newScenario, appState) {
    if (SCENARIOS[newScenario]) {
      scenario = newScenario;
      if (window.location.protocol.indexOf('http') === 0) {
        fetch('/api/telemetry/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario: newScenario })
        }).catch(function() {});
      }
      if (appState && appState.astronauts) {
        tick(appState);
      }
    }
  }

  function onPacket(callback) {
    listeners.push(callback);
  }

  function createGarminAstronaut() {
    const id = 'astro-garmin-' + Date.now();
    return {
      id: id,
      name: 'Marek Orbit',
      role: '',
      avatarCode: 'MO',
      age: 34,
      bloodType: '0 Rh plus',
      missionDay: 184,
      evaHours: 8,
      overallStatus: 'normal',
      statusLabel: 'Stable Condition',
      statusDescription: 'Real-time biometric stream captured from Garmin Elevate optical sensors.',
      source: 'Garmin Health Telemetry Link',
      vitals: {
        hr: 68,
        hrUnit: 'bpm',
        rr: 882,
        rrUnit: 'ms',
        hrv: 66,
        hrvUnit: 'ms',
        bpSys: 118,
        bpDia: 76,
        bpUnit: 'mmHg',
        spo2: 99,
        spo2Unit: '%',
        temp: 36.6,
        tempUnit: 'deg C',
        resp: 14,
        respUnit: 'breaths/min',
        radDose: 3.2,
        radUnit: 'mSv',
        boneDensity: 99,
        boneUnit: '% norm',
        muscleMass: 100,
        muscleUnit: '% norm',
        hydration: 96,
        hydrationUnit: '%',
        sleepHours: 7.9,
        sleepUnit: 'h',
        sleepScore: 88,
        sleepScoreUnit: 'pts',
        stressLevel: 21,
        stressUnit: 'pts',
        bodyBattery: 88,
        bodyBatteryUnit: 'pts',
        cortisol: 4.1,
        cortisolUnit: 'ng/ml',
        lactate: 1.5,
        lactateUnit: 'mmol/l',
        cognitiveReadiness: 93,
        cognitiveUnit: '%'
      },
      telemetryHistory: [
        { day: 'Day 179', hr: 67, bpSys: 117, spo2: 99, stress: 22, rad: 2.8 },
        { day: 'Day 180', hr: 69, bpSys: 118, spo2: 98, stress: 24, rad: 2.9 },
        { day: 'Day 181', hr: 66, bpSys: 116, spo2: 99, stress: 20, rad: 3.0 },
        { day: 'Day 182', hr: 70, bpSys: 119, spo2: 99, stress: 23, rad: 3.1 },
        { day: 'Day 183', hr: 68, bpSys: 118, spo2: 99, stress: 21, rad: 3.1 },
        { day: 'Day 184', hr: 68, bpSys: 118, spo2: 99, stress: 21, rad: 3.2 }
      ],
      orders: [
        {
          id: 'ord-g1',
          date: '2026-11-14',
          author: 'Marek Marczak',
          text: 'Garmin sensor measurements integrated cleanly into the main HMS-of-A telemetry bus.',
          priority: 'standard'
        }
      ],
      dailyChecks: [
        {
          date: '2026-11-14',
          trainedAred: true,
          trainedT2: true,
          vitalsLogged: true,
          wellbeing: 'Optical sensor readings stable, overnight recovery rated at 88 percent.'
        }
      ]
    };
  }

  return {
    start: start,
    stop: stop,
    toggle: toggle,
    setRate: setRate,
    setScenario: setScenario,
    onPacket: onPacket,
    createGarminAstronaut: createGarminAstronaut,
    getIsRunning: function() { return isRunning; },
    getPacketCount: function() { return packetCounter; },
    getLastTime: function() { return lastPacketTime || getUtcTimeString(); },
    getScenario: function() { return scenario; },
    getIntervalMs: function() { return intervalMs; }
  };
})();
