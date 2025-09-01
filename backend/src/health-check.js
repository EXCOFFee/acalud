// ============================================================================
// HEALTH CHECK - ACALUD BACKEND
// ============================================================================
// Script para verificar el estado de salud del backend

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/v1/health',
  method: 'GET',
  timeout: 5000,
};

const healthCheck = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('✅ Service is healthy');
    process.exit(0);
  } else {
    console.log('❌ Service is unhealthy');
    process.exit(1);
  }
});

healthCheck.on('error', (err) => {
  console.log('❌ Health check failed:', err.message);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.log('❌ Health check timed out');
  process.exit(1);
});

healthCheck.end();
