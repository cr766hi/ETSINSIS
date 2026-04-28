import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import { createServer } from 'http';
import { initGrpcClients, monitoringClient, alertClient, sensorClient } from './grpc-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// Serve static files
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize gRPC clients
console.log('Initializing gRPC clients...');
await initGrpcClients();

// Store active patient data
let activePatients = new Map();
let activeSubscriptions = new Map();

// Get active patients on startup
async function getActivePatients() {
  return new Promise((resolve) => {
    monitoringClient.GetActivePatients({}, (err, response) => {
      if (err) {
        console.error('[Init] Error getting patients:', err.message);
        resolve([]);
        return;
      }
      const patientIds = response.patient_ids || [];
      console.log(`[Init] ✅ Found ${patientIds.length} active patients`);
      
      patientIds.forEach(pid => {
        activePatients.set(pid, {
          patient_id: pid,
          latest_vital: null,
          status: 'ONLINE',
          last_seen: Date.now()
        });
      });
      
      resolve(patientIds);
    });
  });
}

// Subscribe to all patients' vital streams
async function subscribeToAllPatients() {
  const patients = Array.from(activePatients.keys());
  
  patients.forEach(patientId => {
    subscribeToPatient(patientId);
  });
}

// Subscribe to single patient
function subscribeToPatient(patientId) {
  if (activeSubscriptions.has(patientId)) return;
  
  const stream = monitoringClient.SubscribePatient({ patient_id: patientId });
  activeSubscriptions.set(patientId, stream);
  
  stream.on('data', (vital) => {
    const patientData = activePatients.get(patientId);
    if (patientData) {
      patientData.latest_vital = vital;
      patientData.last_seen = Date.now();
    }
    
    // Broadcast to all clients
    broadcastMessage({
      type: 'vital_update',
      data: vital
    });
  });
  
  stream.on('error', (err) => {
    console.error(`[Stream] Error for ${patientId}:`, err.message);
    activeSubscriptions.delete(patientId);
  });
  
  stream.on('end', () => {
    console.log(`[Stream] 📴 Unsubscribed from ${patientId}`);
    activeSubscriptions.delete(patientId);
  });
  
  console.log(`[Stream] 📡 Subscribed to ${patientId}`);
}

// Subscribe to alerts
async function subscribeToAlerts() {
  const stream = alertClient.StreamAlert({});
  
  stream.on('data', (alert) => {
    console.log(`[Alert] ${alert.level}: ${alert.message}`);
    broadcastMessage({
      type: 'alert',
      data: alert
    });
  });
  
  stream.on('error', (err) => {
    console.error('[Alert Stream] Error:', err.message);
  });
}

// Broadcast message to all connected clients
function broadcastMessage(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log(`[WS] New client connected (Total: ${wss.clients.size})`);
  
  // Send initial state
  const initialState = {
    type: 'initial_state',
    data: {
      patients: Array.from(activePatients.values()),
      timestamp: Date.now()
    }
  };
  ws.send(JSON.stringify(initialState));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const cmd = JSON.parse(message);
      
      if (cmd.type === 'get_patients') {
        ws.send(JSON.stringify({
          type: 'patients_list',
          data: Array.from(activePatients.values())
        }));
      } else if (cmd.type === 'get_patient_status' && cmd.patient_id) {
        const patient = activePatients.get(cmd.patient_id);
        if (patient) {
          ws.send(JSON.stringify({
            type: 'patient_status',
            data: patient
          }));
        }
      } else if (cmd.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      } else if (cmd.type === 'send_vital') {
        // Browser send vital data to sensor service
        const vital = cmd.data;
        console.log(`[Control] 📤 Received vital from browser:`, vital);
        
        sensorClient.SendVitalStream((err, response) => {
          if (err) {
            console.error('[Control] Error sending vital:', err.message);
            ws.send(JSON.stringify({
              type: 'control_response',
              status: 'error',
              message: `Failed to send vital: ${err.message}`
            }));
            return;
          }
          console.log('[Control] ✅ Vital sent to sensor service');
          ws.send(JSON.stringify({
            type: 'control_response',
            status: 'success',
            message: 'Vital data sent successfully'
          }));
        });
        
        // Send individual vital
        const call = sensorClient.SendVitalStream((err) => {
          if (err) console.error('[Control] SendVitalStream error:', err.message);
        });
        call.write(vital);
        call.end();
        
      } else if (cmd.type === 'subscribe_patient') {
        // Browser request subscribe specific patient
        const patientId = cmd.patient_id;
        if (!patientId) {
          ws.send(JSON.stringify({
            type: 'control_response',
            status: 'error',
            message: 'patient_id required'
          }));
          return;
        }
        
        if (!activeSubscriptions.has(patientId)) {
          subscribeToPatient(patientId);
          console.log(`[Control] 🔗 Subscribed to ${patientId} from browser request`);
          ws.send(JSON.stringify({
            type: 'control_response',
            status: 'success',
            message: `Subscribed to ${patientId}`
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'control_response',
            status: 'info',
            message: `Already subscribed to ${patientId}`
          }));
        }
        
      } else if (cmd.type === 'unsubscribe_patient') {
        // Browser request unsubscribe patient
        const patientId = cmd.patient_id;
        if (!patientId) {
          ws.send(JSON.stringify({
            type: 'control_response',
            status: 'error',
            message: 'patient_id required'
          }));
          return;
        }
        
        if (activeSubscriptions.has(patientId)) {
          const stream = activeSubscriptions.get(patientId);
          stream.cancel?.();
          activeSubscriptions.delete(patientId);
          console.log(`[Control] 🔓 Unsubscribed from ${patientId}`);
          ws.send(JSON.stringify({
            type: 'control_response',
            status: 'success',
            message: `Unsubscribed from ${patientId}`
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'control_response',
            status: 'info',
            message: `Not subscribed to ${patientId}`
          }));
        }
      }
    } catch (e) {
      console.error('[WS] Parse error:', e.message);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`[WS] Client disconnected (Total: ${wss.clients.size})`);
  });
  
  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
server.listen(PORT, async () => {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Healthcare Dashboard WebSocket Bridge        ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ WebSocket: ws://localhost:${PORT}\n`);
  console.log('Connecting to gRPC services:');
  console.log('  - Monitoring: localhost:50052');
  console.log('  - Alert: localhost:50053\n');
  
  // Initialize patients and subscriptions
  await getActivePatients();
  subscribeToAllPatients();
  subscribeToAlerts();
});

process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  activeSubscriptions.forEach(stream => stream.cancel?.());
  server.close();
  process.exit(0);
});
