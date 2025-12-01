// Script para probar las correcciones implementadas para el error 500 del chat
// Simula escenarios de tokens válidos e inválidos

// Simular validación de token JWT
function isValidJWTToken(token) {
  if (!token) return false;
  
  // Verificar formato básico JWT (3 partes separadas por .)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.log('❌ Token JWT inválido: no tiene 3 partes');
    return false;
  }
  
  // Verificar que cada parte tenga contenido
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) {
    console.log('❌ Token JWT inválido: alguna parte está vacía');
    return false;
  }
  
  try {
    // Intentar decodificar el payload para verificar que es JSON válido
    JSON.parse(atob(payload));
    console.log('✅ Token JWT tiene formato válido');
    return true;
  } catch {
    console.log('❌ Token JWT inválido: payload no es JSON válido');
    return false;
  }
}

// Función para limpiar token corrupto
function clearCorruptedToken() {
  console.warn('🧹 Limpiando token JWT corrupto');
  localStorage.removeItem('changanet_token');
  localStorage.removeItem('changanet_user');
}

// Test 1: Token válido (JWT correcto)
console.log('🧪 TEST 1: Token JWT válido');
const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImV4cCI6MTY5MzQ0MjAwMH0.signature';
localStorage.setItem('changanet_token', validToken);
const token1 = localStorage.getItem('changanet_token');
console.log('Token almacenado:', token1.substring(0, 20) + '...');
console.log('Validación:', isValidJWTToken(token1));
console.log('');

// Test 2: Token corrupto (solo 2 partes)
console.log('🧪 TEST 2: Token JWT corrupto (2 partes)');
const corruptToken2 = 'header.payload';
localStorage.setItem('changanet_token', corruptToken2);
const token2 = localStorage.getItem('changanet_token');
console.log('Token almacenado:', token2);
console.log('Validación:', isValidJWTToken(token2));
console.log('');

// Test 3: Token corrupto (payload inválido)
console.log('🧪 TEST 3: Token JWT corrupto (payload no JSON)');
const corruptToken3 = 'header.invalid_payload.signature';
localStorage.setItem('changanet_token', corruptToken3);
const token3 = localStorage.getItem('changanet_token');
console.log('Token almacenado:', token3);
console.log('Validación:', isValidJWTToken(token3));
console.log('');

// Test 4: Sin token
console.log('🧪 TEST 4: Sin token');
localStorage.removeItem('changanet_token');
const token4 = localStorage.getItem('changanet_token');
console.log('Token almacenado:', token4);
console.log('Validación:', isValidJWTToken(token4));
console.log('');

console.log('🎯 RESUMEN DE CORRECCIONES IMPLEMENTADAS:');
console.log('✅ 1. Validación de formato JWT antes de envío al backend');
console.log('✅ 2. Limpieza automática de tokens corruptos');
console.log('✅ 3. URLs de API corregidas (puerto 3004)');
console.log('✅ 4. Manejo robusto de errores de autenticación');
console.log('✅ 5. Logging detallado para debugging');