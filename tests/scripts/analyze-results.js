import fs from 'fs';

function analyzeLoadTestResults(reportPath) {
  let report;
  
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    console.error('❌ Error leyendo el reporte:', error.message);
    return;
  }
  
  const latency = report.aggregate?.['http.response_time'] || {};
  const counters = report.aggregate?.counters || {};
  const rates = report.aggregate?.rates || {};

  // Datos corregidos
  const totalRequests = counters['http.requests'] || 0;
  const successfulRequests = counters['http.responses'] || counters['http.codes.200'] || 0;
  const unauthorizedRequests = counters['http.codes.401'] || 0;
  const rateLimitedRequests = counters['http.codes.429'] || 0;
  const serverErrors = counters['http.codes.500'] || 0;
  const failedRequests = totalRequests - successfulRequests;
  
  const analysis = {
    summary: {
      totalRequests,
      successfulRequests,
      unauthorizedRequests,
      rateLimitedRequests,
      serverErrors,
      failedRequests,
      successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0,
      averageResponseTime: Math.round(latency.mean || 0),
      p95ResponseTime: Math.round(latency.p95 || 0),
      p99ResponseTime: Math.round(latency.p99 || 0),
      requestsPerSecond: Math.round(rates['http.request_rate'] || 0),
      timestamp: new Date().toISOString()
    },
    performance: {},
    recommendations: []
  };

  // Evaluación de performance corregida
  const p95 = analysis.summary.p95ResponseTime;
  const successRate = parseFloat(analysis.summary.successRate);
  const rps = analysis.summary.requestsPerSecond;

  analysis.performance = {
    excellent: p95 < 200 && successRate > 95 && rps > 100,
    good: p95 < 500 && successRate > 90 && rps > 50,
    acceptable: p95 < 1000 && successRate > 80 && rps > 20,
    poor: p95 >= 1000 || successRate < 80 || rps < 20
  };
  
  // Recomendaciones mejoradas
  if (successRate < 50) {
    analysis.recommendations.push("🚨 CRÍTICO: Tasa de éxito muy baja - verificar autenticación y endpoints");
  } else if (successRate < 80) {
    analysis.recommendations.push("⚠️ Tasa de éxito baja - revisar manejo de errores");
  }
  
  if (unauthorizedRequests > totalRequests * 0.1) {
    analysis.recommendations.push("🔐 Alto número de errores 401 - verificar sistema de autenticación");
  }
  
  if (rateLimitedRequests > 0) {
    analysis.recommendations.push("🚦 Rate limiting activo - considerar ajustar límites para load testing");
  }
  
  if (p95 > 1000) {
    analysis.recommendations.push("🐌 Tiempos de respuesta altos - optimizar base de datos y queries");
  }
  
  if (rps < 50) {
    analysis.recommendations.push("📈 Baja capacidad de throughput - considerar scaling horizontal");
  }

  if (p95 === 0 && analysis.summary.averageResponseTime === 0) {
    analysis.recommendations.push("⚠️ Métricas de latencia en 0 - posible problema en la medición");
  }
  
  // Output mejorado
  console.log('🎯 ANÁLISIS DE LOAD TESTING\n');
  console.log('📊 RESUMEN:');
  console.log(`  Total de requests: ${analysis.summary.totalRequests.toLocaleString()}`);
  console.log(`  Requests exitosos: ${analysis.summary.successfulRequests.toLocaleString()} (${analysis.summary.successRate}%)`);
  console.log(`  Requests fallidos: ${analysis.summary.failedRequests.toLocaleString()}`);
  console.log(`  Requests no autorizados: ${analysis.summary.unauthorizedRequests.toLocaleString()}`);
  console.log(`  Rate limited: ${analysis.summary.rateLimitedRequests.toLocaleString()}`);
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

  console.log('\n🔍 DEBUG INFO:');
  console.log('  Counters disponibles:', Object.keys(counters));
  console.log('  Rates disponibles:', Object.keys(rates));
  console.log('  Latency disponible:', Object.keys(latency));
  
  return analysis;
}

// Uso
const reportPath = process.argv[2] || './tests/reports/load-report.json';
if (fs.existsSync(reportPath)) {
  analyzeLoadTestResults(reportPath);
} else {
  console.log('❌ Archivo de reporte no encontrado. Ejecuta primero: pnpm test:load:report');
}