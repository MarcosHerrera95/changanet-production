// Diagnóstico de configuración de Google Maps API
// Ejecutar en Node: node src/test/diagnose-maps.js
// O en consola del navegador: import('./src/test/diagnose-maps.js')

console.log('🔍 Diagnóstico de Google Maps API - Changánet');
console.log('==========================================');

// 1. Verificar variable de entorno
let apiKey;
console.log('   Verificando entorno...');
try {
  // Intentar usar import.meta (Vite/browser)
  if (import.meta && import.meta.env) {
    console.log('   Usando import.meta.env');
    apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  } else {
    throw new Error('No import.meta.env');
  }
} catch {
  console.log('   Usando Node.js fallback');
  // Fallback para Node.js - leer archivo directamente
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = join(__filename, '..');
    const envPath = join(__dirname, '../../.env.local');
    console.log('   Intentando leer:', envPath);
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf8');
      console.log('   Contenido del archivo:', envContent.substring(0, 100) + '...');
      const match = envContent.match(/VITE_GOOGLE_MAPS_API_KEY=(.+)/);
      console.log('   Match encontrado:', match);
      if (match) {
        apiKey = match[1].trim();
      }
    } else {
      console.log('   Archivo .env.local no existe en:', envPath);
    }
  } catch (error) {
    console.log('   ⚠️  Error leyendo .env.local:', error.message);
  }
}

console.log('1. API Key en entorno:', apiKey ? '✅ Presente' : '❌ Ausente');
if (apiKey) {
  console.log('   Valor:', apiKey.substring(0, 20) + '...');
} else {
  console.error('   ❌ ERROR: VITE_GOOGLE_MAPS_API_KEY no está definida en .env.local');
}

// 2. Verificar CSP headers (solo en desarrollo)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('2. Verificando CSP (desarrollo)...');
  // Nota: En producción, verificar headers del servidor
} else if (typeof window === 'undefined') {
  console.log('2. Ejecutando en Node.js - CSP no aplicable');
}

// 3. Verificar carga de Google Maps
console.log('3. Verificando carga de Google Maps...');
if (typeof window !== 'undefined' && window.google && window.google.maps) {
  console.log('   ✅ Google Maps API cargada');
} else if (typeof window !== 'undefined') {
  console.log('   ⚠️  Google Maps API no cargada aún');
} else {
  console.log('   ℹ️  Ejecutando en Node.js - Google Maps no disponible');
}

// 4. Probar API key con una solicitud simple
console.log('4. Probando conectividad con Google Maps...');
if (apiKey) {
  if (typeof fetch !== 'undefined') {
    // Browser environment
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Buenos+Aires&key=${apiKey}`)
      .then(response => {
        if (response.ok) {
          console.log('   ✅ API Key válida - Conexión exitosa');
        } else {
          console.log('   ❌ API Key inválida o restringida');
          console.log('   Código de respuesta:', response.status);
        }
      })
      .catch(error => {
        console.error('   ❌ Error de conexión:', error.message);
      });
  } else {
    // Node.js environment - use https
    const https = require('https');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Buenos+Aires&key=${apiKey}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (response.status === 'OK') {
            console.log('   ✅ API Key válida - Conexión exitosa');
          } else {
            console.log('   ❌ API Key inválida o restringida');
            console.log('   Status:', response.status);
          }
        } else {
          console.log('   ❌ Error HTTP:', res.statusCode);
        }
      });
    }).on('error', (err) => {
      console.error('   ❌ Error de conexión:', err.message);
    });
  }
} else {
  console.error('   ❌ No se puede probar sin API Key');
}

console.log('==========================================');
console.log('📋 Próximos pasos si hay errores:');
console.log('1. Verificar .env.local tiene VITE_GOOGLE_MAPS_API_KEY');
console.log('2. Ir a Google Cloud Console > APIs & Services > Credentials');
console.log('3. Asegurar que la API Key tenga restricciones correctas');
console.log('4. Habilitar Maps JavaScript API, Places API, etc.');
console.log('5. Reiniciar el servidor de desarrollo');
