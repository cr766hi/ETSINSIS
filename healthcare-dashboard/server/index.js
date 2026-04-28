import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { initGrpcClients, monitoringClient, alertClient, sensorClient } from './grpc-client.js';

const WEBSOCKET_OPEN = 1;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

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
      const patients = response.patients || [];
      console.log(`[Init] ✅ Found ${patients.length} active patients`);
      
      patients.forEach(patient => {
        activePatients.set(patient.patient_id, {
          patient_id: patient.patient_id,
          latest_vital: patient.latest_vital || null,
          status: patient.status || 'ONLINE',
          last_seen: patient.last_seen ? parseInt(patient.last_seen) : Date.now()
        });
      });
      
      resolve(patients);
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

// Check for new patients periodically
function startPatientMonitoring() {
  setInterval(() => {
    monitoringClient.GetActivePatients({}, (err, response) => {
      if (err) {
        console.error('[Monitor] Error getting patients:', err.message);
        return;
      }
      const patients = response.patients || [];
      
      // Check for new patients
      patients.forEach(patient => {
        if (!activePatients.has(patient.patient_id)) {
          console.log(`[Monitor] 🆕 New patient detected: ${patient.patient_id}`);
          activePatients.set(patient.patient_id, {
            patient_id: patient.patient_id,
            latest_vital: patient.latest_vital || null,
            status: patient.status || 'ONLINE',
            last_seen: patient.last_seen ? parseInt(patient.last_seen) : Date.now()
          });
          subscribeToPatient(patient.patient_id);
          
          // Notify all connected clients about new patient
          broadcastMessage({
            type: 'new_patient',
            data: {
              patient_id: patient.patient_id,
              status: 'ONLINE'
            }
          });
        }
      });
    });
  }, 5000); // Check every 5 seconds
}

// Subscribe to single patient
function subscribeToPatient(patientId) {
  if (activeSubscriptions.has(patientId)) return;
  
  const stream = monitoringClient.SubscribePatient({ patient_id: patientId });
  activeSubscriptions.set(patientId, stream);
  
  stream.on('data', (vital) => {
    const patientData = activePatients.get(patientId);
    if (patientData) {
      // Format vital data before storing
      const formattedVital = {
        ...vital,
        temperature: parseFloat(vital.temperature.toFixed(1)),
        timestamp: parseInt(vital.timestamp) || Date.now()
      };
      patientData.latest_vital = formattedVital;
      patientData.last_seen = Date.now();
      
      // Evaluate alert status based on latest vital
      const { heart_rate, temperature, spo2 } = formattedVital;
      let alertLevel = "NORMAL";
      const issues = [];
      
      if (heart_rate > 120) { 
        alertLevel = "CRITICAL";
        issues.push(`HR ${heart_rate} bpm`);
      }
      if (spo2 < 90) { 
        alertLevel = "CRITICAL";
        issues.push(`SpO2 ${spo2}%`);
      }
      if (temperature > 38.0 && alertLevel !== "CRITICAL") { 
        alertLevel = "WARNING";
        issues.push(`Temp ${temperature.toFixed(1)}°C`);
      }
      
      patientData.alert_level = alertLevel;
      patientData.alert_message = issues.length > 0 ? issues.join("; ") : "Normal";
    }
    
    // Broadcast to all clients with formatted data
    broadcastMessage({
      type: 'vital_update',
      data: {
        ...vital,
        temperature: parseFloat(vital.temperature.toFixed(1)),
        timestamp: parseInt(vital.timestamp) || Date.now()
      }
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
  try {
    const stream = alertClient.StreamAlert({});
    
    stream.on('data', (alert) => {
      console.log(`[Alert] 📢 ${alert.level}: [${alert.patient_id}] ${alert.message}`);
      
      // Update patient status based on alert level
      const patient = activePatients.get(alert.patient_id);
      if (patient) {
        patient.alert_level = alert.level;
        patient.alert_message = alert.message;
        console.log(`[Alert] Updated ${alert.patient_id} status to ${alert.level}`);
      }
      
      // Broadcast alert to all WebSocket clients
      broadcastMessage({
        type: 'alert',
        data: alert
      });
    });
    
    stream.on('error', (err) => {
      console.error('[Alert Stream] Error:', err.message);
      // Reconnect after 5 seconds
      setTimeout(() => subscribeToAlerts(), 5000);
    });
    
    stream.on('end', () => {
      console.log('[Alert Stream] Stream ended, reconnecting...');
      setTimeout(() => subscribeToAlerts(), 5000);
    });
    
    console.log('[Alert] ✅ Alert stream subscribed');
  } catch (err) {
    console.error('[Alert Stream] Init Error:', err.message);
    setTimeout(() => subscribeToAlerts(), 5000);
  }
}

// Broadcast message to all connected clients
function broadcastMessage(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WEBSOCKET_OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (err) {
        console.error('[Broadcast] Error sending message:', err.message);
      }
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
  try {
    await getActivePatients();
    subscribeToAllPatients();
    await subscribeToAlerts();
    startPatientMonitoring();
  } catch (err) {
    console.error('[Init] Error during setup:', err.message);
  }
});

process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  activeSubscriptions.forEach(stream => stream.cancel?.());
  server.close();
  process.exit(0);
});
