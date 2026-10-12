# PulseLife — Frontend Web Application

Modern, responsive web interface for the **Blood Bank Management System**.

## 📁 Folder Structure
```
frontend/
├── css/
│   └── styles.css          # Glassmorphism dark UI design system
├── js/
│   ├── api.js              # REST API client connected to backend (http://localhost:8080)
│   └── app.js              # State management, role routing, modal dialogs, and actions
├── index.html              # Single Page Application (Landing, Donor, Patient, Admin)
├── server.js               # Lightweight Node.js preview server
├── package.json            # npm metadata
└── run-frontend.bat        # 1-click launcher
```

## 🚀 How to Run the Frontend
Double-click `run-frontend.bat` or run in terminal:
```bash
node server.js
```
Open **`http://localhost:3000`** in your browser.

## 🌟 Key Features
- **Public Portal**: Live blood inventory cards for all 8 blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-), impact counters, and interactive compatibility matrix.
- **Donor Portal**: Digital Donor Card, appointment scheduling, donation history, and saved lives impact.
- **Patient & Hospital Requisition Desk**: Urgent blood requests with urgency priorities (Normal, Urgent, Critical) and real-time status tracker.
- **Admin Dashboard**: Live stock inventory management (`+1`, `-1`, custom units), request approvals, and digital blood issue certificate voucher generation.
