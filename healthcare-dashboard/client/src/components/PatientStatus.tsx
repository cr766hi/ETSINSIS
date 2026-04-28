import { useHealthcareStore } from '../store';
import styles from './PatientStatus.module.css';

export const PatientStatus: React.FC = () => {
  const { patients, alerts } = useHealthcareStore();
  const patientsList = Array.from(patients.values()).sort((a, b) => 
    a.patient_id.localeCompare(b.patient_id)
  );

  const getAlertLevel = (patientId: string) => {
    // Get latest alert for this patient
    const patientAlerts = Array.from(alerts).filter(a => a.patient_id === patientId);
    if (patientAlerts.length === 0) return 'NORMAL';
    return patientAlerts[patientAlerts.length - 1].level;
  };

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'CRITICAL': return '🔴';
      case 'WARNING': return '🟡';
      default: return '🟢';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Patient Status</h2>
        <span className={styles.count}>{patientsList.length} Patients</span>
      </div>

      <div className={styles.grid}>
        {patientsList.map((patient) => {
          const alertLevel = getAlertLevel(patient.patient_id);
          const vital = patient.latest_vital;
          const isOnline = patient.status === 'ONLINE';

          return (
            <div key={patient.patient_id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{patient.patient_id}</h3>
                <span className={styles.status}>
                  <span 
                    className={styles.indicator}
                    style={{ backgroundColor: isOnline ? '#10b981' : '#6b7280' }}
                  ></span>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              <div className={styles.alertLevel}>
                <span className={styles.icon}>{getStatusIcon(alertLevel)}</span>
                <span 
                  className={styles.level}
                  style={{ color: getStatusColor(alertLevel) }}
                >
                  {alertLevel}
                </span>
              </div>

              {vital ? (
                <div className={styles.vitals}>
                  <div className={styles.vitalRow}>
                    <span className={styles.label}>HR</span>
                    <span className={styles.label}>TEMP</span>
                    <span className={styles.label}>SPO2</span>
                  </div>
                  <div className={styles.vitalRow}>
                    <span className={styles.value}>{vital.heart_rate}</span>
                    <span className={styles.value}>{Number(vital.temperature).toFixed(1)}°C</span>
                    <span className={styles.value}>{vital.spo2}%</span>
                  </div>
                </div>
              ) : (
                <div className={styles.noData}>Waiting for data...</div>
              )}

              <div className={styles.timestamp}>
                {vital?.timestamp 
                  ? new Date(parseInt(vital.timestamp) || Date.now()).toLocaleTimeString()
                  : 'No data'
                }
              </div>
            </div>
          );
        })}
      </div>

      {patientsList.length === 0 && (
        <div className={styles.empty}>
          <p>No patients connected yet</p>
          <p className={styles.hint}>Start the simulator to see patient data</p>
        </div>
      )}
    </div>
  );
};
