const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../proto/healthcare.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).healthcare;

const RULES = { HEART_RATE_CRITICAL: 120, SPO2_CRITICAL: 90, TEMP_WARNING: 38.0 };

function evaluateVital(vitalData) {
  const { patient_id, heart_rate, temperature, spo2, timestamp } = vitalData;
  const issues = [];
  let level = "NORMAL";
  if (heart_rate > RULES.HEART_RATE_CRITICAL) { issues.push(`Heart rate tinggi: ${heart_rate} bpm`); level = "CRITICAL"; }
  if (spo2 < RULES.SPO2_CRITICAL) { issues.push(`SpO2 rendah: ${spo2}%`); level = "CRITICAL"; }
  if (temperature > RULES.TEMP_WARNING) { issues.push(`Suhu tinggi: ${temperature.toFixed(1)}C`); if (level === "NORMAL") level = "WARNING"; }
  const message = issues.length > 0 ? issues.join("; ") : `Normal (HR=${heart_rate}, Temp=${temperature.toFixed(1)}, SpO2=${spo2})`;
  return { patient_id, level, message, timestamp: timestamp || Date.now().toString() };
}

function CheckAlert(call, callback) {
  const v = call.request;
  if (!v.patient_id) return callback({ code: grpc.status.INVALID_ARGUMENT, message: "patient_id kosong" });
  const alert = evaluateVital(v);
  const icon = alert.level === "CRITICAL" ? "🔴" : alert.level === "WARNING" ? "🟡" : "🟢";
  console.log(`[AlertService] ${icon} [${alert.level}] ${alert.patient_id}: ${alert.message}`);
  callback(null, alert);
}

function StreamAlert(call) {
  console.log("[AlertService] BiDi stream dibuka...");
  call.on("data", (v) => {
    const alert = evaluateVital(v);
    const icon = alert.level === "CRITICAL" ? "🔴" : alert.level === "WARNING" ? "🟡" : "🟢";
    console.log(`[AlertService] ${icon} [${alert.level}] ${alert.patient_id}: ${alert.message}`);
    call.write(alert);
  });
  call.on("end", () => call.end());
  call.on("error", (err) => console.error("[AlertService] Error:", err.message));
}

const server = new grpc.Server();
server.addService(proto.AlertService.service, { CheckAlert, StreamAlert });
server.bindAsync("0.0.0.0:50053", grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) { console.error("Gagal start:", err.message); process.exit(1); }
  console.log(`[AlertService] ✅ Berjalan di port ${port}`);
  console.log("  🔴 CRITICAL → HR > 120 atau SpO2 < 90");
  console.log("  🟡 WARNING  → Suhu > 38.0");
});
process.on("SIGINT", () => { server.tryShutdown(() => process.exit(0)); });