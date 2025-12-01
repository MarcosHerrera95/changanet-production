// test-metrics-custom.js - Script de prueba para métricas personalizadas y contexto de usuario
require('dotenv').config();

// Inicializar Sentry backend
const { initializeSentry, captureMessage, setUserContext } = require('./changanet-backend/src/services/sentryService');
initializeSentry();

console.log('🚀 Iniciando pruebas de métricas personalizadas y contexto de usuario...');

// Prueba 1: Contexto de usuario en backend
console.log('📝 Prueba 1: Configurando contexto de usuario en backend...');
setUserContext({
  id: 999,
  email: 'test-user@changanet.com',
  nombre: 'Usuario de Prueba',
  rol: 'cliente'
});

captureMessage('Contexto de usuario configurado en backend', 'info', {
  tags: {
    test: 'user_context_backend',
    user_role: 'cliente'
  },
  extra: {
    user_id: 999,
    test_type: 'user_context'
  }
});
console.log('✅ Contexto de usuario configurado en backend');

// Prueba 2: Métrica de registro de usuario
console.log('📝 Prueba 2: Registrando métrica de nuevo usuario...');
captureMessage('Nuevo usuario registrado - métrica de negocio', 'info', {
  tags: {
    event: 'user_registration',
    business_metric: 'user_acquisition',
    user_role: 'cliente',
    source: 'email'
  },
  extra: {
    user_id: 1001,
    email: 'newuser@changanet.com',
    role: 'cliente',
    registration_method: 'email',
    business_impact: 'social_economic_environmental',
    timestamp: new Date().toISOString()
  }
});
console.log('✅ Métrica de registro de usuario registrada');

// Prueba 3: Métrica de servicio agendado
console.log('📝 Prueba 3: Registrando métrica de servicio agendado...');
captureMessage('Servicio agendado - métrica de negocio', 'info', {
  tags: {
    event: 'service_scheduled',
    business_metric: 'service_booking',
    user_role: 'cliente'
  },
  extra: {
    service_id: 5001,
    client_id: 999,
    professional_id: 2001,
    scheduled_date: '2025-12-25T10:00:00Z',
    description: 'Servicio de jardinería - corte de césped',
    business_impact: 'economic_environmental',
    timestamp: new Date().toISOString()
  }
});
console.log('✅ Métrica de servicio agendado registrada');

// Prueba 4: Métrica de servicio completado
console.log('📝 Prueba 4: Registrando métrica de servicio completado...');
captureMessage('Servicio completado - métrica de negocio', 'info', {
  tags: {
    event: 'service_completed',
    business_metric: 'service_completion',
    user_role: 'profesional'
  },
  extra: {
    service_id: 5001,
    client_id: 999,
    professional_id: 2001,
    completed_at: new Date().toISOString(),
    business_impact: 'economic_environmental',
    rating: 5,
    feedback: 'Excelente servicio'
  }
});
console.log('✅ Métrica de servicio completado registrada');

// Prueba 5: Métrica de SMS enviado
console.log('📝 Prueba 5: Registrando métrica de SMS enviado...');
captureMessage('SMS enviado - métrica de comunicación', 'info', {
  tags: {
    event: 'sms_sent',
    business_metric: 'communication',
    service: 'twilio'
  },
  extra: {
    to: '+5491112345678',
    sid: 'SM1234567890abcdef',
    status: 'delivered',
    message_length: 120,
    message_type: 'service_notification',
    business_impact: 'social_economic',
    timestamp: new Date().toISOString()
  }
});
console.log('✅ Métrica de SMS enviado registrada');

// Prueba 6: Métrica de solicitud de presupuesto
console.log('📝 Prueba 6: Registrando métrica de solicitud de presupuesto...');
captureMessage('Solicitud de presupuesto - métrica de negocio', 'info', {
  tags: {
    event: 'quote_request',
    business_metric: 'quote_request',
    component: 'QuoteRequestForm'
  },
  extra: {
    description: 'Reparación de electrodomésticos - lavarropas no centrifuga',
    coverage_area: 'Buenos Aires - Zona Norte',
    category: 'electrodomésticos',
    business_impact: 'economic_environmental',
    timestamp: new Date().toISOString()
  }
});
console.log('✅ Métrica de solicitud de presupuesto registrada');

// Prueba 7: Métrica de impacto triple
console.log('📝 Prueba 7: Registrando métrica de impacto triple...');
captureMessage('Actividad con impacto triple - Changánet', 'info', {
  tags: {
    event: 'triple_impact_activity',
    business_metric: 'sustainability',
    impact_type: 'triple_impact'
  },
  extra: {
    social_impact: 'Conexión intergeneracional - adultos mayores con jóvenes profesionales',
    economic_impact: 'Generación de ingresos para profesionales independientes',
    environmental_impact: 'Servicios sostenibles - reparación vs reemplazo',
    activity_type: 'service_booking',
    participants: 2,
    business_impact: 'social_economic_environmental',
    timestamp: new Date().toISOString()
  }
});
console.log('✅ Métrica de impacto triple registrada');

// Prueba 8: Métrica de error con contexto de usuario
console.log('📝 Prueba 8: Registrando error con contexto de usuario...');
try {
  throw new Error('Error simulado con contexto de usuario');
} catch (error) {
  const { captureError } = require('./changanet-backend/src/services/sentryService');
  captureError(error, {
    tags: {
      test: 'user_context_error',
      user_role: 'cliente',
      error_type: 'simulated'
    },
    extra: {
      user_id: 999,
      action: 'service_booking',
      component: 'ServiceBookingComponent',
      business_impact: 'error_tracking'
    }
  });
}
console.log('✅ Error con contexto de usuario registrado');

// Finalizar pruebas
setTimeout(() => {
  console.log('🎉 Todas las pruebas de métricas personalizadas completadas');
  console.log('📊 Revisa el dashboard de Sentry para ver las métricas registradas');
  console.log('🔗 Métricas registradas:');
  console.log('   - Contexto de usuario');
  console.log('   - Registro de usuarios');
  console.log('   - Servicios agendados');
  console.log('   - Servicios completados');
  console.log('   - SMS enviados');
  console.log('   - Solicitudes de presupuesto');
  console.log('   - Impacto triple');
  console.log('   - Errores con contexto');

  process.exit(0);
}, 2000);
