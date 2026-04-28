import { create } from 'zustand';

export interface Patient {
  patient_id: string;
  latest_vital: any;
  status: string;
  last_seen: number;
}

export interface Vital {
  patient_id: string;
  heart_rate: number;
  temperature: number;
  spo2: number;
  timestamp: number;
}

export interface Alert {
  patient_id: string;
  level: string;
  message: string;
  timestamp: number;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: number;
}

interface HealthcareStore {
  patients: Map<string, Patient>;
  vitals: Vital[];
  alerts: Alert[];
  activity: Activity[];
  isConnected: boolean;
  connectedClients: number;
  send: (command: any) => void;

  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  addVital: (vital: Vital) => void;
  addAlert: (alert: Alert) => void;
  addActivity: (activity: Activity) => void;
  setConnected: (connected: boolean) => void;
  setSend: (sendFn: (command: any) => void) => void;
  getPatientVitals: (patientId: string) => Vital[];
  getPatientAlerts: (patientId: string) => Alert[];
}

export const useHealthcareStore = create<HealthcareStore>((set, get) => ({
  patients: new Map(),
  vitals: [],
  alerts: [],
  activity: [],
  isConnected: false,
  connectedClients: 0,
  send: () => {}, // Will be set by hook

  addPatient: (patient) => {
    set((state) => {
      const newPatients = new Map(state.patients);
      newPatients.set(patient.patient_id, patient);
      return { patients: newPatients };
    });
  },

  updatePatient: (patient) => {
    set((state) => {
      const newPatients = new Map(state.patients);
      const existing = newPatients.get(patient.patient_id);
      newPatients.set(patient.patient_id, {
        ...existing,
        ...patient,
      });
      return { patients: newPatients };
    });
  },

  addVital: (vital) => {
    set((state) => {
      const newVitals = [...state.vitals, vital];
      // Keep only last 500
      return { vitals: newVitals.slice(-500) };
    });
  },

  addAlert: (alert) => {
    set((state) => {
      const newAlerts = [...state.alerts, alert];
      // Keep only last 100
      return { alerts: newAlerts.slice(-100) };
    });
  },

  addActivity: (activity) => {
    set((state) => {
      const newActivity = [activity, ...state.activity];
      // Keep only last 50
      return { activity: newActivity.slice(0, 50) };
    });
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  setSend: (sendFn) => {
    set({ send: sendFn });
  },

  getPatientVitals: (patientId) => {
    const state = get();
    return state.vitals.filter((v) => v.patient_id === patientId);
  },

  getPatientAlerts: (patientId) => {
    const state = get();
    return state.alerts.filter((a) => a.patient_id === patientId);
  },
}));
