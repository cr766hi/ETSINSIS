const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const db = require("./db");

const PROTO_PATH = path.join(__dirname, "../proto/healthcare.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).healthcare;

const patients_map = new Map();
const subscribers_map = new Map();
const OFFLINE_MS = 30000;

function isOnline(state) { return state && Date.now() - state.last_seen < OFFLINE_MS; }

function updatePatientState(v) {
  patients_map.set(v.patient_id, { latest_vital: v, last_seen: Date.now() });
  const subs = subscribers_map.get(v.patient_id);
  if (subs) for (const stream of subs) { try { stream.write(v); } catch { subs.delete(stream); } }
}

async function UpdatePatientData(call, callback) {
  const v = call.request;
  if (!v.patient_id) return callback({ code: grpc.status.INVALID_ARGUMENT, message: "patient_id kosong" });
  updatePatientState(v);
  db.insertVital(v).catch(() => {});
  console.log(`[MonitoringService] Update → ${v.patient_id} | HR=${v.heart_rate} | Temp=${v.temperature.toFixed(1)} | SpO2=${v.spo2}`);
  callback(null, { success: true, message: "OK" });
}

function GetPatientStatus(call, callback) {
  const { patient_id } = call.request;
  if (!patient_id) return callback({ code: grpc.status.INVALID_ARGUMENT, message: "patient_id kosong" });
  const state = patients_map.get(patient_id);
  if (!state) return callback({ code: grpc.status.NOT_FOUND, message: `Pasien '${patient_id}' tidak ditemukan` });
  callback(null, { patient_id, latest_vital: state.latest_vital, status: isOnline(state) ? "ONLINE" : "OFFLINE", last_seen: state.last_seen.toString() });
}

function GetActivePatients(call, callback) {
  const patients = [];
  for (const [pid, state] of patients_map.entries()) {
    if (isOnline(state)) patients.push({ patient_id: pid, latest_vital: state.latest_vital, status: "ONLINE", last_seen: state.last_seen.toString() });
  }
  console.log(`[MonitoringService] GetActivePatients → ${patients.length} pasien aktif`);
  callback(null, { patients });
}

function SubscribePatient(call) {
  const { patient_id } = call.request;
  if (!patient_id) { call.destroy({ code: grpc.status.INVALID_ARGUMENT, message: "patient_id kosong" }); return; }
  const state = patients_map.get(patient_id);
  if (state) try { call.write(state.latest_vital); } catch {}
  if (!subscribers_map.has(patient_id)) subscribers_map.set(patient_id, new Set());
  subscribers_map.get(patient_id).add(call);
  console.log(`[MonitoringService] Subscriber baru → ${patient_id}`);
  const cleanup = () => {
    const subs = subscribers_map.get(patient_id);
    if (subs) { subs.delete(call); if (subs.size === 0) subscribers_map.delete(patient_id); }
  };
  call.on("cancelled", cleanup);
  call.on("error", cleanup);
}

async function startServer() {
  const dbOk = await db.initDB();
  if (!dbOk) console.warn("[MonitoringService] ⚠️  Jalan tanpa MySQL");
  const server = new grpc.Server();
  server.addService(proto.MonitoringService.service, { UpdatePatientData, GetPatientStatus, GetActivePatients, SubscribePatient });
  server.bindAsync("0.0.0.0:50052", grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) { console.error("Gagal start:", err.message); process.exit(1); }
    console.log(`[MonitoringService] ✅ Berjalan di port ${port}`);
  });
  process.on("SIGINT", () => { server.tryShutdown(() => process.exit(0)); });
}

startServer();