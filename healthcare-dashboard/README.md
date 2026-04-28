# Healthcare Dashboard - Frontend

Real-time Smart Healthcare Monitoring Dashboard built with React + TypeScript + WebSocket.

## Struktur Folder

```
healthcare-dashboard/
├── client/          # React frontend (Vite + TypeScript)
├── server/          # WebSocket bridge server (Express)
└── README.md        # This file
```

## Setup

### Prerequisites
- Node.js v22+
- Backend services running (Alert, Monitoring, Sensor)

### Install Dependencies

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### Environment Variables

No .env needed - default configuration connects to:
- Monitoring Service: `localhost:50052`
- Alert Service: `localhost:50053`
- Backend gRPC Proto: `../../ETSINSIS/proto/healthcare.proto`

### Development

Terminal 1 - Start backend services:
```bash
cd ETSINSIS
npm run start:all  # atau start individual services
```

Terminal 2 - Start WebSocket server:
```bash
cd healthcare-dashboard/server
npm start          # Runs on port 3000
```

Terminal 3 - Start frontend dev server:
```bash
cd healthcare-dashboard/client
npm run dev        # Runs on port 5173, proxies to 3000
```

### Production Build

```bash
cd healthcare-dashboard/client
npm run build      # Generates dist/ folder
```

Then server will serve the production build:
```bash
cd healthcare-dashboard/server
npm start          # Serves dist/ on port 3000
```

## Features

- Real-time vital trends visualization (Canvas API)
- Patient status cards with live updates
- Activity log with color-coded events
- Alert notifications (toast)
- WebSocket bi-directional communication
- Per-patient vital data filtering
- Apple HIG design system with dark mode

## Architecture

- Frontend: React 18 + TypeScript + Zustand (state) + CSS Modules
- Server: Express + WebSocket (ws library)
- Communication: WebSocket to browser, gRPC to backend services
- Styling: CSS Modules + global design tokens

## Integration with Backend

The WebSocket server bridges gRPC services to browser clients:
1. Frontend connects via WebSocket
2. Server connects to gRPC services
3. Server broadcasts vital updates and alerts
4. Frontend subscribes to specific patients

Message types:
- `vital_update`: Patient vital data
- `alert`: Critical/warning alerts
- `initial_state`: Current patients list
- `patients_list`: Active patients
- `patient_status`: Individual patient status
