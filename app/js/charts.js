// SVG telemetry charting module for HMS-of-A
// No emojis, no parentheses in labels, no long dashes

const TelemetryCharts = {
  // Renders a line trend chart for a telemetry metric
  renderLineChart: function(containerId, dataPoints, metricKey, metricLabel, unit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!dataPoints || dataPoints.length === 0) {
      container.innerHTML = '<div class="empty-chart">No telemetry data available to display</div>';
      return;
    }

    const width = 640;
    const height = 240;
    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 40;

    const values = dataPoints.map(function(d) { return d[metricKey]; });
    let minVal = Math.min.apply(null, values);
    let maxVal = Math.max.apply(null, values);

    // Add vertical margin
    const span = (maxVal - minVal) || 10;
    minVal = Math.floor(minVal - span * 0.15);
    maxVal = Math.ceil(maxVal + span * 0.15);

    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;

    const getX = function(index) {
      if (dataPoints.length === 1) return paddingLeft + plotW / 2;
      return paddingLeft + (index / (dataPoints.length - 1)) * plotW;
    };

    const getY = function(val) {
      const ratio = (val - minVal) / (maxVal - minVal);
      return paddingTop + plotH - ratio * plotH;
    };

    // Build SVG polyline and area paths
    let pathD = '';
    let areaD = '';
    const pointsList = [];

    dataPoints.forEach(function(d, i) {
      const x = getX(i);
      const y = getY(d[metricKey]);
      const lbl = d.day || d.time || '';
      pointsList.push({ x: x, y: y, val: d[metricKey], label: lbl });
      if (i === 0) {
        pathD += 'M ' + x + ' ' + y;
        areaD += 'M ' + x + ' ' + (paddingTop + plotH) + ' L ' + x + ' ' + y;
      } else {
        pathD += ' L ' + x + ' ' + y;
        areaD += ' L ' + x + ' ' + y;
      }
    });

    const lastX = getX(dataPoints.length - 1);
    areaD += ' L ' + lastX + ' ' + (paddingTop + plotH) + ' Z';

    // Horizontal gridlines
    const gridCount = 4;
    let gridLinesHtml = '';
    for (let g = 0; g <= gridCount; g++) {
      const yVal = minVal + (g / gridCount) * (maxVal - minVal);
      const yPos = getY(yVal);
      const displayVal = Math.round(yVal * 10) / 10;
      gridLinesHtml += `
        <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
        <text x="${paddingLeft - 8}" y="${yPos + 4}" fill="#88a0b8" font-size="11" text-anchor="end" font-family="monospace">${displayVal}</text>
      `;
    }

    // Data point markers and X-axis labels
    let pointsHtml = '';
    let xLabelsHtml = '';
    const labelStep = Math.max(1, Math.floor(pointsList.length / 6));

    pointsList.forEach(function(p, idx) {
      pointsHtml += `
        <g class="chart-point-group">
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#00d4ff" stroke="#06121f" stroke-width="2" class="chart-dot" />
          <text x="${p.x}" y="${p.y - 10}" fill="#e6f4ff" font-size="11" font-weight="600" text-anchor="middle" font-family="monospace">${p.val} ${unit}</text>
        </g>
      `;
      if (idx % labelStep === 0 || idx === pointsList.length - 1) {
        xLabelsHtml += `
          <text x="${p.x}" y="${height - 12}" fill="#88a0b8" font-size="11" text-anchor="middle">${p.label}</text>
        `;
      }
    });

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="telemetry-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartGrad_${metricKey}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#00d4ff" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${gridLinesHtml}
        <path d="${areaD}" fill="url(#chartGrad_${metricKey})" />
        <path d="${pathD}" fill="none" stroke="#00d4ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${pointsHtml}
        ${xLabelsHtml}
      </svg>
    `;

    container.innerHTML = svg;
  },

  // Renders crew bar comparison chart for the commander
  renderCrewComparison: function(containerId, astronauts, metricKey, metricName, unit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!astronauts || astronauts.length === 0) {
      container.innerHTML = '<div class="empty-chart">No crew data available to display</div>';
      return;
    }

    const width = 640;
    const height = 220;
    const paddingLeft = 140;
    const paddingRight = 60;
    const paddingTop = 20;
    const barHeight = 28;
    const gap = 16;

    let maxVal = 0;
    astronauts.forEach(function(a) {
      const v = a.vitals[metricKey];
      if (v > maxVal) maxVal = v;
    });
    if (maxVal === 0) maxVal = 100;

    let barsHtml = '';
    astronauts.forEach(function(a, idx) {
      const y = paddingTop + idx * (barHeight + gap);
      const val = a.vitals[metricKey];
      const maxPlotW = width - paddingLeft - paddingRight;
      const barW = Math.max(12, (val / (maxVal * 1.15)) * maxPlotW);

      let barColor = '#00d4ff';
      if (a.overallStatus === 'warning') barColor = '#f59e0b';
      if (a.overallStatus === 'critical') barColor = '#ef4444';

      barsHtml += `
        <g class="crew-bar-row">
          <text x="${paddingLeft - 12}" y="${y + barHeight / 2 + 5}" fill="#cbd5e1" font-size="12" text-anchor="end" font-weight="500">${a.name}</text>
          <rect x="${paddingLeft}" y="${y}" width="${barW}" height="${barHeight}" rx="4" fill="${barColor}" opacity="0.85" />
          <text x="${paddingLeft + barW + 8}" y="${y + barHeight / 2 + 5}" fill="#e6f4ff" font-size="12" font-weight="600" font-family="monospace">${val} ${unit}</text>
        </g>
      `;
    });

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="telemetry-svg" preserveAspectRatio="xMidYMid meet">
        ${barsHtml}
      </svg>
    `;

    container.innerHTML = svg;
  },

  // Renders circular biometric gauge
  renderRadialGauge: function(containerId, value, maxValue, label, unit, statusColor) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const size = 130;
    const strokeWidth = 10;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(1, Math.max(0, value / maxValue));
    const strokeDashoffset = circumference * (1 - percentage);

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="radial-gauge-svg">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${strokeWidth}" />
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${statusColor || '#00d4ff'}" stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round"
          transform="rotate(-90 ${center} ${center})" />
        <text x="${center}" y="${center + 2}" fill="#ffffff" font-size="18" font-weight="700" text-anchor="middle" font-family="monospace">${value}</text>
        <text x="${center}" y="${center + 18}" fill="#88a0b8" font-size="10" text-anchor="middle">${unit}</text>
      </svg>
      <div class="radial-label">${label}</div>
    `;

    container.innerHTML = svg;
  }
};
