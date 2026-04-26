const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../proto/healthcare.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).healthcare;

const monitoringClient = new proto.MonitoringService("localhost:50052", grpc.credentials.createInsecure());
const alertClient = new proto.AlertService("localhost:50053", grpc.credentials.createInsecure());

function forwardToMonitoring(v) {
  return new Promise((resolve, reject) => {
    monitoringClient.UpdatePatientData(v, (err, res) => err ? reject(err) : resolve(res));
  });
}

function forwardToAlert(v) {
  return new Promise((resolve, reject) => {
    alertClient.CheckAlert(v, (err, alert) => {
      if (err) return reject(err);
      if (alert.level !== "NORMAL") console.log(`[SensorService] ⚠️  ALERT [${alert.level}] ${alert.patient_id}: ${alert.message}`);
      resolve(alert);
    });
  });
}

function SendVitalStream(call, callback) {
  const received = [];
  console.log("[SensorService] Stream masuk dari simulator...");
  call.on("data", async (v) => {
    if (!v.patient_id) { callback({ code: grpc.status.INVALID_ARGUMENT, message: "patient_id kosong" }); return; }
    console.log(`[SensorService] 📡 ${v.patient_id} | HR=${v.heart_rate} | Temp=${v.temperature.toFixed(1)} | SpO2=${v.spo2}`);
    received.push(v);
    try { await Promise.all([forwardToMonitoring(v), forwardToAlert(v)]); } catch (err) { console.error("[SensorService] Forward error:", err.message); }
  });
  call.on("end", () => {
    console.log(`[SensorService] Stream selesai. Total: ${received.length} data`);
    callback(null, { success: true, message: `Berhasil proses ${received.length} data` });
  });
  call.on("error", (err) => console.error("[SensorService] Stream error:", err.message));
}

const server = new grpc.Server();
server.addService(proto.SensorService.service, { SendVitalStream });
server.bindAsync("0.0.0.0:50051", grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) { console.error("Gagal start:", err.message); process.exit(1); }
  console.log(`[SensorService] ✅ Berjalan di port ${port}`);
});
process.on("SIGINT", () => { server.tryShutdown(() => process.exit(0)); });