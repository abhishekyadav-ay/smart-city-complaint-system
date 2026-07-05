/* ==========================================
   SMART CITY — PUBLIC COMPLAINT FORM JS
   ========================================== */

// Resolve API base with safe fallbacks for local file, local server, or deployed hosting.
const API_BASE = (() => {
  const configured = window.SMART_CITY_API_BASE || localStorage.getItem('SMART_CITY_API_BASE');
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const host = (window.location.hostname || '').replace(/^\[|\]$/g, '');
  const isLocalHost = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host);

  if (window.location.protocol === 'file:' || isLocalHost) {
    return 'http://localhost:5000/api';
  }

  return '/api';
})();

// ── State ─────────────────────────────────
let map;
let selectedCategory = '';
let detectedAICategories = [];

// ── Init ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadPublicStats();
  loadComplaints();
  setupFileUpload();
  setupCategoryButtons();
  setupDescriptionCounter();
  setupForm();
  setupAIDetect();
  setupTracking();

  document.getElementById('locateBtn')?.addEventListener('click', getUserLocation);
});

// ── Leaflet Map ───────────────────────────
function initLeafletMap() {
  if (typeof L === 'undefined' || !document.getElementById('map')) {
    return;
  }

  map = window.currentMap || document.getElementById('map')._leaflet_map;

  if (!map || !map.on) {
    map = L.map('map', { preferCanvas: true }).setView([28.6139, 77.209], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    window.currentMap = map;
  }

  if (!map._complaintMapListener) {
    map.on('click', (e) => {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      document.getElementById('lat').value = lat;
      document.getElementById('lng').value = lng;
      moveMarker(lat, lng);
      reverseGeocode(lat, lng);
    });
    map._complaintMapListener = true;
  }
}

setTimeout(() => {
  if (typeof L !== 'undefined') initLeafletMap();
}, 300);

function moveMarker(lat, lng) {
  if (!map) return;
  document.getElementById('lat').value = lat;
  document.getElementById('lng').value = lng;

  if (window.currentMarker) {
    map.removeLayer(window.currentMarker);
  }
  window.currentMarker = L.marker([lat, lng]).addTo(map);
  map.setView([lat, lng], 16);
}

function reverseGeocode(lat, lng) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    .then((response) => response.json())
    .then((data) => {
      if (data?.display_name) {
        document.getElementById('address').value = data.display_name;
      }
    })
    .catch(() => {});
}

function getUserLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }

  const btn = document.getElementById('locateBtn');
  btn.style.opacity = '0.5';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      moveMarker(latitude.toFixed(6), longitude.toFixed(6));
      reverseGeocode(latitude, longitude);
      btn.style.opacity = '1';
      showToast('✅ Location detected!', 'success');
    },
    () => {
      btn.style.opacity = '1';
      showToast('Could not get your location', 'error');
    }
  );
}

// ── Category Buttons ──────────────────────
function setupCategoryButtons() {
  const catBtns = document.querySelectorAll('.cat-btn');
  catBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      catBtns.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCategory = btn.dataset.cat;
      document.getElementById('issueType').value = selectedCategory;
      detectedAICategories = [{ issueType: selectedCategory, score: 1, priority: 1 }];
      setAIMetadataField(detectedAICategories);
    });
  });
}

function highlightCategories(categories) {
  const selected = new Set(categories);
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.classList.toggle('selected', selected.has(btn.dataset.cat));
  });
}

// ── Description Character Counter ─────────
function setupDescriptionCounter() {
  const textarea = document.getElementById('description');
  const counter = document.getElementById('charCount');
  if (!textarea) return;

  // Initialize counter
  const updateCounter = () => {
    const len = textarea.value.length;
    if (counter) {
      counter.textContent = `${len} character${len !== 1 ? 's' : ''}`;
      counter.style.color = len < 10 ? '#ef4444' : 'var(--gray-400)';
    }
  };

  textarea.addEventListener('input', updateCounter);
  updateCounter(); // Initialize immediately
}

// ── AI Detect ─────────────────────────────
function setupAIDetect() {
  const aiBtn = document.getElementById('aiDetectBtn');
  if (!aiBtn) {
    console.warn('AI Detect button not found');
    return;
  }

  aiBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    const descEl = document.getElementById('description');
    if (!descEl) {
      showToast('Description field not found', 'error');
      return;
    }
    
    const desc = descEl.value.trim();
    
    if (!desc || desc.length < 10) {
      showToast('Please write at least 10 characters in description first', 'error');
      return;
    }

    aiBtn.textContent = '✨ Detecting...';
    aiBtn.disabled = true;

    try {
      const detected = detectIssuePriorities(desc);
      const primary = detected[0]?.issueType || 'Others';
      detectedAICategories = detected;

      showAIResult(detected);
      highlightCategories(detected.map((d) => d.issueType));
      document.getElementById('issueType').value = primary;
      selectedCategory = primary;
      setAIMetadataField(detectedAICategories);
      showToast(`✨ AI detected ${detected.length} issue type(s). Primary: ${primary}`, 'success');
    } catch (err) {
      console.error('AI detection error:', err);
      showToast('AI detection failed, please select category manually', 'error');
    } finally {
      aiBtn.innerHTML = '<span class="ai-icon">✨</span> AI Detect Category';
      aiBtn.disabled = false;
    }
  });
}

function detectIssuePriorities(text) {
  const t = text.toLowerCase();

  const categoryRules = [
    {
      issueType: 'Pothole',
      keywords: [
        'pothole', 'road damage', 'broken road', 'crack', 'bump', 'ditch', 'asphalt', 'uneven road'
      ]
    },
    {
      issueType: 'Garbage',
      keywords: [
        'garbage', 'trash', 'waste', 'litter', 'dump', 'rubbish', 'debris', 'junk'
      ]
    },
    {
      issueType: 'Streetlight',
      keywords: [
        'streetlight', 'street light', 'light not working', 'broken light', 'dark road', 'lamp post', 'no light'
      ]
    },
    {
      issueType: 'Water Issue',
      keywords: [
        'water leakage', 'water leak', 'pipeline leak', 'pipe burst', 'drain overflow', 'sewage', 'flood', 'water logging'
      ]
    }
  ];

  const results = [];

  for (const rule of categoryRules) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (t.includes(keyword)) {
        // Multi-word phrases get higher weight than single keywords.
        score += keyword.includes(' ') ? 3 : 1;
      }
    }
    if (score > 0) {
      results.push({ issueType: rule.issueType, score });
    }
  }

  if (results.length === 0) {
    return [{ issueType: 'Others', score: 1, priority: 1 }];
  }

  results.sort((a, b) => b.score - a.score);
  return results.map((item, idx) => ({ ...item, priority: idx + 1 }));
}

function showAIResult(detected) {
  const el = document.getElementById('aiResult');
  const catEl = document.getElementById('aiCategory');
  if (!el || !catEl) return;

  catEl.innerHTML = detected
    .map((d) => `${d.priority}. ${d.issueType} (priority score: ${d.score})`)
    .join('<br>');
  el.style.display = 'block';
}

function setAIMetadataField(detected) {
  let hidden = document.getElementById('aiCategories');
  if (!hidden) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'aiCategories';
    hidden.id = 'aiCategories';
    document.getElementById('complaintForm')?.appendChild(hidden);
  }
  hidden.value = JSON.stringify(detected || []);
}

// ── File Upload ───────────────────────────
function setupFileUpload() {
  const area = document.getElementById('uploadArea');
  const input = document.getElementById('image');
  const preview = document.getElementById('uploadPreview');
  const content = document.getElementById('uploadContent');
  const previewImg = document.getElementById('previewImg');
  const removeBtn = document.getElementById('removeImg');

  if (!area) return;

  // Drag events
  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('drag-over');
  });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });

  removeBtn?.addEventListener('click', () => {
    input.value = '';
    preview.style.display = 'none';
    content.style.display = 'block';
    previewImg.src = '';
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be under 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      preview.style.display = 'block';
      content.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

// ── Form Submission ───────────────────────
function setupForm() {
  const form = document.getElementById('complaintForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!name || !email || !address || !description) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    if (description.length < 10) {
      showToast('Description must be at least 10 characters', 'error');
      return;
    }

    const btn = document.getElementById('submitBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnIcon = btn.querySelector('.btn-icon');
    btn.disabled = true;
    btnText.textContent = 'Submitting...';
    btnIcon.textContent = '⏳';

    try {
      const formData = new FormData(form);
      const res = await fetch(`${API_BASE}/complaints`, { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Submission failed');

      const createdComplaint = data.data || data.complaint || {};
      form.style.display = 'none';
      const successEl = document.getElementById('successMsg');
      document.getElementById('successText').textContent =
        `Your "${createdComplaint.issueType || 'issue'}" report has been received and categorized. We'll update you via email once it's resolved.`;

      const trackingInfo = document.getElementById('trackingInfo');
      const trackingIdDisplay = document.getElementById('trackingIdDisplay');
      if (createdComplaint.trackingId) {
        trackingIdDisplay.textContent = createdComplaint.trackingId;
        trackingInfo.style.display = 'block';
      }

      successEl.style.display = 'block';
      setTimeout(() => {
        loadComplaints();
        loadPublicStats();
      }, 800);

      showToast('✅ Complaint submitted successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btnText.textContent = 'Submit Complaint';
      btnIcon.textContent = '→';
    }
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    const resetForm = document.getElementById('complaintForm');
    resetForm.reset();
    resetForm.style.display = 'block';
    document.getElementById('successMsg').style.display = 'none';
    document.getElementById('aiResult').style.display = 'none';
    setAIMetadataField([]);
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadContent').style.display = 'block';
    document.querySelectorAll('.cat-btn').forEach((button) => button.classList.remove('selected'));
    selectedCategory = '';
  });
}

// ── Load Public Stats ─────────────────────
async function loadPublicStats() {
  try {
    const res = await fetch(`${API_BASE}/analytics/public`);
    if (!res.ok) {
      console.warn('Public analytics fetch failed, status:', res.status);
      return;
    }
    const data = await res.json();
    animateNumber('stat-total', data.summary?.total || 0);
    animateNumber('stat-resolved', data.summary?.resolvedCount || 0);
    const rate = data.summary?.resolutionRate || 0;
    document.getElementById('stat-rate').textContent = `${rate}%`;
  } catch (err) {
    console.error('Public stats error:', err);
  }
}

// ── Load Complaints List ───────────────────
async function loadComplaints() {
  try {
    const listEl = document.getElementById('complaintsList');
    if (!listEl) return;
    
    listEl.innerHTML = '<div class="loading-spinner">Loading complaints...</div>';
    
    // Backend exposes /complaints and returns items under `data`
    const res = await fetch(`${API_BASE}/complaints`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    const complaints = (data.data || data.complaints || []).slice(0, 9);
    
    console.log('Loaded complaints:', complaints);
    
    if (!complaints || complaints.length === 0) {
      listEl.innerHTML = '<div class="loading-spinner">No complaints yet. Be the first to report an issue!</div>';
      return;
    }
    
    listEl.innerHTML = complaints.map(complaint => {
      const category = complaint.issueType || complaint.category || 'Issue';
      const status = complaint.status || 'Pending';
      const description = (complaint.description || '').substring(0, 100) + '...';
      const name = complaint.name || 'Anonymous';
      const location = complaint.address || 'Unknown location';
      const date = new Date(complaint.createdAt).toLocaleDateString();
      
      const statusClass = `status-${status.toLowerCase()}`;
      const categoryEmoji = getCategoryEmoji(category);
      
      return `
        <div class="complaint-card">
          <div class="complaint-header">
            <div class="complaint-category">${categoryEmoji} ${category}</div>
            <div class="complaint-status ${statusClass}">${status}</div>
          </div>
          <p class="complaint-description">${description}</p>
          <div class="complaint-meta">
            <div class="complaint-location">📍 ${location}</div>
            <div>${date}</div>
          </div>
          <div class="complaint-submitter">By: ${name}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Load complaints error:', err);
    const listEl = document.getElementById('complaintsList');
    if (listEl) {
      listEl.innerHTML = `<div class="loading-spinner">Could not load complaints: ${err.message}</div>`;
    }
  }
}

function getCategoryEmoji(category) {
  const emojiMap = {
    'Pothole': '🕳️',
    'Garbage': '🗑️',
    'Streetlight': '💡',
    'Water Issue': '💧',
    'Others': '📋'
  };
  return emojiMap[category] || '📌';
}

// ── Utilities ─────────────────────────────
function animateNumber(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(timer);
  }, 30);
}

let toastTimer;
function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ── Tracking Functionality ───────────────
function setupTracking() {
  // Tab switching
  const tabs = document.querySelectorAll('.track-tab');
  const panels = document.querySelectorAll('.track-panel');
  
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panels[index].classList.add('active');
    });
  });
  
  // Track by ID form
  const trackIdForm = document.getElementById('trackIdForm');
  if (trackIdForm) {
    trackIdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const trackingId = document.getElementById('trackingId').value.trim().toUpperCase();
      if (!trackingId) {
        showToast('Please enter a tracking ID', 'error');
        return;
      }
      await trackComplaint(trackingId);
    });
  }
  
  // Track by email form
  const trackEmailForm = document.getElementById('trackEmailForm');
  if (trackEmailForm) {
    trackEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('trackEmail').value.trim();
      if (!email) {
        showToast('Please enter an email address', 'error');
        return;
      }
      await trackComplaintsByEmail(email);
    });
  }
  
  // Close results
  const closeBtn = document.getElementById('closeResults');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('trackResults').style.display = 'none';
    });
  }
}

async function trackComplaint(trackingId) {
  try {
    const res = await fetch(`${API_BASE}/complaints/track/${encodeURIComponent(trackingId)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Complaint not found');
    }

    displayTrackingResult(data.data || []);
  } catch (err) {
    showToast(err.message || 'Failed to track complaint', 'error');
  }
}

async function trackComplaintsByEmail(email) {
  try {
    const res = await fetch(`${API_BASE}/complaints/track/email/${encodeURIComponent(email)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'No complaints found');
    }

    displayTrackingResult(data.data || []);
  } catch (err) {
    showToast(err.message || 'Failed to track complaints', 'error');
  }
}

function displayTrackingResult(complaints) {
  const resultsEl = document.getElementById('trackResults');
  const contentEl = document.getElementById('trackResultContent');
  
  if (complaints.length === 0) {
    contentEl.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 40px;">No complaints found.</p>';
  } else {
    contentEl.innerHTML = complaints.map(complaint => `
      <div class="track-complaint-item">
        <div class="track-complaint-header">
          <div class="track-id">${complaint.trackingId}</div>
          <div class="track-status ${complaint.status.toLowerCase()}">${complaint.status.replace(' ', ' ')}</div>
        </div>
        <div class="track-category">${getCategoryEmoji(complaint.issueType)} ${complaint.issueType}</div>
        <div class="track-description">${complaint.description}</div>
        <div class="track-meta">
          <div class="track-location">📍 ${complaint.address || 'Location not specified'}</div>
          <div class="track-date">📅 ${new Date(complaint.createdAt).toLocaleDateString()}</div>
        </div>
        ${complaint.adminNotes ? `<div class="track-admin-notes">📝 Admin Notes: ${complaint.adminNotes}</div>` : ''}
      </div>
    `).join('');
  }
  
  resultsEl.style.display = 'block';
  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
