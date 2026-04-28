import { useHealthcareWebSocket } from './useHealthcareWebSocket';
import { CommandControl } from './components/CommandControl';
import { PatientStatus } from './components/PatientStatus';
import { useHealthcareStore } from './store';
import styles from './App.module.css';

function App() {
  const { isConnected } = useHealthcareWebSocket();
  const { alerts } = useHealthcareStore();
  
  // Get latest alert
  const latestAlert = alerts.length > 0 ? alerts[alerts.length - 1] : null;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1>Healthcare Monitoring Dashboard</h1>
            <p className={styles.subtitle}>Real-time patient vital monitoring system</p>
          </div>
          <div className={styles.status}>
            <span className={`${styles.statusIndicator} ${isConnected ? styles.connected : ''}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </header>

      {/* Alert Notification */}
      {latestAlert && (
        <div className={`${styles.alertBanner} ${styles[`alert_${latestAlert.level.toLowerCase()}`]}`}>
          <div className={styles.alertContent}>
            <span className={styles.alertIcon}>
              {latestAlert.level === 'CRITICAL' ? '🔴' : latestAlert.level === 'WARNING' ? '🟡' : '🟢'}
            </span>
            <div className={styles.alertText}>
              <div className={styles.alertTitle}>
                <strong className={styles.patientId}>{latestAlert.patient_id}</strong>
                <strong className={styles.alertLevel}>[{latestAlert.level}]</strong>
              </div>
              <p>{latestAlert.message}</p>
            </div>
          </div>
        </div>
      )}

      <main className={styles.main}>
        <PatientStatus />
        <CommandControl />
      </main>

      <footer className={styles.footer}>
        <p>Smart Healthcare Monitoring System | gRPC + WebSocket Integration</p>
      </footer>
    </div>
  );
}

export default App;
