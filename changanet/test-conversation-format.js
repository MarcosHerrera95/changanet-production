/**
 * Test para verificar el formato de conversationId y el error
 */

console.log('🧪 DIAGNÓSTICO DEL PROBLEMA DE CHAT');
console.log('='.repeat(50));

// Simular la lógica del backend para parsing de conversationId
function parseConversationId(conversationId) {
  console.log(`🔍 Intentando parsear: "${conversationId}"`);
  
  const parts = conversationId.split('-');
  console.log(`📊 Partes encontradas: ${parts.length}`);
  console.log(`📋 Partes:`, parts);
  
  if (parts.length !== 2) {
    console.log('❌ ERROR: Se esperan exactamente 2 partes separadas por guión');
    return { error: 'Formato de conversationId inválido' };
  }
  
  const [participant1, participant2] = parts;
  console.log('✅ Parsing exitoso:');
  console.log(`  Participant 1: ${participant1}`);
  console.log(`  Participant 2: ${participant2}`);
  
  return { participant1, participant2 };
}

// Test cases
console.log('\n📋 CASO 1: conversationId correcto');
parseConversationId('123-456');

console.log('\n📋 CASO 2: conversationId con UUID (PROBLEMA)');
parseConversationId('3f2bbc82-99bb-4436-92b0-6f8ea37b81f1');

console.log('\n📋 CASO 3: conversationId con UUIDs reales');
parseConversationId('3f2bbc82-99bb-4436-92b0-6f8ea37b81f1-987fcdeb51a-12d3-a456-426614174000');

console.log('\n🎯 CONCLUSIÓN:');
console.log('El problema es que el conversationId fue generado como un UUID individual');
console.log('en lugar del formato requerido: userId1-userId2');
