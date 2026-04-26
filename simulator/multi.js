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
  const result = { count: 3, interval: 3000 };
  for (const arg of args) {
    if (arg.startsWith("--count=")) result.count = parseInt(arg.split("=")[1]);
    if (arg.startsWith("--interval=")) result.interval = parseInt(arg.split("=")[1]);
  }
  return result;
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max) { return parseFloat((Math.random() * (max - min) + min).toFixed(1)); }

const MODES = ["normal", "warning", "critical", "random"];

function generateVital(patientId, mode) {
  let heart_rate, temperature, spo2;
  const roll = Math.random();
  if (mode === "normal")        { heart_rate = randomInt(60,100); temperature = randomFloat(36.0,37.5); spo2 = randomInt(95,100); }
  else if (mode === "critical") { heart_rate = randomInt(121,160); temperature = randomFloat(36.0,37.5); spo2 = randomInt(80,89); }
  else if (mode === "warning")  { heart_rate = randomInt(60,100); temperature = randomFloat(38.1,39.5); spo2 = randomInt(90,95); }
  else {
    if (roll < 0.6)      { heart_rate = randomInt(60,100); temperature = randomFloat(36.0,37.5); spo2 = randomInt(95,100); }
    else if (roll < 0.8) { heart_rate = randomInt(60,100); temperature = randomFloat(38.1,39.0); spo2 = randomInt(90,95); }
    else                 { heart_rate = randomInt(121,150); temperature = randomFloat(36.0,37.5); spo2 = randomInt(80,89); }
  }
  return { patient_id: patientId, heart_rate, temperature, spo2, timestamp: Date.now().toString() };
}

async function runPatient(client, patientId, mode, interval) {
  await new Promise(r => setTimeout(r, Math.random() * interval));
  let round = 0;
  const loop = async () => {
    round++;
    const v = generateVital(patientId, mode);
    const icon = v.heart_rate > 120 || v.spo2 < 90 ? "🔴" : v.temperature > 38 ? "🟡" : "🟢";
    console.log(`${icon} [${patientId}] #${round} HR=${v.heart_rate} | Temp=${v.temperature} | SpO2=${v.spo2}`);
    await new Promise(resolve => {
      const call = client.SendVitalStream((err) => { if (err) console.error(`❌ [${patientId}]`, err.message); resolve(); });
      call.write(v);
      call.end();
    });
    setTimeout(loop, interval);
  };
  loop();
}

async function main() {
  const config = parseArgs();
  console.log("═══════════════════════════════");
  console.log("    MULTI PATIENT SIMULATOR");
  console.log("═══════════════════════════════");
  console.log(`  Jumlah pasien : ${config.count}`);
  console.log(`  Interval      : ${config.interval}ms`);
  console.log("═══════════════════════════════\n");

  const client = new proto.SensorService("localhost:50051", grpc.credentials.createInsecure());
  await new Promise(r => setTimeout(r, 1000));

  for (let i = 0; i < config.count; i++) {
    const patientId = `MULTI-P${String(i+1).padStart(2,"0")}`;
    const mode = MODES[i % MODES.length];
    console.log(`▶ Start: ${patientId} (mode: ${mode})`);
    runPatient(client, patientId, mode, config.interval);
  }

  console.log(`\n✅ ${config.count} simulator jalan!\n`);
  process.on("SIGINT", () => { console.log("\nStop."); process.exit(0); });
}

main();