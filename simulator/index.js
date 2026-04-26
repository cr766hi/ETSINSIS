const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../proto/healthcare.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDef).healthcare;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { patient_id: null, mode: "random", interval: 2000, batch: 3 };
  for (const arg of args) {
    if (arg.startsWith("--patient=")) result.patient_id = arg.split("=")[1];
    if (arg.startsWith("--mode=")) result.mode = arg.split("=")[1];
    if (arg.startsWith("--interval=")) result.interval = parseInt(arg.split("=")[1]);
    if (arg.startsWith("--batch=")) result.batch = parseInt(arg.split("=")[1]);
  }
  if (!result.patient_id) result.patient_id = "P-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  return result;
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(1)); }

function generateVital(patientId, mode) {
  let heart_rate, temperature, spo2;
  const roll = Math.random();
  if (mode === "normal")         { heart_rate = randomInt(60,100); temperature = randomFloat(36.0,37.5); spo2 = randomInt(95,100); }
  else if (mode === "critical")  { heart_rate = randomInt(121,160); temperature = randomFloat(36.0,37.5); spo2 = randomInt(80,89); }
  else if (mode === "warning")   { heart_rate = randomInt(60,100); temperature = randomFloat(38.1,39.5); spo2 = randomInt(90,95); }
  else {
    if (roll < 0.6)      { heart_rate = randomInt(60,100); temperature = randomFloat(36.0,37.5); spo2 = randomInt(95,100); }
    else if (roll < 0.8) { heart_rate = randomInt(60,100); temperature = randomFloat(38.1,39.0); spo2 = randomInt(90,95); }
    else                 { heart_rate = randomInt(121,150); temperature = randomFloat(36.0,37.5); spo2 = randomInt(80,89); }
  }
  return { patient_id: patientId, heart_rate, temperature, spo2, timestamp: Date.now().toString() };
}

function sendStream(client, patientId, mode, batchSize) {
  return new Promise((resolve, reject) => {
    const call = client.SendVitalStream((err, res) => err ? reject(err) : resolve(res));
    for (let i = 0; i < batchSize; i++) {
      const v = generateVital(patientId, mode);
      console.log(`📡 [${i+1}/${batchSize}] ${v.patient_id} | HR=${v.heart_rate} | Temp=${v.temperature} | SpO2=${v.spo2}`);
      call.write(v);
    }
    call.end();
  });
}

async function main() {
  const config = parseArgs();
  console.log("═══════════════════════════════");
  console.log("     PATIENT SIMULATOR");
  console.log("═══════════════════════════════");
  console.log(`  Patient : ${config.patient_id}`);
  console.log(`  Mode    : ${config.mode}`);
  console.log(`  Interval: ${config.interval}ms`);
  console.log("═══════════════════════════════\n");

  const client = new proto.SensorService("localhost:50051", grpc.credentials.createInsecure());
  await new Promise(r => setTimeout(r, 500));

  let round = 0;
  const loop = async () => {
    round++;
    console.log(`\n─── Round #${round} ───`);
    try {
      const res = await sendStream(client, config.patient_id, config.mode, config.batch);
      console.log(`✅ ${res.message}`);
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      if (err.code === grpc.status.UNAVAILABLE) await new Promise(r => setTimeout(r, 5000));
    }
    setTimeout(loop, config.interval);
  };
  loop();
  process.on("SIGINT", () => { console.log("\nSimulator stop."); process.exit(0); });
}

main();