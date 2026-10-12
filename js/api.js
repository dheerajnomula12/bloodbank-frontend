/**
 * Blood Bank Management System - API Client
 * Seamlessly interfaces with Spring Boot REST Endpoints with automatic fallback store
 */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? (window.location.port === '8080' ? '' : 'http://localhost:8080')
  : 'https://bloodbank-backend-0kjo.onrender.com';

// Initial Mock Seed Store (Used if Spring Boot backend is starting or offline)
const DEFAULT_STORE = {
  users: [
    { id: 1, username: 'admin', password: 'admin123', fullName: 'Chief Administrator', email: 'admin@bloodbank.org', phone: '+1 (555) 019-2831', role: 'ROLE_ADMIN', bloodGroup: 'O+', age: 38, gender: 'Male', city: 'Metro City' },
    { id: 2, username: 'donor_alex', password: 'donor123', fullName: 'Alex Morgan', email: 'alex.morgan@example.com', phone: '+1 (555) 234-5678', role: 'ROLE_DONOR', bloodGroup: 'O+', age: 28, gender: 'Male', city: 'Springfield' },
    { id: 3, username: 'donor_priya', password: 'donor123', fullName: 'Priya Sharma', email: 'priya.s@example.com', phone: '+1 (555) 876-5432', role: 'ROLE_DONOR', bloodGroup: 'B+', age: 25, gender: 'Female', city: 'Metro City' },
    { id: 4, username: 'donor_marcus', password: 'donor123', fullName: 'Marcus Vance', email: 'marcus.v@example.com', phone: '+1 (555) 345-6789', role: 'ROLE_DONOR', bloodGroup: 'A-', age: 32, gender: 'Male', city: 'Riverdale' },
    { id: 5, username: 'patient_sarah', password: 'patient123', fullName: 'Sarah Jenkins', email: 'sarah.j@example.com', phone: '+1 (555) 987-6543', role: 'ROLE_PATIENT', bloodGroup: 'O-', age: 29, gender: 'Female', city: 'Metro City' },
    { id: 6, username: 'patient_david', password: 'patient123', fullName: 'David Kim', email: 'david.kim@example.com', phone: '+1 (555) 456-7890', role: 'ROLE_PATIENT', bloodGroup: 'AB+', age: 45, gender: 'Male', city: 'Springfield' }
  ],
  stock: [
    { id: 1, bloodGroup: 'A+', unitsAvailable: 42, minimumThreshold: 15 },
    { id: 2, bloodGroup: 'A-', unitsAvailable: 16, minimumThreshold: 10 },
    { id: 3, bloodGroup: 'B+', unitsAvailable: 38, minimumThreshold: 15 },
    { id: 4, bloodGroup: 'B-', unitsAvailable: 11, minimumThreshold: 10 },
    { id: 5, bloodGroup: 'AB+', unitsAvailable: 24, minimumThreshold: 10 },
    { id: 6, bloodGroup: 'AB-', unitsAvailable: 8, minimumThreshold: 10 },
    { id: 7, bloodGroup: 'O+', unitsAvailable: 62, minimumThreshold: 20 },
    { id: 8, bloodGroup: 'O-', unitsAvailable: 14, minimumThreshold: 15 }
  ],
  donations: [
    { id: 1, donorId: 2, donorName: 'Alex Morgan', donorEmail: 'alex.morgan@example.com', donorPhone: '+1 555-234-5678', bloodGroup: 'O+', units: 1, donationDate: '2026-09-18', status: 'COMPLETED', hemoglobin: 14.8, weightKg: 74, bloodPressure: '120/80', hospitalCenter: 'City Central Blood Center' },
    { id: 2, donorId: 3, donorName: 'Priya Sharma', donorEmail: 'priya.s@example.com', donorPhone: '+1 555-876-5432', bloodGroup: 'B+', units: 1, donationDate: '2026-09-28', status: 'COMPLETED', hemoglobin: 13.5, weightKg: 59, bloodPressure: '118/76', hospitalCenter: 'Metropolitan Red Cross' },
    { id: 3, donorId: 4, donorName: 'Marcus Vance', donorEmail: 'marcus.v@example.com', donorPhone: '+1 555-345-6789', bloodGroup: 'A-', units: 1, donationDate: '2026-10-10', status: 'PENDING', hemoglobin: 14.2, weightKg: 79, bloodPressure: '122/82', hospitalCenter: 'Riverdale Community Clinic' }
  ],
  requests: [
    { id: 1, patientId: 5, patientName: 'Sarah Jenkins', bloodGroup: 'O-', unitsRequested: 2, hospitalName: 'City General Hospital - Trauma ICU', doctorName: 'Dr. Evelyn Reed', reason: 'Urgent blood transfusion required for emergency orthopedic trauma surgery.', urgency: 'CRITICAL', status: 'APPROVED', requestDate: '2026-10-06' },
    { id: 2, patientId: 6, patientName: 'David Kim', bloodGroup: 'AB+', unitsRequested: 1, hospitalName: 'Riverdale Memorial Hospital', doctorName: 'Dr. Robert Chen', reason: 'Pre-operative preparation for scheduled cardiovascular surgery.', urgency: 'NORMAL', status: 'PENDING', requestDate: '2026-10-07' }
  ],
  issues: [
    { id: 1, requestId: 1, bloodGroup: 'O-', unitsIssued: 2, issuedTo: 'Sarah Jenkins', hospitalName: 'City General Hospital - Trauma ICU', issuedByAdmin: 'Chief Administrator', certificateNumber: 'ISS-20261006-A89F12', issueDate: '2026-10-06 14:30:00', notes: 'Emergency priority transfer approved and sealed.' }
  ]
};

// Local storage helper
function getLocalData(key) {
  const data = localStorage.getItem('blood_bank_' + key);
  if (!data) {
    localStorage.setItem('blood_bank_' + key, JSON.stringify(DEFAULT_STORE[key]));
    return DEFAULT_STORE[key];
  }
  return JSON.parse(data);
}

function saveLocalData(key, data) {
  localStorage.setItem('blood_bank_' + key, JSON.stringify(data));
}

// Universal API Client with automatic fallback
const ApiClient = {
  async fetchWithFallback(url, options = {}, fallbackFn) {
    try {
      const res = await fetch(API_BASE_URL + url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      if (res.ok) {
        const json = await res.json();
        return json.data !== undefined ? json.data : json;
      }
      throw new Error(`Server returned ${res.status}`);
    } catch (err) {
      // Execute fallback if network or endpoint fails
      return fallbackFn();
    }
  },

  // Auth APIs
  async login(username, password) {
    return this.fetchWithFallback('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }, () => {
      const users = getLocalData('users');
      const user = users.find(u => (u.username === username || u.email === username) && u.password === password);
      if (!user) throw new Error('Invalid username or password');
      return { ...user, token: 'mock_token_' + Date.now() };
    });
  },

  async register(data) {
    return this.fetchWithFallback('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      const users = getLocalData('users');
      if (users.find(u => u.username === data.username)) throw new Error('Username already exists');
      const newUser = { id: Date.now(), ...data, role: data.role || 'ROLE_DONOR' };
      users.push(newUser);
      saveLocalData('users', users);
      return { ...newUser, token: 'mock_token_' + Date.now() };
    });
  },

  // Blood Stock APIs
  async getStock() {
    return this.fetchWithFallback('/api/stock', {}, () => getLocalData('stock'));
  },

  async updateStock(bloodGroup, units, minimumThreshold) {
    return this.fetchWithFallback('/api/stock/update', {
      method: 'PUT',
      body: JSON.stringify({ bloodGroup, units, minimumThreshold })
    }, () => {
      const stock = getLocalData('stock');
      const item = stock.find(s => s.bloodGroup === bloodGroup);
      if (item) {
        item.unitsAvailable = units;
        if (minimumThreshold !== undefined) item.minimumThreshold = minimumThreshold;
      } else {
        stock.push({ id: Date.now(), bloodGroup, unitsAvailable: units, minimumThreshold: minimumThreshold || 10 });
      }
      saveLocalData('stock', stock);
      return item;
    });
  },

  // Donation APIs
  async getDonations() {
    return this.fetchWithFallback('/api/donations', {}, () => getLocalData('donations'));
  },

  async getDonationsByDonor(donorId) {
    return this.fetchWithFallback(`/api/donations/donor/${donorId}`, {}, () => {
      const list = getLocalData('donations');
      return list.filter(d => Number(d.donorId) === Number(donorId));
    });
  },

  async createDonation(data) {
    return this.fetchWithFallback('/api/donations', {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      const list = getLocalData('donations');
      const newDonation = {
        id: Date.now(),
        ...data,
        status: data.status || 'PENDING',
        donationDate: data.donationDate || new Date().toISOString().split('T')[0]
      };
      list.unshift(newDonation);
      saveLocalData('donations', list);
      return newDonation;
    });
  },

  async updateDonationStatus(id, status, rejectionReason = '') {
    return this.fetchWithFallback(`/api/donations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason })
    }, () => {
      const list = getLocalData('donations');
      const item = list.find(d => Number(d.id) === Number(id));
      if (!item) throw new Error('Donation not found');
      const prevStatus = item.status;
      item.status = status;
      if (rejectionReason) item.rejectionReason = rejectionReason;
      saveLocalData('donations', list);

      // Auto-increment stock on COMPLETED
      if (status === 'COMPLETED' && prevStatus !== 'COMPLETED') {
        const stock = getLocalData('stock');
        const s = stock.find(st => st.bloodGroup === item.bloodGroup);
        if (s) {
          s.unitsAvailable += (item.units || 1);
          saveLocalData('stock', stock);
        }
      }
      return item;
    });
  },

  // Blood Request APIs
  async getRequests() {
    return this.fetchWithFallback('/api/requests', {}, () => getLocalData('requests'));
  },

  async getRequestsByPatient(patientId) {
    return this.fetchWithFallback(`/api/requests/patient/${patientId}`, {}, () => {
      const list = getLocalData('requests');
      return list.filter(r => Number(r.patientId) === Number(patientId));
    });
  },

  async createRequest(data) {
    return this.fetchWithFallback('/api/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    }, () => {
      const list = getLocalData('requests');
      const newReq = {
        id: Date.now(),
        ...data,
        status: 'PENDING',
        requestDate: new Date().toISOString().split('T')[0]
      };
      list.unshift(newReq);
      saveLocalData('requests', list);
      return newReq;
    });
  },

  async updateRequestStatus(id, status, rejectionReason = '') {
    return this.fetchWithFallback(`/api/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason })
    }, () => {
      const list = getLocalData('requests');
      const item = list.find(r => Number(r.id) === Number(id));
      if (!item) throw new Error('Request not found');
      item.status = status;
      if (rejectionReason) item.rejectionReason = rejectionReason;
      saveLocalData('requests', list);
      return item;
    });
  },

  async issueBlood(requestId, adminUsername = 'Chief Administrator', notes = '') {
    return this.fetchWithFallback(`/api/requests/${requestId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ adminUsername, notes })
    }, () => {
      const requests = getLocalData('requests');
      const req = requests.find(r => Number(r.id) === Number(requestId));
      if (!req) throw new Error('Request not found');

      // Deduct stock
      const stock = getLocalData('stock');
      const s = stock.find(st => st.bloodGroup === req.bloodGroup);
      if (!s || s.unitsAvailable < req.unitsRequested) {
        throw new Error(`Insufficient stock for ${req.bloodGroup}. Available: ${s ? s.unitsAvailable : 0}`);
      }
      s.unitsAvailable -= req.unitsRequested;
      saveLocalData('stock', stock);

      req.status = 'ISSUED';
      saveLocalData('requests', requests);

      // Create issue log
      const issues = getLocalData('issues');
      const newIssue = {
        id: Date.now(),
        requestId: req.id,
        bloodGroup: req.bloodGroup,
        unitsIssued: req.unitsRequested,
        issuedTo: req.patientName,
        hospitalName: req.hospitalName,
        issuedByAdmin: adminUsername,
        certificateNumber: 'ISS-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        issueDate: new Date().toLocaleString(),
        notes: notes || 'Blood issued safely under standard protocol.'
      };
      issues.unshift(newIssue);
      saveLocalData('issues', issues);
      return newIssue;
    });
  },

  // Issues & Dashboard APIs
  async getIssues() {
    return this.fetchWithFallback('/api/issues', {}, () => getLocalData('issues'));
  },

  async getDashboardStats() {
    return this.fetchWithFallback('/api/admin/dashboard', {}, () => {
      const users = getLocalData('users');
      const stock = getLocalData('stock');
      const donations = getLocalData('donations');
      const requests = getLocalData('requests');
      const issues = getLocalData('issues');

      const totalStock = stock.reduce((sum, s) => sum + Number(s.unitsAvailable), 0);
      const totalIssued = issues.reduce((sum, i) => sum + Number(i.unitsIssued), 0);

      const stockByGroup = {};
      stock.forEach(s => stockByGroup[s.bloodGroup] = s.unitsAvailable);

      return {
        totalDonors: users.filter(u => u.role === 'ROLE_DONOR').length,
        totalPatients: users.filter(u => u.role === 'ROLE_PATIENT').length,
        totalAvailableUnits: totalStock,
        totalDonationsCompleted: donations.filter(d => d.status === 'COMPLETED').length,
        pendingDonations: donations.filter(d => d.status === 'PENDING').length,
        totalRequests: requests.length,
        pendingRequests: requests.filter(r => r.status === 'PENDING').length,
        totalUnitsIssued: totalIssued,
        stockByGroup
      };
    });
  },

  async getAllUsers() {
    return this.fetchWithFallback('/api/admin/users', {}, () => getLocalData('users'));
  }
};

window.ApiClient = ApiClient;
