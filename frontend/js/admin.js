/* ==========================================
   SMART CITY — ADMIN PANEL JS
   ========================================== */

const API_BASE = 'http://localhost:5000/api';

// ── State ─────────────────────────────────
let authToken = localStorage.getItem('sc_token');
let currentPage = 1;
let totalPages = 1;
let charts = {};
let currentComplaintId = null;

const STATUS_ICONS = {
  Pending: '⏳',
  'In Progress': '🔧',
  Resolved: '✅',
};
const CAT_ICONS = {
  Pothole: '🕳️',
  Garbage: '🗑️',
  Streetlight: '💡',
  'Water Issue': '💧',
  Others: '📋',
};

// ── Boot ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    verifyAndBoot();
  } else {
    showLogin();
  }
  setupLoginForm();
  setupSidebar();
  setupModals();
  setupRefresh();
  setupFilters();
});

// ── Auth ──────────────────────────────────
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminLayout').style.display = 'none';
}

function showAdmin(username) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminLayout').style.display = 'flex';
  document.getElementById('adminName').textContent = username || 'Admin';
  loadDashboard();
  loadComplaintsTable();
  loadAnalytics();
}

async function verifyAndBoot() {
  try {
    const res = await apiFetch('/auth/verify');
    if (res.valid) {
      showAdmin(res.admin?.username);
    } else {
      throw new Error('Invalid');
    }
  } catch {
    authToken = null;
    localStorage.removeItem('sc_token');
    showLogin();
  }
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  const toggleBtn = document.getElementById('togglePass');
  const passInput = document.getElementById('loginPass');

  toggleBtn?.addEventListener('click', () => {
    const isText = passInput.type === 'text';
    passInput.type = isText ? 'password' : 'text';
    toggleBtn.textContent = isText ? '👁️' : '🙈';
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    errEl.style.display = 'none';
    btn.querySelector('.btn-text').textContent = 'Signing in...';
    btn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');

      authToken = data.token;
      localStorage.setItem('sc_token', authToken);
      showAdmin(data.username);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      btn.querySelector('.btn-text').textContent = 'Sign In';
      btn.disabled = false;
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    authToken = null;
    localStorage.removeItem('sc_token');
    showLogin();
    showToast('Logged out successfully');
  });
}

// ── API Helper ─────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Sidebar / Tab Navigation ───────────────
function setupSidebar() {
  document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      switchTab(tab);

      // Mobile: close sidebar
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  document.getElementById('viewAllBtn')?.addEventListener('click', () => {
    switchTab('complaints');
  });
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach((el) => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById('topbarTitle').textContent =
    tab.charAt(0).toUpperCase() + tab.slice(1);
}

// ── Dashboard ─────────────────────────────
async function loadDashboard() {
  try {
    const [analytics, complaints] = await Promise.all([
      apiFetch('/analytics'),
      apiFetch('/complaints?page=1&limit=8'),
    ]);

    // KPI cards
    const total = analytics.summary?.total || 0;
    const pending = analytics.byStatus?.find((s) => s._id === 'Pending')?.count || 0;
    const inprogress = analytics.byStatus?.find((s) => s._id === 'In Progress')?.count || 0;
    const resolved = analytics.byStatus?.find((s) => s._id === 'Resolved')?.count || 0;
    const recent = analytics.summary?.recentCount || 0;
    const rate = analytics.summary?.resolutionRate || 0;

    setEl('kpi-total', total);
    setEl('kpi-pending', pending);
    setEl('kpi-inprogress', inprogress);
    setEl('kpi-resolved', resolved);
    setEl('kpi-recent', `+${recent} this week`);
    setEl('kpi-rate', `${rate}% resolution rate`);
    setEl('pendingBadge', pending);

    // Render charts
    renderTrendChart(analytics.dailyTrend?.slice(-14));
    renderCategoryPieChart('categoryChart', analytics.byCategory);

    // Recent table
    renderRecentTable(complaints.complaints);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderRecentTable(complaints) {
  const tbody = document.getElementById('recentTableBody');
  if (!complaints?.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No complaints yet</td></tr>`;
    return;
  }
  tbody.innerHTML = complaints.map((c) => `
    <tr>
      <td>
        <div class="td-name">${esc(c.name)}</div>
        <div class="td-email">${esc(c.email)}</div>
      </td>
      <td><span class="cat-tag">${CAT_ICONS[c.issueType] || '📋'} ${esc(c.issueType)}</span></td>
      <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${esc(c.location?.address || '—')}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${formatDate(c.createdAt)}</td>
      <td><button class="action-btn" onclick="openModal('${c._id}')">View</button></td>
    </tr>
  `).join('');
}

// ── Complaints Table ───────────────────────
async function loadComplaintsTable() {
  const status = document.getElementById('filterStatus').value;
  const issueType = document.getElementById('filterCategory').value;
  const search = document.getElementById('searchInput').value.trim();

  const params = new URLSearchParams({
    page: currentPage,
    limit: 15,
    ...(status && { status }),
    ...(issueType && { issueType }),
    ...(search && { search }),
  });

  try {
    const data = await apiFetch(`/complaints?${params}`);
    totalPages = data.pagination.pages;
    renderComplaintsTable(data.complaints);
    renderPagination(data.pagination);
  } catch (err) {
    document.getElementById('complaintsTableBody').innerHTML =
      `<tr><td colspan="8" class="table-empty">Failed to load complaints</td></tr>`;
  }
}

function renderComplaintsTable(complaints) {
  const tbody = document.getElementById('complaintsTableBody');
  if (!complaints?.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No complaints found for the selected filters</td></tr>`;
    return;
  }
  tbody.innerHTML = complaints.map((c, i) => `
    <tr>
      <td style="font-size:12px; color:var(--gray-400); font-family:monospace">#${String(c._id).slice(-6).toUpperCase()}</td>
      <td>
        <div class="td-name">${esc(c.name)}</div>
      </td>
      <td style="font-size:12px; color:var(--gray-500)">${esc(c.email)}</td>
      <td><span class="cat-tag">${CAT_ICONS[c.issueType] || '📋'} ${esc(c.issueType)}</span></td>
      <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px">${esc(c.location?.address || '—')}</td>
      <td>${statusBadge(c.status)}</td>
      <td style="font-size:12px; color:var(--gray-500)">${formatDate(c.createdAt)}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="action-btn" onclick="openModal('${c._id}')">View</button>
          <button class="action-btn danger" onclick="deleteComplaint('${c._id}')">Del</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPagination(pagination) {
  const { page, pages, total } = pagination;
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }

  let btns = `<button class="page-btn" onclick="goPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>←</button>`;
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  if (start > 1) btns += `<button class="page-btn" onclick="goPage(1)">1</button><span style="padding:0 4px;color:var(--gray-400)">…</span>`;
  for (let i = start; i <= end; i++) {
    btns += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  if (end < pages) btns += `<span style="padding:0 4px;color:var(--gray-400)">…</span><button class="page-btn" onclick="goPage(${pages})">${pages}</button>`;
  btns += `<button class="page-btn" onclick="goPage(${page + 1})" ${page === pages ? 'disabled' : ''}>→</button>`;

  el.innerHTML = btns;
}

window.goPage = (p) => {
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  loadComplaintsTable();
};

// ── Filters ────────────────────────────────
function setupFilters() {
  document.getElementById('applyFilters')?.addEventListener('click', () => {
    currentPage = 1;
    loadComplaintsTable();
  });
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('searchInput').value = '';
    currentPage = 1;
    loadComplaintsTable();
  });
  document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { currentPage = 1; loadComplaintsTable(); }
  });
}

// ── Analytics ──────────────────────────────
async function loadAnalytics(days = 30) {
  try {
    const data = await apiFetch(`/analytics?days=${days}`);
    const { summary, byCategory, byStatus, dailyTrend } = data;

    // KPI
    setEl('an-total', summary.total || 0);
    setEl('an-rate', `${summary.resolutionRate || 0}%`);
    setEl('an-frequent', summary.mostFrequent || '—');
    setEl('an-avgtime', summary.avgResolutionHours != null ? `${summary.avgResolutionHours}h` : 'N/A');

    renderCategoryPieChart('categoryPieChart', byCategory);
    renderCategoryBarChart(byCategory);
    renderAreaChart(dailyTrend);
    renderStatusBars(byStatus, summary.total);
  } catch (err) {
    console.error('Analytics error:', err);
  }
}

// Chart: Trend line (dashboard)
function renderTrendChart(trend = []) {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;
  destroyChart('trendChart');
  const labels = trend.map((d) => formatShortDate(d.date));
  const values = trend.map((d) => d.count);
  charts['trendChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Complaints',
        data: values,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#2563eb',
      }],
    },
    options: chartOptions(),
  });
}

// Chart: Pie (category)
function renderCategoryPieChart(canvasId, byCategory = []) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  destroyChart(canvasId);
  const labels = byCategory.map((c) => c._id);
  const values = byCategory.map((c) => c.count);
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];
  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } },
      },
      cutout: '60%',
    },
  });
}

// Chart: Bar (category)
function renderCategoryBarChart(byCategory = []) {
  const ctx = document.getElementById('categoryBarChart');
  if (!ctx) return;
  destroyChart('categoryBarChart');
  const labels = byCategory.map((c) => c._id);
  const values = byCategory.map((c) => c.count);
  const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];
  charts['categoryBarChart'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Complaints',
        data: values,
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      ...chartOptions(),
      plugins: { legend: { display: false } },
    },
  });
}

// Chart: Area (analytics trend)
function renderAreaChart(trend = []) {
  const ctx = document.getElementById('trendAreaChart');
  if (!ctx) return;
  destroyChart('trendAreaChart');
  const labels = trend.map((d) => formatShortDate(d.date));
  const values = trend.map((d) => d.count);
  charts['trendAreaChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Complaints',
        data: values,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#2563eb',
      }],
    },
    options: chartOptions({ showLegend: false }),
  });

  document.getElementById('trendDays')?.addEventListener('change', (e) => {
    loadAnalytics(parseInt(e.target.value));
  });
}

// Status bars
function renderStatusBars(byStatus = [], total = 0) {
  const container = document.getElementById('statusBars');
  if (!container) return;
  const statuses = [
    { key: 'Pending', cls: 'fill-pending' },
    { key: 'In Progress', cls: 'fill-inprogress' },
    { key: 'Resolved', cls: 'fill-resolved' },
  ];
  container.innerHTML = statuses.map(({ key, cls }) => {
    const count = byStatus.find((s) => s._id === key)?.count || 0;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="status-bar-item">
        <div class="status-bar-label">
          <span>${STATUS_ICONS[key]} ${key}</span>
          <span>${count} (${pct}%)</span>
        </div>
        <div class="status-bar-track">
          <div class="status-bar-fill ${cls}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function chartOptions({ showLegend = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8', maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 1 },
      },
    },
    plugins: {
      legend: { display: showLegend },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
  };
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ── Modal ──────────────────────────────────
function setupModals() {
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modalSave')?.addEventListener('click', saveStatus);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

window.openModal = async (id) => {
  currentComplaintId = id;
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('modalBody').innerHTML = '<p style="color:var(--gray-400);padding:20px">Loading...</p>';

  try {
    const c = await apiFetch(`/complaints/${id}`);
    document.getElementById('modalTitle').textContent = `Complaint — ${c.issueType}`;
    document.getElementById('modalStatus').value = c.status;
    document.getElementById('modalNotes').value = c.adminNotes || '';

    document.getElementById('modalBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Complainant</div>
          <div class="detail-value">${esc(c.name)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Email</div>
          <div class="detail-value">${esc(c.email)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Category</div>
          <div class="detail-value">${CAT_ICONS[c.issueType] || '📋'} ${esc(c.issueType)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value">${statusBadge(c.status)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Submitted</div>
          <div class="detail-value">${new Date(c.createdAt).toLocaleString()}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Location</div>
          <div class="detail-value" style="font-size:13px">${esc(c.location?.address || '—')}</div>
        </div>
        ${c.location?.lat ? `
        <div class="detail-item">
          <div class="detail-label">Coordinates</div>
          <div class="detail-value" style="font-size:12px;font-family:monospace">${c.location.lat.toFixed(5)}, ${c.location.lng.toFixed(5)}</div>
        </div>` : ''}
        ${c.aiConfidence ? `
        <div class="detail-item">
          <div class="detail-label">AI Confidence</div>
          <div class="detail-value">${Math.round(c.aiConfidence * 100)}%</div>
        </div>` : ''}
      </div>
      <div class="detail-label" style="margin-bottom:6px">Description</div>
      <div class="detail-desc">${esc(c.description)}</div>
      ${c.adminNotes ? `
        <div class="detail-label" style="margin-bottom:6px">Admin Notes</div>
        <div class="detail-desc" style="background:#fffbeb;border-color:#fde68a;">${esc(c.adminNotes)}</div>
      ` : ''}
      ${c.image ? `
        <div class="detail-label" style="margin-bottom:6px">Uploaded Image</div>
        <img src="http://localhost:5000${c.image}" alt="Complaint image" class="modal-img" />
      ` : ''}
    `;
  } catch (err) {
    document.getElementById('modalBody').innerHTML = `<p style="color:#ef4444;padding:20px">Failed to load complaint details</p>`;
  }
};

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  currentComplaintId = null;
}

async function saveStatus() {
  if (!currentComplaintId) return;
  const status = document.getElementById('modalStatus').value;
  const adminNotes = document.getElementById('modalNotes').value.trim();
  const btn = document.getElementById('modalSave');

  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    await apiFetch(`/complaints/${currentComplaintId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });

    showToast(`✅ Status updated to "${status}"`, 'success');
    closeModal();
    loadDashboard();
    loadComplaintsTable();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Update';
    btn.disabled = false;
  }
}

// ── Delete ─────────────────────────────────
window.deleteComplaint = async (id) => {
  if (!confirm('Are you sure you want to delete this complaint? This cannot be undone.')) return;
  try {
    await apiFetch(`/complaints/${id}`, { method: 'DELETE' });
    showToast('Complaint deleted', 'success');
    loadDashboard();
    loadComplaintsTable();
    loadAnalytics();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ── Refresh Button ─────────────────────────
function setupRefresh() {
  document.getElementById('refreshBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    await Promise.all([loadDashboard(), loadComplaintsTable(), loadAnalytics()]);
    btn.classList.remove('spinning');
    showToast('Data refreshed', 'success');
  });
}

// ── Helpers ────────────────────────────────
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(status) {
  const cls = {
    Pending: 'badge-pending',
    'In Progress': 'badge-inprogress',
    Resolved: 'badge-resolved',
  }[status] || 'badge-pending';
  return `<span class="status-badge ${cls}">${status}</span>`;
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatShortDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

let toastTimer;
function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
