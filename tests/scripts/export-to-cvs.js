import fs from 'fs';
import { parse } from 'json2csv';

const reportPath = './tests/reports/load-report.json';
const csvOutputPath = './tests/reports/load-report.csv';

if (!fs.existsSync(reportPath)) {
  console.error('❌ No se encontró el archivo JSON. Corre primero el test con salida JSON.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const metrics = report.aggregate || {};
const counters = metrics.counters || {};
const rates = metrics.rates || {};
const latency = metrics.latency || {};

const data = [{
  totalRequests: counters['http.requests'] || 0,
  successfulRequests: counters['http.codes.200'] || 0,
  unauthorizedRequests: counters['http.codes.401'] || 0,
  rateLimitedRequests: counters['http.codes.429'] || 0,
  failedCaptures: counters['errors.Failed capture or match'] || 0,
  requestRate: rates['http.request_rate'] || 0,
  averageResponseTime: latency.mean || 0,
  p95ResponseTime: latency.p95 || 0,
  p99ResponseTime: latency.p99 || 0,
  vusersCreated: counters['vusers.created'] || 0,
  vusersCompleted: counters['vusers.completed'] || 0,
  vusersFailed: counters['vusers.failed'] || 0,
}];

const csv = parse(data);
fs.writeFileSync(csvOutputPath, csv);

console.log(`✅ CSV generado: ${csvOutputPath}`);
