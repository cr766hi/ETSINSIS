import { useEffect } from 'react';
import { useHealthcareStore } from './store';

const WS_URL = import.meta.env.DEV ? 'ws://localhost:3000' : 'ws://' + window.location.host;

export const useHealthcareWebSocket = () => {
  const store = useHealthcareStore();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        console.log('[WS] Connecting to', WS_URL);
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('[WS] ✅ Connected');
          store.setConnected(true);
          reconnectAttempts = 0;

          // Send ping every 30s
          const pingInterval = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            } else {
              clearInterval(pingInterval);
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'vital_update') {
              const vital = message.data;
              store.addVital(vital);
              store.addActivity({
                id: `vital-${Date.now()}`,
                type: 'vital_update',
                message: `${vital.patient_id} - HR: ${vital.heart_rate} | Temp: ${Number(vital.temperature).toFixed(1)}°C | SpO2: ${vital.spo2}%`,
                timestamp: vital.timestamp,
              });
            } else if (message.type === 'alert') {
              const alert = message.data;
              store.addAlert(alert);
              store.addActivity({
                id: `alert-${Date.now()}`,
                type: `alert_${alert.level.toLowerCase()}`,
                message: `[${alert.level}] ${alert.patient_id}: ${alert.message}`,
                timestamp: alert.timestamp || Date.now(),
              });
            } else if (message.type === 'initial_state') {
              const patients = message.data.patients || [];
              patients.forEach((p: any) => {
                store.addPatient(p);
              });
              console.log('[WS] 📥 Received initial state:', patients.length, 'patients');
            } else if (message.type === 'patients_list') {
              const patients = message.data || [];
              patients.forEach((p: any) => {
                store.updatePatient(p);
              });
            } else if (message.type === 'patient_status') {
              const patient = message.data;
              store.updatePatient(patient);
            } else if (message.type === 'pong') {
              console.log('[WS] 🏓 Pong received');
            } else if (message.type === 'control_response') {
              console.log('[WS] Control response:', message.status, message.message);
            }
          } catch (e) {
            console.error('[WS] Message parse error:', e);
          }
        };

        ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          store.setConnected(false);
        };

        ws.onclose = () => {
          console.log('[WS] ❌ Disconnected');
          store.setConnected(false);

          // Reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`[WS] Reconnecting in ${delay}ms...`);
            reconnectTimeout = setTimeout(connect, delay);
            reconnectAttempts++;
          } else {
            console.error('[WS] Max reconnection attempts reached');
          }
        };
      } catch (error) {
        console.error('[WS] Connection error:', error);
        store.setConnected(false);
      }
    };

    // Set send function
    store.setSend((command) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(command));
      } else {
        console.warn('[WS] WebSocket not open, cannot send command');
      }
    });

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [store]);

  return {
    isConnected: store.isConnected,
    send: store.send,
  };
};
