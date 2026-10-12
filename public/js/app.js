/**
 * Blood Bank Management System - Main Application Logic
 */

// Blood Compatibility Chart rules
const COMPATIBILITY_RULES = {
  'A+': { giveTo: ['A+', 'AB+'], receiveFrom: ['A+', 'A-', 'O+', 'O-'] },
  'O+': { giveTo: ['O+', 'A+', 'B+', 'AB+'], receiveFrom: ['O+', 'O-'] },
  'B+': { giveTo: ['B+', 'AB+'], receiveFrom: ['B+', 'B-', 'O+', 'O-'] },
  'AB+': { giveTo: ['AB+'], receiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }, // Universal Recipient
  'A-': { giveTo: ['A+', 'A-', 'AB+', 'AB-'], receiveFrom: ['A-', 'O-'] },
  'O-': { giveTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], receiveFrom: ['O-'] }, // Universal Donor
  'B-': { giveTo: ['B+', 'B-', 'AB+', 'AB-'], receiveFrom: ['B-', 'O-'] },
  'AB-': { giveTo: ['AB+', 'AB-'], receiveFrom: ['AB-', 'A-', 'B-', 'O-'] }
};

// Application State
const AppState = {
  currentUser: null,
  currentView: 'home', // 'home', 'admin', 'donor', 'patient'
  adminTab: 'inventory', // 'inventory', 'requests', 'donations', 'issues', 'users'
  donorTab: 'overview',
  patientTab: 'my-requests',
  selectedCompatGroup: 'O+',
  cachedStock: [],
  cachedDonations: [],
  cachedRequests: [],
  cachedIssues: []
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  // Check persisted session
  const storedUser = localStorage.getItem('blood_bank_session_user');
  if (storedUser) {
    try {
      AppState.currentUser = JSON.parse(storedUser);
    } catch (e) {
      AppState.currentUser = null;
    }
  }

  setupEventListeners();
  renderCompatibility('O+');
  await refreshAllData();
  updateView();
});

// Setup Global UI Event Listeners
function setupEventListeners() {
  // Navigation Links
  document.querySelectorAll('[data-view-target]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = el.getAttribute('data-view-target');
      navigateToView(target);
    });
  });

  // Modal Open / Close buttons
  document.querySelectorAll('[data-open-modal]').forEach(el => {
    el.addEventListener('click', () => {
      const modalId = el.getAttribute('data-open-modal');
      openModal(modalId);
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // Close modal when clicking on backdrop
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  // Compatibility selector buttons
  document.querySelectorAll('.matrix-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.matrix-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const bg = btn.getAttribute('data-group');
      renderCompatibility(bg);
    });
  });

  // Auth Form Handlers
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Quick Demo Logins
  document.querySelectorAll('[data-demo-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-demo-role');
      loginAsDemo(role);
    });
  });

  // Action Forms
  const scheduleDonationForm = document.getElementById('scheduleDonationForm');
  if (scheduleDonationForm) {
    scheduleDonationForm.addEventListener('submit', handleCreateDonation);
  }

  const bloodRequestForm = document.getElementById('bloodRequestForm');
  if (bloodRequestForm) {
    bloodRequestForm.addEventListener('submit', handleCreateBloodRequest);
  }

  const stockAdjustForm = document.getElementById('stockAdjustForm');
  if (stockAdjustForm) {
    stockAdjustForm.addEventListener('submit', handleStockAdjustment);
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// -------------------------------------------------------------
// Data Sync & Refresh
// -------------------------------------------------------------
async function refreshAllData() {
  try {
    const [stock, donations, requests, issues, stats] = await Promise.all([
      ApiClient.getStock(),
      ApiClient.getDonations(),
      ApiClient.getRequests(),
      ApiClient.getIssues(),
      ApiClient.getDashboardStats()
    ]);

    AppState.cachedStock = stock || [];
    AppState.cachedDonations = donations || [];
    AppState.cachedRequests = requests || [];
    AppState.cachedIssues = issues || [];

    renderStockCards(AppState.cachedStock);
    renderHeroCounters(stats, AppState.cachedStock);

    if (AppState.currentView === 'admin') {
      renderAdminDashboard(stats);
    } else if (AppState.currentView === 'donor') {
      renderDonorPortal();
    } else if (AppState.currentView === 'patient') {
      renderPatientPortal();
    }
  } catch (err) {
    console.error('Error refreshing data:', err);
  }
}

// -------------------------------------------------------------
// View Routing & UI Updates
// -------------------------------------------------------------
function navigateToView(viewName) {
  if (viewName === 'admin' && (!AppState.currentUser || AppState.currentUser.role !== 'ROLE_ADMIN')) {
    showToast('Please log in with an Administrator account.', 'info');
    openModal('authModal');
    return;
  }
  if (viewName === 'donor' && (!AppState.currentUser || AppState.currentUser.role !== 'ROLE_DONOR')) {
    showToast('Please log in as a registered Donor.', 'info');
    openModal('authModal');
    return;
  }
  if (viewName === 'patient' && (!AppState.currentUser || AppState.currentUser.role !== 'ROLE_PATIENT')) {
    showToast('Please log in as a Patient / Hospital Requester.', 'info');
    openModal('authModal');
    return;
  }

  AppState.currentView = viewName;
  updateView();
  refreshAllData();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateView() {
  const views = ['homeView', 'adminView', 'donorView', 'patientView'];
  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = 'none';
  });

  const activeEl = document.getElementById(AppState.currentView + 'View');
  if (activeEl) activeEl.style.display = 'block';

  // Update Nav items active state
  document.querySelectorAll('.nav-item').forEach(item => {
    const target = item.getAttribute('data-view-target');
    if (target === AppState.currentView) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update Auth Button / User Profile Pill in Navbar
  const authNavBtn = document.getElementById('navAuthBtn');
  const userNavPill = document.getElementById('navUserPill');
  const navUserName = document.getElementById('navUserName');
  const navUserRole = document.getElementById('navUserRole');

  if (AppState.currentUser) {
    if (authNavBtn) authNavBtn.style.display = 'none';
    if (userNavPill) {
      userNavPill.style.display = 'flex';
      navUserName.textContent = AppState.currentUser.fullName || AppState.currentUser.username;
      navUserRole.textContent = formatRole(AppState.currentUser.role);
    }
  } else {
    if (authNavBtn) authNavBtn.style.display = 'inline-flex';
    if (userNavPill) userNavPill.style.display = 'none';
  }
}

// -------------------------------------------------------------
// Render Public Home / Landing View
// -------------------------------------------------------------
function renderHeroCounters(stats, stockList) {
  const heroLives = document.getElementById('heroLivesCount');
  const heroDonors = document.getElementById('heroDonorsCount');
  const heroUnits = document.getElementById('heroUnitsCount');

  const totalStock = stockList.reduce((sum, s) => sum + Number(s.unitsAvailable), 0);
  if (heroUnits) heroUnits.textContent = totalStock;
  if (heroDonors) heroDonors.textContent = stats ? stats.totalDonors : 4;
  if (heroLives) heroLives.textContent = totalStock * 3; // 1 unit saves up to 3 lives

  // Render Mini Hero Stock Matrix
  const miniGrid = document.getElementById('miniStockGrid');
  if (miniGrid && stockList.length > 0) {
    miniGrid.innerHTML = stockList.map(s => {
      let statusClass = 'status-normal';
      let statusText = 'Adequate';
      if (s.unitsAvailable <= 10) {
        statusClass = 'status-critical';
        statusText = 'Critical';
      } else if (s.unitsAvailable <= s.minimumThreshold) {
        statusClass = 'status-low';
        statusText = 'Low Stock';
      }
      return `
        <div class="mini-stock-box" onclick="quickFilterStock('${s.bloodGroup}')">
          <div class="mini-blood-group">${s.bloodGroup}</div>
          <div class="mini-blood-count">${s.unitsAvailable} Units</div>
          <span class="mini-blood-status ${statusClass}">${statusText}</span>
        </div>
      `;
    }).join('');
  }
}

function renderStockCards(stockList) {
  const stockGrid = document.getElementById('publicStockGrid');
  if (!stockGrid) return;

  stockGrid.innerHTML = stockList.map(s => {
    const units = Number(s.unitsAvailable);
    const threshold = Number(s.minimumThreshold) || 10;
    const capacityPercent = Math.min(100, Math.round((units / 50) * 100));

    let fillClass = 'fill-high';
    let badgeClass = 'badge-completed';
    let statusLabel = 'In Stock';

    if (units <= 10) {
      fillClass = 'fill-low';
      badgeClass = 'badge-critical';
      statusLabel = 'Critical Low';
    } else if (units <= threshold) {
      fillClass = 'fill-mid';
      badgeClass = 'badge-pending';
      statusLabel = 'Low Supply';
    }

    return `
      <div class="stock-card">
        <div class="stock-card-top">
          <div class="blood-type-badge">${s.bloodGroup}</div>
          <div style="text-align: right;">
            <div class="stock-units-number">${units}</div>
            <div class="stock-units-label">Units Available</div>
          </div>
        </div>
        
        <div class="stock-capacity-bar">
          <div class="stock-capacity-fill ${fillClass}" style="width: ${capacityPercent}%;"></div>
        </div>
        
        <div class="stock-card-footer">
          <span class="badge ${badgeClass}">${statusLabel}</span>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-outline-danger" onclick="prepareQuickRequest('${s.bloodGroup}')">Request</button>
            <button class="btn btn-sm btn-primary" onclick="prepareQuickDonation('${s.bloodGroup}')">Donate</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCompatibility(bloodGroup) {
  AppState.selectedCompatGroup = bloodGroup;
  const data = COMPATIBILITY_RULES[bloodGroup];
  if (!data) return;

  const currentGroupLabel = document.getElementById('selectedGroupLabel');
  if (currentGroupLabel) currentGroupLabel.textContent = bloodGroup;

  const giveToContainer = document.getElementById('canGiveToContainer');
  if (giveToContainer) {
    giveToContainer.innerHTML = data.giveTo.map(bg => `<span class="compat-chip matched">${bg}</span>`).join('');
  }

  const receiveFromContainer = document.getElementById('canReceiveFromContainer');
  if (receiveFromContainer) {
    receiveFromContainer.innerHTML = data.receiveFrom.map(bg => `<span class="compat-chip matched">${bg}</span>`).join('');
  }
}

// -------------------------------------------------------------
// Admin Dashboard
// -------------------------------------------------------------
function setAdminTab(tabName) {
  AppState.adminTab = tabName;
  document.querySelectorAll('#adminView .portal-tab-btn').forEach(btn => {
    if (btn.getAttribute('data-admin-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const tabs = ['inventoryTab', 'requestsTab', 'donationsTab', 'issuesTab', 'usersTab'];
  tabs.forEach(t => {
    const el = document.getElementById('admin_' + t);
    if (el) el.style.display = 'none';
  });

  const activeEl = document.getElementById('admin_' + tabName + 'Tab');
  if (activeEl) activeEl.style.display = 'block';

  renderAdminTabData();
}

function renderAdminDashboard(stats) {
  // Update KPI Cards
  const kpiDonors = document.getElementById('adminKpiDonors');
  const kpiUnits = document.getElementById('adminKpiUnits');
  const kpiRequests = document.getElementById('adminKpiRequests');
  const kpiIssued = document.getElementById('adminKpiIssued');

  if (kpiDonors) kpiDonors.textContent = stats ? stats.totalDonors : AppState.cachedDonations.length;
  if (kpiUnits) kpiUnits.textContent = stats ? stats.totalAvailableUnits : 219;
  if (kpiRequests) kpiRequests.textContent = stats ? stats.totalRequests : AppState.cachedRequests.length;
  if (kpiIssued) kpiIssued.textContent = stats ? stats.totalUnitsIssued : AppState.cachedIssues.length;

  setAdminTab(AppState.adminTab);
}

function renderAdminTabData() {
  if (AppState.adminTab === 'inventory') renderAdminInventoryTable();
  if (AppState.adminTab === 'requests') renderAdminRequestsTable();
  if (AppState.adminTab === 'donations') renderAdminDonationsTable();
  if (AppState.adminTab === 'issues') renderAdminIssuesTable();
  if (AppState.adminTab === 'users') renderAdminUsersTable();
}

function renderAdminInventoryTable() {
  const tbody = document.getElementById('adminInventoryTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.cachedStock.map(s => {
    let status = '<span class="badge badge-completed">Adequate</span>';
    if (s.unitsAvailable <= 10) status = '<span class="badge badge-critical">Critical</span>';
    else if (s.unitsAvailable <= s.minimumThreshold) status = '<span class="badge badge-pending">Low</span>';

    return `
      <tr>
        <td><strong class="blood-tag">${s.bloodGroup}</strong></td>
        <td><strong style="font-size: 1.1rem; color: #fff;">${s.unitsAvailable} Units</strong></td>
        <td>${s.minimumThreshold || 10} Units</td>
        <td>${status}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="quickAdjustUnits('${s.bloodGroup}', -1)">-1</button>
            <button class="btn btn-sm btn-secondary" onclick="quickAdjustUnits('${s.bloodGroup}', 1)">+1</button>
            <button class="btn btn-sm btn-primary" onclick="openStockEditModal('${s.bloodGroup}', ${s.unitsAvailable}, ${s.minimumThreshold})">Edit</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminRequestsTable() {
  const tbody = document.getElementById('adminRequestsTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.cachedRequests.map(r => {
    let urgencyBadge = `<span class="badge badge-${r.urgency.toLowerCase()}">${r.urgency}</span>`;
    let statusBadge = `<span class="badge badge-${r.status.toLowerCase()}">${r.status}</span>`;

    let actionButtons = '';
    if (r.status === 'PENDING') {
      actionButtons = `
        <button class="btn btn-sm btn-success" onclick="updateRequestStatus(${r.id}, 'APPROVED')">Approve</button>
        <button class="btn btn-sm btn-outline-danger" onclick="updateRequestStatus(${r.id}, 'REJECTED')">Reject</button>
      `;
    } else if (r.status === 'APPROVED') {
      actionButtons = `
        <button class="btn btn-sm btn-primary" onclick="openIssueBloodModal(${r.id})">Issue Blood</button>
      `;
    } else if (r.status === 'ISSUED') {
      actionButtons = `
        <button class="btn btn-sm btn-secondary" onclick="viewIssueCertificateByRequestId(${r.id})">Receipt</button>
      `;
    }

    return `
      <tr>
        <td>#REQ-${r.id}</td>
        <td><strong>${r.patientName}</strong></td>
        <td><span class="blood-tag">${r.bloodGroup}</span></td>
        <td><strong>${r.unitsRequested} Units</strong></td>
        <td>${r.hospitalName}</td>
        <td>${urgencyBadge}</td>
        <td>${statusBadge}</td>
        <td><div style="display: flex; gap: 0.4rem;">${actionButtons}</div></td>
      </tr>
    `;
  }).join('');
}

function renderAdminDonationsTable() {
  const tbody = document.getElementById('adminDonationsTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.cachedDonations.map(d => {
    let statusBadge = `<span class="badge badge-${d.status.toLowerCase()}">${d.status}</span>`;
    let actionButtons = '';

    if (d.status === 'PENDING') {
      actionButtons = `
        <button class="btn btn-sm btn-success" onclick="updateDonationStatus(${d.id}, 'COMPLETED')">Complete & Add Stock</button>
        <button class="btn btn-sm btn-outline-danger" onclick="updateDonationStatus(${d.id}, 'REJECTED')">Reject</button>
      `;
    } else if (d.status === 'COMPLETED') {
      actionButtons = `<span style="color: #34d399; font-size: 0.82rem; font-weight: 600;">✓ Added to Inventory</span>`;
    }

    return `
      <tr>
        <td>#DON-${d.id}</td>
        <td><strong>${d.donorName || 'Registered Donor'}</strong></td>
        <td><span class="blood-tag">${d.bloodGroup}</span></td>
        <td>${d.units || 1} Unit</td>
        <td>${d.donationDate}</td>
        <td>${d.hospitalCenter || 'Central Center'}</td>
        <td>${statusBadge}</td>
        <td><div style="display: flex; gap: 0.4rem;">${actionButtons}</div></td>
      </tr>
    `;
  }).join('');
}

function renderAdminIssuesTable() {
  const tbody = document.getElementById('adminIssuesTbody');
  if (!tbody) return;

  tbody.innerHTML = AppState.cachedIssues.map(i => {
    return `
      <tr>
        <td><strong style="color: #38bdf8; font-family: monospace;">${i.certificateNumber}</strong></td>
        <td><strong>${i.issuedTo}</strong></td>
        <td><span class="blood-tag">${i.bloodGroup}</span></td>
        <td>${i.unitsIssued} Units</td>
        <td>${i.hospitalName}</td>
        <td>${i.issuedByAdmin}</td>
        <td>${i.issueDate}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewCertificateModal(${JSON.stringify(i).replace(/"/g, '&quot;')})">View Audit</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function renderAdminUsersTable() {
  const tbody = document.getElementById('adminUsersTbody');
  if (!tbody) return;

  const users = await ApiClient.getAllUsers();
  tbody.innerHTML = users.map(u => {
    return `
      <tr>
        <td>#USR-${u.id}</td>
        <td><strong>${u.fullName || u.username}</strong></td>
        <td>${u.email}</td>
        <td>${u.phone || 'N/A'}</td>
        <td><span class="blood-tag">${u.bloodGroup || 'N/A'}</span></td>
        <td><span class="badge ${u.role === 'ROLE_ADMIN' ? 'badge-critical' : u.role === 'ROLE_DONOR' ? 'badge-completed' : 'badge-approved'}">${formatRole(u.role)}</span></td>
        <td>${u.city || 'Metro City'}</td>
      </tr>
    `;
  }).join('');
}

// -------------------------------------------------------------
// Donor Portal
// -------------------------------------------------------------
function renderDonorPortal() {
  if (!AppState.currentUser) return;

  const user = AppState.currentUser;
  const donorNameEl = document.getElementById('donorCardName');
  const donorGroupEl = document.getElementById('donorCardGroup');
  const donorEmailEl = document.getElementById('donorCardEmail');
  const donorPhoneEl = document.getElementById('donorCardPhone');
  const donorCityEl = document.getElementById('donorCardCity');

  if (donorNameEl) donorNameEl.textContent = user.fullName || user.username;
  if (donorGroupEl) donorGroupEl.textContent = user.bloodGroup || 'O+';
  if (donorEmailEl) donorEmailEl.textContent = user.email;
  if (donorPhoneEl) donorPhoneEl.textContent = user.phone;
  if (donorCityEl) donorCityEl.textContent = user.city || 'Springfield';

  // Render Donor History
  const myDonations = AppState.cachedDonations.filter(d => Number(d.donorId) === Number(user.id));
  const donorHistoryTbody = document.getElementById('donorHistoryTbody');
  if (donorHistoryTbody) {
    if (myDonations.length === 0) {
      donorHistoryTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No donations recorded yet. Schedule your first donation today!</td></tr>`;
    } else {
      donorHistoryTbody.innerHTML = myDonations.map(d => {
        let statusBadge = `<span class="badge badge-${d.status.toLowerCase()}">${d.status}</span>`;
        return `
          <tr>
            <td>#DON-${d.id}</td>
            <td><span class="blood-tag">${d.bloodGroup}</span></td>
            <td>${d.units || 1} Unit</td>
            <td>${d.donationDate}</td>
            <td>${d.hospitalCenter || 'Central Center'}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Update Donor Impact Stats
  const completedCount = myDonations.filter(d => d.status === 'COMPLETED').length;
  const impactCountEl = document.getElementById('donorImpactCount');
  if (impactCountEl) impactCountEl.textContent = completedCount * 3;
}

// -------------------------------------------------------------
// Patient Portal
// -------------------------------------------------------------
function renderPatientPortal() {
  if (!AppState.currentUser) return;

  const user = AppState.currentUser;
  const patientWelcome = document.getElementById('patientWelcomeName');
  if (patientWelcome) patientWelcome.textContent = user.fullName || user.username;

  // Render Patient Requests
  const myRequests = AppState.cachedRequests.filter(r => Number(r.patientId) === Number(user.id));
  const patientRequestsTbody = document.getElementById('patientRequestsTbody');
  if (patientRequestsTbody) {
    if (myRequests.length === 0) {
      patientRequestsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No blood requests submitted yet.</td></tr>`;
    } else {
      patientRequestsTbody.innerHTML = myRequests.map(r => {
        let urgencyBadge = `<span class="badge badge-${r.urgency.toLowerCase()}">${r.urgency}</span>`;
        let statusBadge = `<span class="badge badge-${r.status.toLowerCase()}">${r.status}</span>`;
        let receiptAction = r.status === 'ISSUED' 
          ? `<button class="btn btn-sm btn-secondary" onclick="viewIssueCertificateByRequestId(${r.id})">Digital Receipt</button>` 
          : `<span style="color: var(--text-muted); font-size: 0.8rem;">Processing</span>`;

        return `
          <tr>
            <td>#REQ-${r.id}</td>
            <td><span class="blood-tag">${r.bloodGroup}</span></td>
            <td><strong>${r.unitsRequested} Units</strong></td>
            <td>${r.hospitalName}</td>
            <td>${urgencyBadge}</td>
            <td>${statusBadge}</td>
            <td>${receiptAction}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

// -------------------------------------------------------------
// Form Handlers & Actions
// -------------------------------------------------------------
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await ApiClient.login(username, password);
    AppState.currentUser = res;
    localStorage.setItem('blood_bank_session_user', JSON.stringify(res));
    showToast(`Welcome back, ${res.fullName || res.username}!`, 'success');
    closeAllModals();

    if (res.role === 'ROLE_ADMIN') navigateToView('admin');
    else if (res.role === 'ROLE_DONOR') navigateToView('donor');
    else navigateToView('patient');
  } catch (err) {
    showToast(err.message || 'Login failed', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const data = {
    username: document.getElementById('regUsername').value.trim(),
    password: document.getElementById('regPassword').value,
    fullName: document.getElementById('regFullName').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    phone: document.getElementById('regPhone').value.trim(),
    role: document.getElementById('regRole').value,
    bloodGroup: document.getElementById('regBloodGroup').value,
    age: Number(document.getElementById('regAge').value) || 25,
    gender: document.getElementById('regGender').value,
    city: document.getElementById('regCity').value.trim()
  };

  try {
    const res = await ApiClient.register(data);
    AppState.currentUser = res;
    localStorage.setItem('blood_bank_session_user', JSON.stringify(res));
    showToast('Registration successful! Welcome to the Blood Bank Network.', 'success');
    closeAllModals();

    if (res.role === 'ROLE_ADMIN') navigateToView('admin');
    else if (res.role === 'ROLE_DONOR') navigateToView('donor');
    else navigateToView('patient');
  } catch (err) {
    showToast(err.message || 'Registration failed', 'error');
  }
}

async function loginAsDemo(role) {
  let credentials = { username: 'admin', password: 'admin123' };
  if (role === 'ROLE_DONOR') credentials = { username: 'donor_alex', password: 'donor123' };
  if (role === 'ROLE_PATIENT') credentials = { username: 'patient_sarah', password: 'patient123' };

  try {
    const res = await ApiClient.login(credentials.username, credentials.password);
    AppState.currentUser = res;
    localStorage.setItem('blood_bank_session_user', JSON.stringify(res));
    showToast(`Logged in as ${res.fullName} (${formatRole(res.role)})`, 'success');
    closeAllModals();

    if (res.role === 'ROLE_ADMIN') navigateToView('admin');
    else if (res.role === 'ROLE_DONOR') navigateToView('donor');
    else navigateToView('patient');
  } catch (err) {
    showToast(err.message || 'Demo login failed', 'error');
  }
}

function handleLogout() {
  AppState.currentUser = null;
  localStorage.removeItem('blood_bank_session_user');
  showToast('Logged out successfully', 'info');
  navigateToView('home');
}

// Donation Booking Action
async function handleCreateDonation(e) {
  e.preventDefault();
  if (!AppState.currentUser) {
    showToast('Please log in to schedule a donation', 'info');
    openModal('authModal');
    return;
  }

  const data = {
    donorId: AppState.currentUser.id,
    donorName: AppState.currentUser.fullName || AppState.currentUser.username,
    donorEmail: AppState.currentUser.email,
    donorPhone: AppState.currentUser.phone,
    bloodGroup: document.getElementById('donationBloodGroup').value,
    units: Number(document.getElementById('donationUnits').value) || 1,
    donationDate: document.getElementById('donationDate').value,
    hospitalCenter: document.getElementById('donationHospital').value,
    diseaseHistory: document.getElementById('donationHealthCheck').checked ? 'None' : 'Self-declared clearance',
    status: 'PENDING'
  };

  try {
    await ApiClient.createDonation(data);
    showToast('Blood donation appointment successfully scheduled!', 'success');
    closeAllModals();
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Failed to schedule donation', 'error');
  }
}

// Blood Request Action
async function handleCreateBloodRequest(e) {
  e.preventDefault();
  if (!AppState.currentUser) {
    showToast('Please log in to submit a blood request', 'info');
    openModal('authModal');
    return;
  }

  const data = {
    patientId: AppState.currentUser.id,
    patientName: document.getElementById('reqPatientName').value.trim() || AppState.currentUser.fullName,
    bloodGroup: document.getElementById('reqBloodGroup').value,
    unitsRequested: Number(document.getElementById('reqUnits').value) || 1,
    hospitalName: document.getElementById('reqHospital').value.trim(),
    doctorName: document.getElementById('reqDoctor').value.trim(),
    urgency: document.getElementById('reqUrgency').value,
    reason: document.getElementById('reqReason').value.trim()
  };

  try {
    await ApiClient.createRequest(data);
    showToast('Blood request submitted to administrator queue!', 'success');
    closeAllModals();
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Failed to submit blood request', 'error');
  }
}

// Admin Action: Update Request Status
async function updateRequestStatus(id, status) {
  try {
    await ApiClient.updateRequestStatus(id, status);
    showToast(`Request #${id} status changed to ${status}`, 'success');
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Failed to update status', 'error');
  }
}

// Admin Action: Update Donation Status
async function updateDonationStatus(id, status) {
  try {
    await ApiClient.updateDonationStatus(id, status);
    showToast(`Donation #${id} status updated to ${status}. Inventory refreshed.`, 'success');
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Failed to update donation', 'error');
  }
}

// Admin Action: Issue Blood
function openIssueBloodModal(requestId) {
  const req = AppState.cachedRequests.find(r => Number(r.id) === Number(requestId));
  if (!req) return;

  document.getElementById('issueReqId').value = req.id;
  document.getElementById('issuePatientName').textContent = req.patientName;
  document.getElementById('issueBloodGroup').textContent = req.bloodGroup;
  document.getElementById('issueUnits').textContent = req.unitsRequested + ' Units';
  document.getElementById('issueHospital').textContent = req.hospitalName;

  openModal('issueBloodModal');
}

async function confirmIssueBlood() {
  const reqId = document.getElementById('issueReqId').value;
  const adminName = AppState.currentUser ? AppState.currentUser.fullName : 'Chief Administrator';
  const notes = document.getElementById('issueNotes').value;

  try {
    const issueResult = await ApiClient.issueBlood(reqId, adminName, notes);
    showToast('Blood successfully issued and inventory updated!', 'success');
    closeAllModals();
    await refreshAllData();
    viewCertificateModal(issueResult);
  } catch (err) {
    showToast(err.message || 'Failed to issue blood', 'error');
  }
}

// Quick Stock Adjustments
async function quickAdjustUnits(bloodGroup, delta) {
  const stock = AppState.cachedStock.find(s => s.bloodGroup === bloodGroup);
  if (!stock) return;
  const newUnits = Math.max(0, Number(stock.unitsAvailable) + delta);
  try {
    await ApiClient.updateStock(bloodGroup, newUnits, stock.minimumThreshold);
    showToast(`Stock for ${bloodGroup} updated to ${newUnits} units`, 'success');
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Failed to update stock', 'error');
  }
}

function openStockEditModal(bloodGroup, currentUnits, currentThreshold) {
  document.getElementById('adjustBloodGroup').value = bloodGroup;
  document.getElementById('adjustUnits').value = currentUnits;
  document.getElementById('adjustThreshold').value = currentThreshold || 10;
  openModal('stockAdjustModal');
}

async function handleStockAdjustment(e) {
  e.preventDefault();
  const bg = document.getElementById('adjustBloodGroup').value;
  const units = Number(document.getElementById('adjustUnits').value);
  const threshold = Number(document.getElementById('adjustThreshold').value);

  try {
    await ApiClient.updateStock(bg, units, threshold);
    showToast(`Inventory for ${bg} successfully updated`, 'success');
    closeAllModals();
    await refreshAllData();
  } catch (err) {
    showToast(err.message || 'Failed to update inventory', 'error');
  }
}

// Certificate Modal
function viewCertificateModal(issue) {
  if (!issue) return;

  document.getElementById('certNumber').textContent = issue.certificateNumber;
  document.getElementById('certPatient').textContent = issue.issuedTo;
  document.getElementById('certBloodGroup').textContent = issue.bloodGroup;
  document.getElementById('certUnits').textContent = issue.unitsIssued + ' Units';
  document.getElementById('certHospital').textContent = issue.hospitalName;
  document.getElementById('certOfficer').textContent = issue.issuedByAdmin;
  document.getElementById('certDate').textContent = issue.issueDate;
  document.getElementById('certNotes').textContent = issue.notes || 'Cold-chain dispatch protocol verified.';

  openModal('certificateModal');
}

function viewIssueCertificateByRequestId(requestId) {
  const issue = AppState.cachedIssues.find(i => Number(i.requestId) === Number(requestId));
  if (issue) {
    viewCertificateModal(issue);
  } else {
    showToast('Issuance certificate is being generated...', 'info');
  }
}

function printCertificate() {
  window.print();
}

// Quick Action Preparation from Public Stock Grid
function prepareQuickRequest(bloodGroup) {
  document.getElementById('reqBloodGroup').value = bloodGroup;
  if (!AppState.currentUser) {
    showToast(`Log in to request ${bloodGroup} blood units`, 'info');
    openModal('authModal');
  } else {
    openModal('bloodRequestModal');
  }
}

function prepareQuickDonation(bloodGroup) {
  document.getElementById('donationBloodGroup').value = bloodGroup;
  if (!AppState.currentUser) {
    showToast(`Log in to schedule a ${bloodGroup} blood donation`, 'info');
    openModal('authModal');
  } else {
    openModal('scheduleDonationModal');
  }
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Utility Helpers
function formatRole(role) {
  if (role === 'ROLE_ADMIN') return 'Administrator';
  if (role === 'ROLE_DONOR') return 'Blood Donor';
  if (role === 'ROLE_PATIENT') return 'Patient / Requester';
  return role || 'User';
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('loginTabContent');
  const registerTab = document.getElementById('registerTabContent');
  const loginBtn = document.getElementById('authTabLoginBtn');
  const regBtn = document.getElementById('authTabRegBtn');

  if (tab === 'login') {
    if (loginTab) loginTab.style.display = 'block';
    if (registerTab) registerTab.style.display = 'none';
    if (loginBtn) loginBtn.classList.add('active');
    if (regBtn) regBtn.classList.remove('active');
  } else {
    if (loginTab) loginTab.style.display = 'none';
    if (registerTab) registerTab.style.display = 'block';
    if (loginBtn) loginBtn.classList.remove('active');
    if (regBtn) regBtn.classList.add('active');
  }
}

// Expose globals for HTML onclicks
window.navigateToView = navigateToView;
window.setAdminTab = setAdminTab;
window.openModal = openModal;
window.closeAllModals = closeAllModals;
window.quickAdjustUnits = quickAdjustUnits;
window.openStockEditModal = openStockEditModal;
window.updateRequestStatus = updateRequestStatus;
window.updateDonationStatus = updateDonationStatus;
window.openIssueBloodModal = openIssueBloodModal;
window.confirmIssueBlood = confirmIssueBlood;
window.viewCertificateModal = viewCertificateModal;
window.viewIssueCertificateByRequestId = viewIssueCertificateByRequestId;
window.printCertificate = printCertificate;
window.prepareQuickRequest = prepareQuickRequest;
window.prepareQuickDonation = prepareQuickDonation;
window.switchAuthTab = switchAuthTab;
