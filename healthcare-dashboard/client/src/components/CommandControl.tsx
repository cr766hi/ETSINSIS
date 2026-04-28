/**
 * CommandControl Component
 * Send commands to backend via WebSocket
 */

import { useState } from 'react';
import { useHealthcareStore } from '../store/healthcareStore';
import styles from './CommandControl.module.css';

interface SendVitalFormData {
  patient_id: string;
  heart_rate: string;
  temperature: string;
  spo2: string;
}

export const CommandControl: React.FC = () => {
  const [showSendVital, setShowSendVital] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [formData, setFormData] = useState<SendVitalFormData>({
    patient_id: '',
    heart_rate: '',
    temperature: '',
    spo2: '',
  });
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { patients, send } = useHealthcareStore();
  const patientsList = Array.from(patients.values()).map((p) => p.patient_id).sort();

  const handleSendVital = async () => {
    if (!formData.patient_id || !formData.heart_rate || !formData.temperature || !formData.spo2) {
      setResponse('❌ Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const vital = {
        patient_id: formData.patient_id,
        heart_rate: parseInt(formData.heart_rate),
        temperature: parseFloat(formData.temperature),
        spo2: parseInt(formData.spo2),
        timestamp: Date.now(),
      };

      send({
        type: 'send_vital',
        data: vital,
      });

      setResponse('📤 Vital sent to sensor service...');
      setFormData({
        patient_id: '',
        heart_rate: '',
        temperature: '',
        spo2: '',
      });
      setShowSendVital(false);

      setTimeout(() => setResponse(''), 3000);
    } catch (e) {
      setResponse(`❌ Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (patientId: string) => {
    send({
      type: 'subscribe_patient',
      patient_id: patientId,
    });
    setResponse(`🔗 Subscribing to ${patientId}...`);
    setTimeout(() => setResponse(''), 2000);
  };

  const handleUnsubscribe = (patientId: string) => {
    send({
      type: 'unsubscribe_patient',
      patient_id: patientId,
    });
    setResponse(`🔓 Unsubscribing from ${patientId}...`);
    setTimeout(() => setResponse(''), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Command & Control Bridge</h3>
        <p className={styles.subtitle}>Send commands to gRPC backend via WebSocket</p>
      </div>

      {response && <div className={styles.response}>{response}</div>}

      <div className={styles.section}>
        <h4>📤 Send Vital Data</h4>
        <p className={styles.description}>Send vital data directly to sensor service</p>

        {!showSendVital ? (
          <button className={styles.buttonPrimary} onClick={() => setShowSendVital(true)}>
            + Send Vital
          </button>
        ) : (
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label>Patient ID</label>
              <select
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              >
                <option value="">Select patient...</option>
                {patientsList.map((pid) => (
                  <option key={pid} value={pid}>
                    {pid}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Heart Rate (bpm)</label>
                <input
                  type="number"
                  min="40"
                  max="200"
                  placeholder="60-100"
                  value={formData.heart_rate}
                  onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  min="35"
                  max="41"
                  placeholder="36-37.5"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>SpO2 (%)</label>
                <input
                  type="number"
                  min="70"
                  max="100"
                  placeholder="95-100"
                  value={formData.spo2}
                  onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                className={styles.buttonSubmit}
                onClick={handleSendVital}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Vital'}
              </button>
              <button className={styles.buttonCancel} onClick={() => setShowSendVital(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h4>🔗 Subscribe/Unsubscribe Patient</h4>
        <p className={styles.description}>
          Control which patients' vital streams you want to monitor
        </p>

        <div className={styles.patientGrid}>
          {patientsList.length > 0 ? (
            patientsList.map((patientId) => (
              <div key={patientId} className={styles.patientCard}>
                <div className={styles.patientId}>{patientId}</div>
                <div className={styles.buttonGroup}>
                  <button
                    className={styles.buttonSubscribe}
                    onClick={() => handleSubscribe(patientId)}
                  >
                    Subscribe
                  </button>
                  <button
                    className={styles.buttonUnsubscribe}
                    onClick={() => handleUnsubscribe(patientId)}
                  >
                    Unsubscribe
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>No patients available</div>
          )}
        </div>
      </div>
    </div>
  );
};
