# 🏥 Healthcare Monitoring System (ETSINSIS)

A real-time healthcare patient monitoring system built with gRPC, WebSocket, and React. Monitors vital signs (Heart Rate, Temperature, SpO2) for multiple patients and provides real-time alert notifications.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Running the System](#running-the-system)
- [Services Description](#services-description)
- [API Documentation](#api-documentation)
- [Dashboard Features](#dashboard-features)
- [Contributing](#contributing)

## 🎯 Overview

ETSINSIS is a comprehensive healthcare monitoring platform that:

- **Real-time Monitoring**: Tracks vital signs for multiple patients simultaneously
- **Alert System**: Automatic detection of critical and warning conditions
- **WebSocket Dashboard**: Live patient status updates with instant notifications
- **gRPC Backend**: High-performance inter-service communication
- **Multi-patient Support**: Scalable architecture for handling multiple patient streams

### Key Features

✅ Multi-patient vital monitoring (HR, Temperature, SpO2)  
✅ Real-time alert notifications (CRITICAL 🔴 / WARNING 🟡 / NORMAL 🟢)  
✅ Patient status dashboard with live updates  
✅ WebSocket-based communication for instant updates  
✅ gRPC services for backend communication  
✅ Patient data persistence with SQLite  
✅ Responsive React frontend  

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Healthcare Monitoring System                  │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
    ┌───▼────────┐          ┌────▼─────┐          ┌────────▼───┐
    │  Simulator  │          │ Dashboard │          │ Healthcare │
    │  (Generator)│          │  Frontend │          │  Services  │
    └───┬────────┘          └────┬─────┘          └────────┬───┘
        │                         │                         │
        │ gRPC                    │ WebSocket              │ gRPC
        │                         │                         │
    ┌───▼─────────────────────────▼─────────────────────────▼───┐
    │                  Dashboard Server (Node.js)                 │
    │  - WebSocket Bridge                                        │
    │  - Patient Management                                      │
    │  - Alert Distribution                                      │
    └───┬─────────────────────────────────────────────────────┬──┘
        │                                                       │
        │ gRPC                                                  │ gRPC
        │                                                       │
    ┌───▼──────────────────┐  ┌──────────────────────┐  ┌─────▼──────┐
    │ Sensor Service       │  │ Monitoring Service   │  │ Alert      │
    │ (Port 50051)         │  │ (Port 50052)         │  │ Service    │
    │                      │  │                      │  │ (50053)    │
    │ - Receives vitals    │  │ - Stores state       │  │            │
    │ - Forwards data      │  │ - Provides patient   │  │ - Evaluates│
    │                      │  │   subscriptions      │  │   vitals   │
    └───────────────────┬──┘  └────────────────────┬─┘  └──────┬────┘
                        │                          │            │
                        └──────────────────────────┼────────────┘
                                                   │
                                            ┌──────▼──────┐
                                            │  SQLite DB  │
                                            │ healthcare. │
                                            │     db      │
                                            └─────────────┘
```

## 💻 Tech Stack

### Backend Services
- **Node.js** - Runtime environment
- **gRPC** - Inter-service communication
- **Protocol Buffers** - Service definitions
- **Express.js** - HTTP server & WebSocket bridge
- **SQLite** - Patient data persistence

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Zustand** - State management
- **CSS Modules** - Component styling

### Communication
- **gRPC** - Service-to-service (efficient, binary)
- **WebSocket** - Real-time client updates (low latency)

## 📁 Project Structure

```
ETSINSIS/
├── alert_service/              # Alert evaluation service
│   ├── index.js
│   └── package.json
│
├── healthcare-dashboard/        # Dashboard application
│   ├── client/                 # React frontend
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── App.module.css
│   │   │   ├── store.ts        # Zustand state management
│   │   │   ├── useHealthcareWebSocket.ts
│   │   │   └── components/
│   │   │       ├── CommandControl.tsx
│   │   │       └── PatientStatus.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── server/                 # Node.js backend
│       ├── index.js            # WebSocket bridge
│       ├── grpc-client.js      # gRPC client initialization
│       └── package.json
│
├── monitoring_service/          # Patient state management
│   ├── index.js
│   ├── db.js                   # SQLite operations
│   ├── healthcare.db
│   └── package.json
│
├── sensor_service/              # Vital stream receiver
│   ├── index.js
│   └── package.json
│
├── simulator/                   # Patient data simulator
│   ├── index.js                # Multi-patient demo
│   ├── multi.js                # Flexible multi-patient
│   └── package.json
│
├── proto/                       # gRPC service definitions
│   └── healthcare.proto
│
├── start-all.js                # Start all services
├── package.json
├── .gitignore
└── README.md
```

## 🚀 Installation

### Prerequisites
- **Node.js** 22.x or higher
- **npm** 10.x or higher
- **Git**

### Clone & Setup

```bash
# Clone repository
git clone https://github.com/cr766hi/ETSINSIS.git
cd ETSINSIS

# Install root dependencies
npm install

# Install service dependencies
cd alert_service && npm install && cd ..
cd monitoring_service && npm install && npm rebuild && cd ..
cd sensor_service && npm install && cd ..
cd simulator && npm install && cd ..
cd healthcare-dashboard/server && npm install && cd ../..
cd healthcare-dashboard/client && npm install && cd ../..
```

## 🎬 Running the System

### Option 1: Run All Services at Once

```bash
npm start
```

This starts all services in parallel:
- Alert Service (port 50053)
- Monitoring Service (port 50052)
- Sensor Service (port 50051)
- Dashboard Server (port 3000)
- Dashboard Client (port 3000, dev server)
- Simulator

### Option 2: Run Services Individually

**Terminal 1 - Alert Service**
```bash
cd alert_service
node index.js
```
Expected: `[AlertService] ✅ Berjalan di port 50053`

**Terminal 2 - Monitoring Service**
```bash
cd monitoring_service
node index.js
```
Expected: `[MonitoringService] ✅ Berjalan di port 50052`

**Terminal 3 - Sensor Service**
```bash
cd sensor_service
node index.js
```
Expected: `[SensorService] ✅ Berjalan di port 50051`

**Terminal 4 - Dashboard Server**
```bash
cd healthcare-dashboard/server
node index.js
```
Expected: `✅ Server running at http://localhost:3000`

**Terminal 5 - Dashboard Client (Dev)**
```bash
cd healthcare-dashboard/client
npm run dev
```
Expected: `Local: http://localhost:5173/`

**Terminal 6 - Simulator**
```bash
cd simulator
node index.js
```
Expected: 
```
3 patient data:
- P-BVCY (NORMAL)
- P-ALXM (WARNING)
- P-TJKZ (CRITICAL)
```

### Accessing the Dashboard

Open browser and navigate to: **http://localhost:3000**

## 🔧 Services Description

### 1. **Sensor Service** (Port 50051)
Receives vital data streams from simulators and forwards to monitoring/alert services.

**gRPC Methods:**
- `SendVitalStream(stream VitalData) → Ack` - Receive streaming vital data

### 2. **Monitoring Service** (Port 50052)
Maintains patient state and provides subscription streams for live updates.

**gRPC Methods:**
- `GetActivePatients() → PatientListResponse`
- `GetPatientStatus(patient_id) → PatientStatus`
- `SubscribePatient(patient_id) → stream VitalData`
- `UpdatePatientData(vital) → Ack`

### 3. **Alert Service** (Port 50053)
Evaluates vital data against thresholds and broadcasts alerts.

**gRPC Methods:**
- `CheckAlert(vital) → Alert`
- `StreamAlert() → stream Alert`

**Alert Rules:**
- 🔴 **CRITICAL**: HR > 120 bpm OR SpO2 < 90%
- 🟡 **WARNING**: Temperature > 38.0°C
- 🟢 **NORMAL**: All vitals within range

### 4. **Dashboard Server** (Port 3000)
WebSocket bridge connecting frontend to gRPC services.

**Features:**
- Real-time vital updates via WebSocket
- Alert broadcasting to connected clients
- Patient subscription management
- Command control (send vitals, subscribe/unsubscribe)

### 5. **Simulator**
Generates synthetic vital data for demo/testing.

**Modes:**
- `normal` - Healthy vital signs
- `warning` - High temperature (38-39.5°C)
- `critical` - High heart rate (121-160) OR Low SpO2 (80-89%)

**Run with custom settings:**
```bash
# Single patient
node index.js --patient=P-DEMO --mode=critical --interval=3000

# Multi-patient (default)
node index.js

# Multi-patient with custom
node multi.js --count=5 --interval=2000
```

## 📊 API Documentation

### WebSocket Messages

**Client → Server:**
```json
// Request patient list
{"type": "get_patients"}

// Get specific patient
{"type": "get_patient_status", "patient_id": "P-BVCY"}

// Send vital data
{"type": "send_vital", "data": {"patient_id": "P-BVCY", "heart_rate": 75, "temperature": 36.5, "spo2": 98}}

// Subscribe to patient
{"type": "subscribe_patient", "patient_id": "P-BVCY"}

// Unsubscribe from patient
{"type": "unsubscribe_patient", "patient_id": "P-BVCY"}

// Keep-alive ping
{"type": "ping"}
```

**Server → Client:**
```json
// Initial state on connect
{"type": "initial_state", "data": {"patients": [...], "timestamp": 1234567890}}

// Vital update
{"type": "vital_update", "data": {"patient_id": "P-BVCY", "heart_rate": 75, "temperature": 36.5, "spo2": 98}}

// Alert notification
{"type": "alert", "data": {"patient_id": "P-BVCY", "level": "CRITICAL", "message": "Heart rate tinggi: 145 bpm"}}

// Control response
{"type": "control_response", "status": "success", "message": "..."}

// Pong response
{"type": "pong", "timestamp": 1234567890}
```

## 🎨 Dashboard Features

### Patient Status Cards
- Real-time vital signs display (HR, Temperature, SpO2)
- Live patient status (ONLINE/OFFLINE)
- Alert level indicator (🔴/🟡/🟢)
- Last update timestamp

### Alert Notifications
- Top banner alert with patient ID
- Color-coded by severity (red/orange/green)
- Real-time message updates
- Auto-dismiss after condition resolves

### Command Control
- Send manual vital data
- Subscribe/unsubscribe to patient streams
- View all connected patients

## 🔄 Data Flow

```
Simulator
    ↓ (gRPC: VitalData stream)
Sensor Service
    ├→ Monitoring Service (updates state)
    └→ Alert Service (evaluates rules)
            ↓ (broadcasts alerts)
    Dashboard Server
            ↓ (WebSocket)
    Dashboard Frontend
            ↓ (displays)
    Browser UI
```

## 📈 Alert Flow

```
Vital Data
    ↓
Alert Service → Evaluates against rules
    ↓
Alert generated (CRITICAL/WARNING/NORMAL)
    ↓
Broadcast to all subscribers
    ↓
Dashboard Server receives alert
    ↓
Forward to WebSocket clients
    ↓
Frontend displays notification
```

## 🐛 Troubleshooting

### Service won't start
```bash
# Check if ports are in use
netstat -ano | findstr :50051  # Sensor Service
netstat -ano | findstr :50052  # Monitoring Service
netstat -ano | findstr :50053  # Alert Service
netstat -ano | findstr :3000   # Dashboard Server

# Kill process if needed
taskkill /PID <PID> /F
```

### Patients not appearing in dashboard
1. Ensure simulator is running: `cd simulator && node index.js`
2. Check sensor service is receiving vitals
3. Check monitoring service has active patients: `GetActivePatients()`

### Alerts not showing
1. Verify alert service is running
2. Check threshold values in `alert_service/index.js`
3. Ensure WebSocket connection is active (check browser console)

### Build issues
```bash
# Rebuild native modules
cd monitoring_service && npm rebuild && cd ..

# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📝 Development Notes

### Adding New Alert Rules

Edit `alert_service/index.js`:
```javascript
const RULES = { 
  HEART_RATE_CRITICAL: 120,  // Change threshold
  SPO2_CRITICAL: 90,
  TEMP_WARNING: 38.0
};
```

### Modifying Patient IDs

Edit `simulator/index.js`:
```javascript
const patientIds = ["P-CUSTOM1", "P-CUSTOM2", "P-CUSTOM3"];
```

### Custom Database Operations

Edit `monitoring_service/db.js` to add/modify database queries.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is part of ETS 2024 Semester 4 coursework.

## 👥 Author

- **Developer**: Aditya
- **Repository**: [cr766hi/ETSINSIS](https://github.com/cr766hi/ETSINSIS)

## 🔗 Related Files

- [Healthcare Protocol Buffers](./proto/healthcare.proto)
- [Alert Service](./alert_service/index.js)
- [Monitoring Service](./monitoring_service/index.js)
- [Sensor Service](./sensor_service/index.js)
- [Dashboard Frontend](./healthcare-dashboard/client/src/)
- [Dashboard Server](./healthcare-dashboard/server/index.js)

---

**Last Updated**: April 28, 2026  
**Status**: Active Development ✅
