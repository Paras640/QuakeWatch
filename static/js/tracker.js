/**
 * QuakeWatch India - Tracker Engine
 * Handles live data fetching, Leaflet mapping with light/dark tiles,
 * dynamic metric rendering, table filtering, sorting, and CSV export.
 */

let currentData = null;
let leafletMap = null;
let mapLayers = {
  tileLayer: null,
  cityMarker: null,
  radiusCircle: null,
  quakeMarkersGroup: null
};
let autoRefreshTimer = null;
let countdownInterval = null;
let remainingSeconds = 60;

// Tile layer URLs for CartoDB (clean, modern Fluent aesthetic)
const MAP_TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
};

document.addEventListener('DOMContentLoaded', () => {
  // Check URL params for pre-selected state or city
  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get('state') || urlParams.get('city');
  if (locationParam) {
    const stateSelect = document.getElementById('state');
    if (stateSelect) {
      const match = Array.from(stateSelect.options).find(
        opt => opt.value.toLowerCase() === locationParam.toLowerCase()
      );
      if (match) {
        stateSelect.value = match.value;
      }
    }
  }

  initMap();
  setupEventListeners();
  loadData();
});

// --------------------------------------------------------------------------
// 1. Leaflet Map Initialization
// --------------------------------------------------------------------------
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement || typeof L === 'undefined') return;

  try {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const tileUrl = currentTheme === 'dark' ? MAP_TILES.dark : MAP_TILES.light;

    leafletMap = L.map('map', {
      center: [28.61, 77.21], // Default Delhi
      zoom: 6,
      zoomControl: true,
      attributionControl: true
    });

    mapLayers.tileLayer = L.tileLayer(tileUrl, {
      attribution: MAP_TILES.attribution,
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(leafletMap);

    mapLayers.quakeMarkersGroup = L.layerGroup().addTo(leafletMap);
  } catch (err) {
    console.warn('Map initialization skipped or failed:', err);
  }
}

// React to Theme Switch in Leaflet
window.onThemeChange = function (theme) {
  if (leafletMap && mapLayers.tileLayer) {
    leafletMap.removeLayer(mapLayers.tileLayer);
    const tileUrl = theme === 'dark' ? MAP_TILES.dark : MAP_TILES.light;
    mapLayers.tileLayer = L.tileLayer(tileUrl, {
      attribution: MAP_TILES.attribution,
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(leafletMap);
  }
};

// --------------------------------------------------------------------------
// 2. Data Fetching & Processing
// --------------------------------------------------------------------------
async function loadData() {
  const errorEl = document.getElementById('error-banner');
  const statusEl = document.getElementById('status-bar');
  const submitBtn = document.getElementById('submit-btn');

  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  const stateSelect = document.getElementById('state');
  const radiusInput = document.getElementById('radius');
  const daysInput = document.getElementById('days');
  const minMagInput = document.getElementById('min_mag');

  const state = stateSelect ? stateSelect.value : 'Delhi';
  const radius = radiusInput ? radiusInput.value : '300';
  const days = daysInput ? daysInput.value : '30';
  const minMag = minMagInput ? minMagInput.value : '2.5';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="spin" style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      Analyzing...
    `;
  }

  const params = new URLSearchParams({
    state: state,
    city: state,
    radius: radius,
    days: days,
    min_mag: minMag
  });

  try {
    const res = await fetch('/api/data?' + params.toString());
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Failed to fetch seismic data.');
      return;
    }

    currentData = data;
    renderMetrics(data);
    updateMap(data);
    renderTable();

    const displayName = data.state || data.location || data.city;
    if (statusEl) {
      statusEl.innerHTML = `
        <span><strong>${displayName}</strong> &bull; Radius: ${radius} km &bull; Monitored USGS window: ${days} days &bull; Min Mag: ${minMag}</span>
        <span style="opacity:0.75; font-size:0.85em; margin-left:auto;">Updated at ${data.checked_at}</span>
      `;
    }

    // Reset countdown timer
    resetCountdown();

  } catch (err) {
    showError('Network error connecting to QuakeWatch backend service.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        Analyze Activity
      `;
    }
  }
}

function showError(msg) {
  const errorEl = document.getElementById('error-banner');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

// Helper for smooth Fluent number count-up animation
function animateValue(element, targetValue, duration = 400, isFloat = false) {
  if (!element) return;
  element.classList.remove('stat-pop');
  void element.offsetWidth; // Reflow to restart animation
  element.classList.add('stat-pop');

  if (targetValue === 0 || isNaN(targetValue)) {
    element.textContent = targetValue === 0 && !isFloat ? '0' : 'N/A';
    return;
  }

  const start = 0;
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (targetValue - start) * ease;

    element.textContent = isFloat ? current.toFixed(1) : Math.round(current);

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.textContent = isFloat ? targetValue.toFixed(1) : targetValue;
    }
  }

  requestAnimationFrame(updateCount);
}

// --------------------------------------------------------------------------
// 3. Render Metrics
// --------------------------------------------------------------------------
function renderMetrics(d) {
  const totalVal = document.getElementById('val-total');
  const strongVal = document.getElementById('val-strongest');
  const strongBadge = document.getElementById('badge-strongest');
  const depthVal = document.getElementById('val-depth');
  const alertVal = document.getElementById('val-alert');

  if (totalVal) animateValue(totalVal, d.total, 450, false);
  if (strongVal) animateValue(strongVal, d.strongest > 0 ? d.strongest : 0, 450, true);
  if (depthVal) {
    depthVal.classList.remove('stat-pop');
    void depthVal.offsetWidth;
    depthVal.classList.add('stat-pop');
    depthVal.textContent = d.total > 0 ? `${d.avg_depth} km` : 'N/A';
  }

  if (strongBadge) {
    if (d.total === 0) {
      strongBadge.className = 'mag-badge mag-low';
      strongBadge.textContent = 'None';
    } else if (d.strongest < 3.0) {
      strongBadge.className = 'mag-badge mag-low';
      strongBadge.textContent = 'Minor';
    } else if (d.strongest < 4.5) {
      strongBadge.className = 'mag-badge mag-med';
      strongBadge.textContent = 'Moderate';
    } else if (d.strongest < 6.0) {
      strongBadge.className = 'mag-badge mag-high';
      strongBadge.textContent = 'Strong';
    } else {
      strongBadge.className = 'mag-badge mag-severe';
      strongBadge.textContent = 'Severe';
    }
  }

  if (alertVal) {
    if (d.total === 0) {
      alertVal.textContent = 'Calm';
      alertVal.style.color = 'var(--status-low-text)';
    } else if (d.strongest >= 5.5 || d.total >= 15) {
      alertVal.textContent = 'High Alert';
      alertVal.style.color = 'var(--status-severe-text)';
    } else if (d.strongest >= 4.0 || d.total >= 6) {
      alertVal.textContent = 'Elevated';
      alertVal.style.color = 'var(--status-high-text)';
    } else {
      alertVal.textContent = 'Normal';
      alertVal.style.color = 'var(--status-low-text)';
    }
  }
}

// --------------------------------------------------------------------------
// 4. Update Leaflet Map
// --------------------------------------------------------------------------
function updateMap(data) {
  if (!leafletMap) return;

  const lat = data.lat || 28.61;
  const lon = data.lon || 77.21;
  const radiusKm = parseInt(document.getElementById('radius')?.value || '300', 10);
  const displayName = data.state || data.location || data.city;

  // Center map on location
  leafletMap.setView([lat, lon], radiusKm > 500 ? 5 : 6);

  // Remove previous markers & radius
  if (mapLayers.cityMarker) leafletMap.removeLayer(mapLayers.cityMarker);
  if (mapLayers.radiusCircle) leafletMap.removeLayer(mapLayers.radiusCircle);
  if (mapLayers.quakeMarkersGroup) mapLayers.quakeMarkersGroup.clearLayers();

  // Add Center Epicenter Marker
  const centerIcon = L.divIcon({
    className: 'city-epicenter-pin',
    html: `<div style="
      width:14px; height:14px; background:#0078d4; border:3px solid #ffffff; 
      border-radius:50%; box-shadow:0 0 12px rgba(0,120,212,0.8);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  mapLayers.cityMarker = L.marker([lat, lon], { icon: centerIcon })
    .bindPopup(`<strong>${displayName} (Reference Center)</strong><br>Coordinates: ${lat.toFixed(2)}, ${lon.toFixed(2)}`)
    .addTo(leafletMap);

  // Add search radius perimeter circle
  mapLayers.radiusCircle = L.circle([lat, lon], {
    radius: radiusKm * 1000,
    color: '#0078d4',
    weight: 1.5,
    dashArray: '5, 8',
    fillColor: '#0078d4',
    fillOpacity: 0.05
  }).addTo(leafletMap);

  // Add markers for earthquakes
  if (data.latest && data.latest.length > 0) {
    data.latest.forEach(eq => {
      if (eq.latitude && eq.longitude) {
        let color = '#107c41'; // Minor
        let radius = 6;
        if (eq.mag >= 6.0) {
          color = '#d13438';
          radius = 16;
        } else if (eq.mag >= 4.5) {
          color = '#e85d04';
          radius = 12;
        } else if (eq.mag >= 3.0) {
          color = '#d89b0f';
          radius = 9;
        }

        const circleMarker = L.circleMarker([eq.latitude, eq.longitude], {
          radius: radius,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.8
        });

        circleMarker.bindPopup(`
          <div style="font-family:var(--font-family); padding:4px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px;">
              <strong style="font-size:1.1em;">M ${eq.mag}</strong>
              <span style="font-size:0.85em; background:${color}; color:#fff; padding:2px 8px; border-radius:12px; font-weight:600;">
                ${eq.mag >= 4.5 ? 'Significant' : 'Detected'}
              </span>
            </div>
            <div style="font-size:0.88em; color:#444; margin-bottom:4px;"><strong>Place:</strong> ${eq.place}</div>
            <div style="font-size:0.85em; color:#666;"><strong>Depth:</strong> ${eq.depth} km</div>
            <div style="font-size:0.85em; color:#666;"><strong>Time:</strong> ${eq.time}</div>
          </div>
        `);

        mapLayers.quakeMarkersGroup.addLayer(circleMarker);
      }
    });
  }
}

// --------------------------------------------------------------------------
// 5. Render Data Table & Filtering / Sorting
// --------------------------------------------------------------------------
function renderTable() {
  const tableEl = document.getElementById('table');
  const emptyEl = document.getElementById('empty-state');
  const countEl = document.getElementById('table-count');

  if (!tableEl || !currentData) return;

  let records = [...(currentData.latest || [])];

  // Apply search filter if query entered
  const searchInput = document.getElementById('table-search-input');
  if (searchInput && searchInput.value.trim() !== '') {
    const q = searchInput.value.trim().toLowerCase();
    records = records.filter(r => 
      r.place.toLowerCase().includes(q) || 
      r.time.toLowerCase().includes(q) ||
      String(r.mag).includes(q)
    );
  }

  // Apply sort
  const sortSelect = document.getElementById('table-sort-select');
  const sortBy = sortSelect ? sortSelect.value : 'time-desc';

  records.sort((a, b) => {
    if (sortBy === 'mag-desc') return b.mag - a.mag;
    if (sortBy === 'mag-asc') return a.mag - b.mag;
    if (sortBy === 'depth-asc') return a.depth - b.depth;
    if (sortBy === 'depth-desc') return b.depth - a.depth;
    return new Date(b.raw_time || 0) - new Date(a.raw_time || 0);
  });

  if (countEl) countEl.textContent = `${records.length} shown`;

  if (records.length === 0) {
    tableEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  let html = `
    <thead>
      <tr>
        <th>Time (IST)</th>
        <th>Magnitude</th>
        <th>Depth</th>
        <th>Location / Epicenter</th>
        <th style="text-align:right;">Source</th>
      </tr>
    </thead>
    <tbody>
  `;

  for (const r of records) {
    let magClass = 'mag-low';
    if (r.mag >= 6.0) magClass = 'mag-severe';
    else if (r.mag >= 4.5) magClass = 'mag-high';
    else if (r.mag >= 3.0) magClass = 'mag-med';

    const depthPct = Math.min(100, Math.max(5, (r.depth / 150) * 100));

    html += `
      <tr>
        <td>
          <div style="font-weight:600;">${r.time}</div>
        </td>
        <td>
          <span class="mag-badge ${magClass}">M ${r.mag.toFixed(1)}</span>
        </td>
        <td>
          <div class="depth-indicator">
            <span style="font-weight:600; min-width:48px;">${r.depth} km</span>
            <div class="depth-bar-bg" title="Hypocenter depth: ${r.depth} km">
              <div class="depth-bar-fill" style="width:${depthPct}%;"></div>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight:500;">${r.place}</div>
          ${r.latitude && r.longitude ? `<div style="font-size:0.78rem; color:var(--text-muted);">${r.latitude.toFixed(2)}°N, ${r.longitude.toFixed(2)}°E</div>` : ''}
        </td>
        <td style="text-align:right;">
          <span class="tech-badge" style="font-size:0.75rem;">USGS Feed</span>
        </td>
      </tr>
    `;
  }

  html += '</tbody>';
  tableEl.innerHTML = html;
}

// --------------------------------------------------------------------------
// 6. CSV Export Functionality
// --------------------------------------------------------------------------
function exportCSV() {
  if (!currentData || !currentData.latest || currentData.latest.length === 0) {
    alert('No earthquake data available to export.');
    return;
  }

  const headers = ['Time_IST', 'Magnitude', 'Depth_km', 'Place', 'Latitude', 'Longitude'];
  const rows = currentData.latest.map(r => [
    `"${r.time}"`,
    r.mag,
    r.depth,
    `"${r.place.replace(/"/g, '""')}"`,
    r.latitude || '',
    r.longitude || ''
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + 
    [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const displayName = currentData.state || currentData.location || currentData.city || 'India';
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `QuakeWatch_${displayName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --------------------------------------------------------------------------
// 7. Event Listeners & Auto-Refresh
// --------------------------------------------------------------------------
function setupEventListeners() {
  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      loadData();
    });
  }

  // Automatic reload on state dropdown change
  const stateSelect = document.getElementById('state');
  if (stateSelect) {
    stateSelect.addEventListener('change', () => {
      loadData();
    });
  }

  // Table search & sort
  const searchInput = document.getElementById('table-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderTable());
  }

  const sortSelect = document.getElementById('table-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => renderTable());
  }

  // Export CSV
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportCSV);
  }

  // Auto-refresh switch
  const autoRefreshSwitch = document.getElementById('auto-refresh-toggle');
  if (autoRefreshSwitch) {
    autoRefreshSwitch.addEventListener('change', (e) => {
      if (e.target.checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  remainingSeconds = 60;
  countdownInterval = setInterval(() => {
    remainingSeconds--;
    const countdownEl = document.getElementById('refresh-countdown');
    if (countdownEl) {
      countdownEl.textContent = `Auto-refresh in ${remainingSeconds}s`;
    }
    if (remainingSeconds <= 0) {
      remainingSeconds = 60;
      loadData();
    }
  }, 1000);
}

function stopAutoRefresh() {
  if (countdownInterval) clearInterval(countdownInterval);
  const countdownEl = document.getElementById('refresh-countdown');
  if (countdownEl) {
    countdownEl.textContent = 'Auto-refresh paused';
  }
}

function resetCountdown() {
  remainingSeconds = 60;
  const countdownEl = document.getElementById('refresh-countdown');
  const autoRefreshSwitch = document.getElementById('auto-refresh-toggle');
  if (countdownEl && autoRefreshSwitch && autoRefreshSwitch.checked) {
    countdownEl.textContent = `Auto-refresh in 60s`;
  }
}
