import fs from 'fs';
import path from 'path';

function analyzeLoadTestResults(reportPath) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  const analysis = {
    summary: {
      totalRequests: report.aggregate.counters['http.requests'],
      successfulRequests: report.aggregate.counters['http.requests'] - (report.aggregate.counters['http.request_timeout'] || 0),
      failedRequests: report.aggregate.counters['errors.ECONNRESET'] || 0,
      averageResponseTime: report.aggregate.latency.mean,
      p95ResponseTime: report.aggregate.latency.p95,
      p99ResponseTime: report.aggregate.latency.p99,
      requestsPerSecond: report.aggregate.rates['http.request_rate']
    },
    performance: {
      excellent: report.aggregate.latency.p95 < 200,
      good: report.aggregate.latency.p95 < 500,
      acceptable: report.aggregate.latency.p95 < 1000,
      poor: report.aggregate.latency.p95 >= 1000
    },
    recommendations: []
  };
  
  // Generar recomendaciones
  if (analysis.performance.poor) {
    analysis.recommendations.push("⚠️ Tiempos de respuesta altos - considerar optimización de base de datos");
    analysis.recommendations.push("🔧 Implementar caché para endpoints frecuentes");
  }
  
  if (analysis.summary.failedRequests > analysis.summary.totalRequests * 0.01) {
    analysis.recommendations.push("❌ Alta tasa de errores - revisar manejo de errores y timeouts");
  }
  
  if (analysis.summary.requestsPerSecond < 50) {
    analysis.recommendations.push("📈 Baja capacidad de throughput - considerar scaling horizontal");
  }
  
  console.log('🎯 ANÁLISIS DE LOAD TESTING\n');
  console.log('📊 RESUMEN:');
  console.log(`  Total de requests: ${analysis.summary.totalRequests}`);
  console.log(`  Requests exitosos: ${analysis.summary.successfulRequests}`);
  console.log(`  Requests fallidos: ${analysis.summary.failedRequests}`);
  console.log(`  Tiempo respuesta promedio: ${analysis.summary.averageResponseTime}ms`);
  console.log(`  P95 tiempo respuesta: ${analysis.summary.p95ResponseTime}ms`);
  console.log(`  P99 tiempo respuesta: ${analysis.summary.p99ResponseTime}ms`);
  console.log(`  Requests por segundo: ${analysis.summary.requestsPerSecond}`);
  
  console.log('\n🎪 EVALUACIÓN DE PERFORMANCE:');
  if (analysis.performance.excellent) {
    console.log('  ✅ EXCELENTE - API muy rápida y eficiente');
  } else if (analysis.performance.good) {
    console.log('  ✅ BUENA - Performance aceptable para producción');
  } else if (analysis.performance.acceptable) {
    console.log('  ⚠️ ACEPTABLE - Hay margen de mejora');
  } else {
    console.log('  ❌ POBRE - Requiere optimización urgente');
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('\n💡 RECOMENDACIONES:');
    analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
  }
  
  return analysis;
}

// Uso
const reportPath = process.argv[2] || './tests/reports/load-report.json';
if (fs.existsSync(reportPath)) {
  analyzeLoadTestResults(reportPath);
} else {
  console.log('❌ Archivo de reporte no encontrado. Ejecuta primero: pnpm test:load:report');
}