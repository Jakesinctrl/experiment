let allPatients = [];
let currentRecordId = null;

async function apiFetch(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  const merged = { ...defaultOptions, ...options };
  if (options.body && typeof options.body !== 'string') {
    merged.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, merged);
  if (res.status === 401 || res.status === 403) {
    showToast('Session expired or unauthorized. Please log in again.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1800);
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    let errorMsg = 'Server error';
    try {
      const errData = await res.json();
      errorMsg = errData.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function showSection(name) {
  document.querySelectorAll('.portal-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-section]').forEach(b => b.classList.remove('active'));
  const section = document.getElementById('section-' + name);
  const button = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (section) section.classList.add('active');
  if (button) button.classList.add('active');
  if (name === 'patient') loadPatients();
  else if (name === 'appointment') loadAppointments();
  else if (name === 'waitlist') loadWaitlist();
  else if (name === 'record') loadRecords();
  else if (name === 'feedback') loadFeedback();
}

async function checkAuth() {
  try {
    const data = await apiFetch('/api/me');
    if (!data.success || data.role !== 'admin') {
      showToast('Access denied. Admin only.', 'error');
      setTimeout(() => window.location.href = 'index.html', 2000);
      return false;
    }
    return true;
  } catch (err) {
    showToast('Please log in first.', 'error');
    setTimeout(() => window.location.href = 'index.html', 2000);
    return false;
  }
}

function logout() {
  if (!confirm('Are you sure you want to log out?')) return;
  fetch('/api/logout', {
    method: 'POST',
    credentials: 'include'
  })
    .then(() => {
      showToast('Logged out successfully');
      setTimeout(() => window.location.href = 'index.html', 1200);
    })
    .catch(() => {
      showToast('Logout failed – redirecting anyway', 'warning');
      window.location.href = 'index.html';
    });
}

async function loadPatients() {
  try {
    const response = await apiFetch('/api/patients');
    allPatients = response.data || [];
    renderPatientGrid(allPatients);
    renderPatientStats(allPatients);
  } catch (err) {
    document.getElementById('patientGrid').innerHTML =
      `<p style="color:var(--danger); text-align:center; padding:40px;">Error: ${err.message}</p>`;
  }
}

function renderPatientStats(patients) {
  const stats = document.getElementById('patientStats');
  const total = patients.length;
  const normal = patients.filter(p => p.bmi_status === 'Normal').length;
  const overweight = patients.filter(p => p.bmi_status === 'Overweight').length;
  const underweight = patients.filter(p => p.bmi_status === 'Underweight').length;
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Patients</div>
      <div class="stat-value">${total}</div>
      <div class="stat-icon">👤</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Normal BMI</div>
      <div class="stat-value" style="color:#2D6A4F;">${normal}</div>
      <div class="stat-icon">✅</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Overweight</div>
      <div class="stat-value" style="color:#E05C00;">${overweight}</div>
      <div class="stat-icon">⚠️</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Underweight</div>
      <div class="stat-value" style="color:#0077B6;">${underweight}</div>
      <div class="stat-icon">📉</div>
    </div>
  `;
}

function renderPatientGrid(patients) {
  const grid = document.getElementById('patientGrid');
  if (!patients.length) {
    grid.innerHTML = `<p style="color:var(--text-muted); text-align:center; grid-column:1/-1; padding:40px;">No patients found.</p>`;
    return;
  }
  grid.innerHTML = patients.map(p => {
    const initials = getInitials(p.full_name);
    const bmiClass = p.bmi_status === 'Overweight' ? 'bmi-overweight' :
                     p.bmi_status === 'Underweight' ? 'bmi-underweight' : 'bmi-normal';
    return `
      <article class="patient-card" aria-label="Patient: ${escapeHtml(p.full_name)}">
        <div class="patient-card-header">
          <div class="patient-avatar" aria-hidden="true">${initials}</div>
          <div>
            <div class="patient-card-name">${escapeHtml(p.full_name)}</div>
            <div class="patient-card-lrn">LRN: ${escapeHtml(p.lrn)}</div>
          </div>
        </div>
        <div class="patient-card-body">
          <div class="field"><span class="field-label">Grade/Section</span><span class="field-value">${escapeHtml(p.grade_section || '—')}</span></div>
          <div class="field"><span class="field-label">BMI Status</span><span class="field-value ${bmiClass}">${escapeHtml(p.bmi_status || '—')}</span></div>
          <div class="field"><span class="field-label">Height</span><span class="field-value">${escapeHtml(p.height || '—')}</span></div>
          <div class="field"><span class="field-label">Weight</span><span class="field-value">${escapeHtml(p.weight || '—')}</span></div>
          <div class="field"><span class="field-label">Med History</span><span class="field-value">${escapeHtml(p.history || 'None')}</span></div>
          <div class="field"><span class="field-label">Clinic Exposure</span><span class="field-value">${escapeHtml(p.clinic_exposure || 'None')}</span></div>
        </div>
        ${(p.email || p.home_address || p.contact_no) ? `
          <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--green-light); font-size:0.75rem; color:var(--text-muted);">
            ${p.email ? `<div>📧 ${escapeHtml(p.email)}</div>` : ''}
            ${p.home_address ? `<div>🏠 ${escapeHtml(p.home_address)}</div>` : ''}
            ${p.contact_no ? `<div>📞 ${escapeHtml(p.contact_no)}</div>` : ''}
          </div>` : ''}
        <div class="patient-card-actions">
          <button class="btn btn-outline btn-sm" onclick="openEditPatientModal(${p.id})">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePatient(${p.id})">🗑 Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function filterPatients(query) {
  if (!query.trim()) {
    renderPatientGrid(allPatients);
    return;
  }
  const q = query.toLowerCase();
  const filtered = allPatients.filter(p =>
    p.full_name.toLowerCase().includes(q) ||
    p.lrn.toLowerCase().includes(q) ||
    (p.grade_section || '').toLowerCase().includes(q)
  );
  renderPatientGrid(filtered);
}

function openAddPatientModal() {
  if (allPatients.length >= 50) {
    showToast('⚠️ Maximum of 50 patients reached.', 4000);
    return;
  }
  clearPatientForm();
  document.getElementById('patientModalTitle').textContent = 'Add New Patient';
  document.getElementById('patientId').value = '';
  document.getElementById('patientModal').classList.remove('hidden');
}

function openEditPatientModal(id) {
  const p = allPatients.find(x => x.id === id);
  if (!p) return;
  document.getElementById('patientModalTitle').textContent = 'Edit Patient';
  document.getElementById('patientId').value = p.id;
  document.getElementById('pFullName').value = p.full_name || '';
  document.getElementById('pLrn').value = p.lrn || '';
  document.getElementById('pGrade').value = p.grade_section || '';
  document.getElementById('pHeight').value = p.height || '';
  document.getElementById('pWeight').value = p.weight || '';
  document.getElementById('pBmi').value = p.bmi_status || 'Normal';
  document.getElementById('pHistory').value = p.history || '';
  document.getElementById('pExposure').value = p.clinic_exposure || '';
  document.getElementById('pEmail').value = p.email || '';
  document.getElementById('pAddress').value = p.home_address || '';
  document.getElementById('pContact').value = p.contact_no || '';
  document.getElementById('patientModal').classList.remove('hidden');
}

function closePatientModal() {
  document.getElementById('patientModal').classList.add('hidden');
  clearPatientForm();
}

function clearPatientForm() {
  document.getElementById('patientForm').reset();
}

async function savePatient(event) {
  event.preventDefault();
  const id = document.getElementById('patientId').value;
  const payload = {
    full_name: document.getElementById('pFullName').value.trim(),
    lrn: document.getElementById('pLrn').value.trim(),
    grade_section: document.getElementById('pGrade').value.trim(),
    height: document.getElementById('pHeight').value.trim(),
    weight: document.getElementById('pWeight').value.trim(),
    bmi_status: document.getElementById('pBmi').value,
    history: document.getElementById('pHistory').value.trim() || 'None',
    clinic_exposure: document.getElementById('pExposure').value.trim() || 'None',
    email: document.getElementById('pEmail').value.trim(),
    home_address: document.getElementById('pAddress').value.trim(),
    contact_no: document.getElementById('pContact').value.trim()
  };
  if (!payload.full_name || !payload.lrn) {
    showToast('⚠️ Full Name and LRN are required.', 3000);
    return;
  }
  try {
    let res;
    if (id) {
      res = await apiFetch(`/api/patients/${id}`, {
        method: 'PUT',
        body: payload
      });
    } else {
      res = await apiFetch('/api/patients', {
        method: 'POST',
        body: payload
      });
    }
    showToast(id ? '✅ Patient updated!' : '✅ Patient added!');
    closePatientModal();
    loadPatients();
  } catch (err) {
    showToast(`❌ ${err.message}`, 4000);
  }
}

async function deletePatient(id) {
  if (!confirm('Delete this patient record? This cannot be undone.')) return;
  try {
    await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
    showToast('🗑 Patient deleted.');
    loadPatients();
  } catch (err) {
    showToast(`❌ ${err.message}`, 4000);
  }
}

async function loadAppointments() {
  const tbody = document.getElementById('appointmentsBody');
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">Loading…</td></tr>`;
  try {
    const response = await apiFetch('/api/appointments');
    const appts = response.data || [];
    const pendingCount = appts.filter(a => a.status === 'Pending').length;
    const badge = document.getElementById('pendingBadge');
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? 'inline' : 'none';
    if (!appts.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:30px;">No appointment requests yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = appts.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(a.student_name)}</strong></td>
        <td>${escapeHtml(a.grade || '—')}</td>
        <td><code style="font-size:0.8rem;">${escapeHtml(a.lrn || '—')}</code></td>
        <td>${escapeHtml(a.service_type)}</td>
        <td style="max-width:180px; word-wrap:break-word;">${escapeHtml(a.description || '—')}</td>
        <td style="white-space:nowrap;">${formatDate(a.created_at)}</td>
        <td>${statusBadge(a.status)}</td>
        <td>
          ${a.status === 'Pending' ? `
            <div style="display:flex; gap:6px;">
              <button class="btn btn-primary btn-sm" onclick="updateAppointmentStatus(${a.id}, 'Approved')">✅ Approve</button>
              <button class="btn btn-danger btn-sm" onclick="updateAppointmentStatus(${a.id}, 'Rejected')">❌ Reject</button>
            </div>` : `
            <button class="btn btn-outline btn-sm" onclick="deleteAppointment(${a.id})">🗑 Remove</button>`
          }
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--danger); text-align:center; padding:20px;">${err.message}</td></tr>`;
  }
}

async function updateAppointmentStatus(id, status) {
  try {
    await apiFetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: { status }
    });
    showToast(status === 'Approved' ? '✅ Approved & added to Waitlist!' : '❌ Rejected.', 3000);
    loadAppointments();
    loadWaitlist();
  } catch (err) {
    showToast(`❌ ${err.message}`, 4000);
  }
}

async function deleteAppointment(id) {
  if (!confirm('Remove this appointment from the list?')) return;
  try {
    await apiFetch(`/api/appointments/${id}`, { method: 'DELETE' });
    showToast('🗑 Appointment removed.');
    loadAppointments();
  } catch (err) {
    showToast(`❌ ${err.message}`, 4000);
  }
}

async function loadWaitlist() {
  const tbody = document.getElementById('waitlistBody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Loading…</td></tr>`;
  try {
    const response = await apiFetch('/api/appointments/waitlist');
    const items = response.data || [];
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:30px;">No approved appointments yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(a.student_name)}</strong></td>
        <td>${escapeHtml(a.grade || '—')}</td>
        <td><code style="font-size:0.8rem;">${escapeHtml(a.lrn || '—')}</code></td>
        <td>${escapeHtml(a.service_type)}</td>
        <td style="max-width:200px; word-wrap:break-word;">${escapeHtml(a.description || '—')}</td>
        <td>${formatDate(a.created_at)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--danger); text-align:center; padding:20px;">${err.message}</td></tr>`;
  }
}

async function loadRecords() {
  const grid = document.getElementById('recordsGrid');
  grid.innerHTML = `<p style="color:var(--text-muted);">Loading…</p>`;
  try {
    const response = await apiFetch('/api/records');
    const records = response.data || [];
    if (!records.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:50px; color:var(--text-muted);">
          <div style="font-size:3rem; margin-bottom:12px;">📁</div>
          <p>No records yet. Click "Create New Record" to start.</p>
        </div>`;
      return;
    }
    grid.innerHTML = records.map(r => `
      <div class="record-file" onclick="openRecord(${r.id})" role="button" tabindex="0"
           aria-label="Open record: ${escapeHtml(r.title)}"
           onkeydown="if(event.key==='Enter')openRecord(${r.id})">
        <div class="file-icon" aria-hidden="true">📄</div>
        <div class="file-name">${escapeHtml(r.title)}</div>
        <div class="file-date">${formatDate(r.updated_at)}</div>
        <button class="file-delete" onclick="event.stopPropagation(); deleteRecord(${r.id})" aria-label="Delete record">✕</button>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
  }
}

async function createNewRecord() {
  try {
    const data = await apiFetch('/api/records', {
      method: 'POST',
      body: { title: 'Untitled Record' }
    });
    if (data.id) openRecord(data.id);
  } catch (err) {
    showToast(`❌ ${err.message}`, 4000);
  }
}

async function openRecord(id) {
  console.log(`openRecord called with id: ${id}`);
  try {
    const response = await apiFetch(`/api/records/${id}`);
    console.log('Full response:', response);

    if (!response.success || !response.data) {
      throw new Error('Invalid record data');
    }

    const record = response.data;
    currentRecordId = record.id;  
    console.log('Set currentRecordId to:', currentRecordId);

    document.getElementById('editorTitle').value = record.title || 'Untitled Record';
    document.getElementById('editorTextarea').value = record.content || '';
    document.getElementById('recordsGridView').classList.add('hidden');
    document.getElementById('recordEditorView').classList.remove('hidden');
    document.getElementById('editorTextarea').focus();
  } catch (err) {
    console.error('Failed to open record:', err);
    showToast(`❌ Failed to load record: ${err.message}`, 5000);
  }
}

async function saveRecord() {
  console.log('saveRecord called — currentRecordId =', currentRecordId);
  if (!currentRecordId) {
    console.warn('saveRecord exited early — no currentRecordId');
    showToast('⚠️ No record selected to save', 3000);
    return;
  }
  const title = document.getElementById('editorTitle').value.trim() || 'Untitled Record';
  const content = document.getElementById('editorTextarea').value;
  try {
    console.log(`Saving record ${currentRecordId}...`);
    await apiFetch(`/api/records/${currentRecordId}`, {
      method: 'PUT',
      body: { title, content }
    });
    showToast('💾 Record saved!');
  } catch (err) {
    console.error('Save failed:', err);
    showToast(`❌ ${err.message}`, 4000);
  }
}

async function deleteCurrentRecord() {
  console.log('deleteCurrentRecord called — currentRecordId =', currentRecordId);
  if (!currentRecordId) {
    console.warn('deleteCurrentRecord exited early — no currentRecordId');
    showToast('⚠️ No record selected to delete', 3000);
    return;
  }
  if (!confirm('Delete this record permanently?')) return;
  await deleteRecord(currentRecordId, true);
}

function closeEditor() {
  saveRecord().then(() => {
    document.getElementById('recordEditorView').classList.add('hidden');
    document.getElementById('recordsGridView').classList.remove('hidden');
    currentRecordId = null;
    loadRecords();
  });
}

async function deleteRecord(id, fromEditor = false) {
  console.log('deleteRecord() called — id:', id, 'fromEditor:', fromEditor);
  if (!fromEditor && !confirm('Delete this record permanently?')) return;
  try {
    console.log('Sending DELETE to /api/records/' + id);
    await apiFetch(`/api/records/${id}`, { method: 'DELETE' });
    showToast('🗑 Record deleted.');
    if (fromEditor) {
      document.getElementById('recordEditorView').classList.add('hidden');
      document.getElementById('recordsGridView').classList.remove('hidden');
      currentRecordId = null;
    }
    loadRecords();
  } catch (err) {
    console.error('Delete failed:', err);
    showToast(`❌ ${err.message}`, 4000);
  }
}

async function loadFeedback() {
  const tbody = document.getElementById('feedbackBody');
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">Loading…</td></tr>`;
  try {
    const response = await apiFetch('/api/feedback');
    const items = response.data || [];
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:30px;">No feedback messages yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((f, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="max-width:400px; word-wrap:break-word; white-space:pre-wrap;">${escapeHtml(f.message)}</td>
        <td style="white-space:nowrap;">${formatDate(f.created_at)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteFeedback(${f.id})">🗑 Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger); text-align:center; padding:20px;">${err.message}</td></tr>`;
  }
}

async function deleteFeedback(id) {
  if (!confirm('Delete this feedback message?')) return;
  try {
    await apiFetch(`/api/feedback/${id}`, { method: 'DELETE' });
    showToast('🗑 Feedback deleted.');
    loadFeedback();
  } catch (err) {
    showToast(`❌ ${err.message}`, 4000);
  }
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function statusBadge(status) {
  const map = { 'Pending': 'badge-pending', 'Approved': 'badge-approved', 'Rejected': 'badge-rejected' };
  return `<span class="badge ${map[status] || 'badge-pending'}">${escapeHtml(status)}</span>`;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.getElementById('patientModal').addEventListener('click', function(e) {
  if (e.target === this) closePatientModal();
});

window.addEventListener('DOMContentLoaded', async () => {
  const authenticated = await checkAuth();
  if (!authenticated) return;
  loadPatients();
  loadAppointments();
});