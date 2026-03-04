const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const defaultOpts = {
    credentials: 'include',   
    headers: { 'Content-Type': 'application/json' },
  };
  const merged = { ...defaultOpts, ...options };
  if (options.body && typeof options.body !== 'string') {
    merged.body = JSON.stringify(options.body);
  }
  const res = await fetch(API_BASE + endpoint, merged);
  if (res.status === 401 || res.status === 403) {
    showToast('Session expired or unauthorized. Please log in.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let errData;
    try { errData = await res.json(); } catch {}
    throw new Error(errData?.message || `Server error (${res.status})`);
  }

  return res.json();
}
function showToast(message, type = 'success', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, duration);
}
async function checkAuth() {
  try {
    const data = await apiFetch('/me');
    if (!data.success || data.role !== 'student') {
      showToast('Access denied. Student login required.', 'error');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);
      return false;
    }
    // Optional: personalize greeting
    if (data.username) {
      document.getElementById('studentGreeting').textContent = `Welcome, ${data.username}`;
    }
    return true;
  } catch (err) {
    showToast('Please log in first.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return false;
  }
}
async function logout() {
  if (!confirm('Are you sure you want to log out?')) return;

  try {
    await apiFetch('/logout', { method: 'POST' });
    showToast('Logged out successfully', 'success');
  } catch (err) {
    showToast('Logout failed – redirecting anyway', 'warning');
  }
  setTimeout(() => { window.location.href = 'index.html'; }, 1200);
}
function showSection(name) {
  document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-section]').forEach(b => b.classList.remove('active'));

  const section = document.getElementById('section-' + name);
  const button = document.querySelector(`.nav-item[data-section="${name}"]`);

  if (section) section.classList.add('active');
  if (button) button.classList.add('active');
  if (name === 'appointments') {
    loadStudentAppointments('');
  }
}
async function loadStudentAppointments(nameQuery = '') {
  const tbody = document.getElementById('studentAppointmentsBody');

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Loading…</td></tr>`;

  if (!nameQuery.trim()) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">
          Enter your full name above and click Search to view your appointments.
        </td>
      </tr>`;
    return;
  }

  try {
    const appointments = await apiFetch(`/appointments/student/${encodeURIComponent(nameQuery.trim())}`);

    if (!appointments.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">
            No appointments found for "<strong>${escapeHtml(nameQuery)}</strong>".
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = appointments.map((appt, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(appt.service_type)}</td>
        <td>${escapeHtml(appt.grade || '—')}</td>
        <td><code style="font-size:0.8rem;">${escapeHtml(appt.lrn || '—')}</code></td>
        <td style="max-width:200px; word-wrap:break-word; white-space:pre-wrap;">${escapeHtml(appt.description || '—')}</td>
        <td style="white-space:nowrap;">${formatDate(appt.created_at)}</td>
        <td>${statusBadge(appt.status)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:var(--danger); padding:20px;">
          Error: ${err.message}
        </td>
      </tr>`;
  }
}
async function submitAppointment(event) {
  event.preventDefault();

  const payload = {
    service_type: document.getElementById('serviceType').value,
    student_name: document.getElementById('studentName').value.trim(),
    grade: document.getElementById('studentGrade').value.trim(),
    lrn: document.getElementById('studentLrn').value.trim(),
    description: document.getElementById('apptDescription').value.trim()
  };

  for (const val of Object.values(payload)) {
    if (!val) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
  }

  try {
    await apiFetch('/appointments', {
      method: 'POST',
      body: payload
    });

    showToast('✅ Appointment request submitted! Wait for admin approval.', 'success');
    document.getElementById('appointmentForm').reset();
    showSection('appointments');
  } catch (err) {
    showToast(`❌ Failed to submit: ${err.message}`, 'error');
  }
}
async function submitFeedback(event) {
  event.preventDefault();

  const message = document.getElementById('feedbackMessage').value.trim();

  if (!message) {
    showToast('Please write a message before sending.', 'error');
    return;
  }

  try {
    await apiFetch('/feedback', {
      method: 'POST',
      body: { message }
    });

    showToast('✅ Feedback sent! Thank you.', 'success');
    document.getElementById('feedbackForm').reset();
  } catch (err) {
    showToast(`❌ Failed to send: ${err.message}`, 'error');
  }
}
function statusBadge(status) {
  const map = {
    'Pending': 'badge-pending',
    'Approved': 'badge-approved',
    'Rejected': 'badge-rejected'
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${escapeHtml(status)}</span>`;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
window.addEventListener('DOMContentLoaded', async () => {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) return;
  showSection('appointments');
  document.getElementById('filterName')?.focus();
});
