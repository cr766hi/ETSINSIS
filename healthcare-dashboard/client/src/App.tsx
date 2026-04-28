import { useHealthcareWebSocket } from './useHealthcareWebSocket';
import { CommandControl } from './components/CommandControl';
import styles from './App.module.css';

function App() {
  const { isConnected } = useHealthcareWebSocket();

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

      <main className={styles.main}>
        <CommandControl />
      </main>

      <footer className={styles.footer}>
        <p>Smart Healthcare Monitoring System | gRPC + WebSocket Integration</p>
      </footer>
    </div>
  );
}

export default App;
