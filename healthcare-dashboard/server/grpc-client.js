import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, '../../proto/healthcare.proto');

// Check proto file exists
const protoExists = fs.existsSync(PROTO_PATH);
console.log(`[gRPC] Proto path: ${PROTO_PATH}`);
console.log(`[gRPC] File exists: ${protoExists ? '✅' : '❌'}`);

if (!protoExists) {
  throw new Error(`Proto file not found: ${PROTO_PATH}`);
}

// Load proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const healthcareProto = grpc.loadPackageDefinition(packageDefinition).healthcare;
console.log(`[gRPC] Proto loaded, services available: ${Object.keys(healthcareProto)}`);

// Initialize clients
export let monitoringClient;
export let alertClient;
export let sensorClient;

export async function initGrpcClients() {
  return new Promise((resolve, reject) => {
    try {
      monitoringClient = new healthcareProto.MonitoringService(
        'localhost:50052',
        grpc.credentials.createInsecure()
      );
      
      alertClient = new healthcareProto.AlertService(
        'localhost:50053',
        grpc.credentials.createInsecure()
      );
      
      sensorClient = new healthcareProto.SensorService(
        'localhost:50051',
        grpc.credentials.createInsecure()
      );
      
      console.log('[gRPC] ✅ All clients initialized');
      resolve();
    } catch (err) {
      console.error('[gRPC] Error initializing clients:', err);
      reject(err);
    }
  });
}
