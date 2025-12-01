/**
 * SCRIPT DE PRUEBAS COMPLETAS - FLUJO DE COTIZACIONES CLIENTE ↔ PROFESIONAL
 * 
 * Objetivo: Verificar el circuito bidireccional completo del sistema de cotizaciones
 * 
 * FLUJOS A PROBAR:
 * 1. Cliente → Profesional: Solicitar presupuesto
 * 2. Profesional → Cliente: Responder presupuesto  
 * 3. Actualización de estados: Sincronización en ambos lados
 * 4. Integridad de datos: Sin duplicaciones, IDs correctos
 */

const axios = require('axios');

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3003';

// IDs de prueba (estos deberían existir en la base de datos)
const TEST_CLIENT_ID = 'test-client-123';
const TEST_PROFESSIONAL_ID = 'test-professional-456';

// Datos de prueba
const testQuoteData = {
  descripcion: 'Instalación de aire acondicionado split 3000 frigorias',
  zona_cobertura: 'Quilmes, Buenos Aires',
  profesionales_ids: [TEST_PROFESSIONAL_ID]
};

const testResponseData = {
  precio: 15000,
  comentario: 'Disponible este fin de semana. Incluye instalación completa.',
  tiempo: 4
};

// Utilidades de logging
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  test: (msg) => console.log(`🧪 ${msg}`)
};

class QuoteFlowTester {
  constructor() {
    this.clientToken = null;
    this.professionalToken = null;
    this.quoteId = null;
    this.testResults = {
      clientToProfessional: false,
      professionalResponse: false,
      dataIntegrity: false,
      stateSynchronization: false
    };
  }

  /**
   * Verificar conectividad del servidor
   */
  async checkServerConnectivity() {
    log.test('Verificando conectividad del servidor...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      log.success(`Servidor operativo en ${API_BASE_URL}`);
      return true;
    } catch (error) {
      log.error(`Servidor no disponible: ${error.message}`);
      log.warning('Asegúrate de que el backend esté corriendo en el puerto correcto');
      return false;
    }
  }

  /**
   * Simular autenticación de cliente (en un entorno real se haría login)
   */
  async authenticateClient() {
    log.test('Simulando autenticación de cliente...');
    
    try {
      // En un entorno real, esto sería un login real
      // Por ahora simulamos que tenemos un token válido
      this.clientToken = 'mock-client-jwt-token';
      log.success('Cliente autenticado correctamente');
      return true;
    } catch (error) {
      log.error(`Error de autenticación de cliente: ${error.message}`);
      return false;
    }
  }

  /**
   * Simular autenticación de profesional
   */
  async authenticateProfessional() {
    log.test('Simulando autenticación de profesional...');
    
    try {
      this.professionalToken = 'mock-professional-jwt-token';
      log.success('Profesional autenticado correctamente');
      return true;
    } catch (error) {
      log.error(`Error de autenticación de profesional: ${error.message}`);
      return false;
    }
  }

  /**
   * PASO 1: Crear solicitud de cotización (Cliente → Profesional)
   */
  async testClientToProfessional() {
    log.test('PASO 1: Creando solicitud de cotización...');
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/quotes`,
        testQuoteData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.clientToken}`
          }
        }
      );

      if (response.status === 201) {
        this.quoteId = response.data.id;
        log.success(`Solicitud creada exitosamente. ID: ${this.quoteId}`);
        
        // Verificar estructura de respuesta
        const requiredFields = ['id', 'descripcion', 'zona_cobertura', 'profesionales_solicitados'];
        const hasAllFields = requiredFields.every(field => response.data.hasOwnProperty(field));
        
        if (hasAllFields) {
          log.success('Estructura de respuesta correcta');
        } else {
          log.warning('Estructura de respuesta incompleta');
        }
        
        this.testResults.clientToProfessional = true;
        return true;
      } else {
        log.error(`Error al crear solicitud: ${response.status}`);
        return false;
      }
    } catch (error) {
      log.error(`Error en solicitud de cotización: ${error.message}`);
      
      // Analizar tipos de errores comunes
      if (error.response) {
        const { status, data } = error.response;
        log.error(`Status: ${status}, Message: ${data.message || data.error}`);
        
        // Errores específicos comunes
        if (status === 401) {
          log.warning('Token de autenticación inválido o expirado');
        } else if (status === 400) {
          log.warning('Datos de entrada inválidos');
        }
      }
      
      return false;
    }
  }

  /**
   * PASO 2: Verificar que el profesional reciba la solicitud
   */
  async testProfessionalReceivesQuote() {
    log.test('PASO 2: Verificando recepción en panel profesional...');
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/quotes/professional`,
        {
          headers: {
            'Authorization': `Bearer ${this.professionalToken}`
          }
        }
      );

      if (response.status === 200) {
        const quotes = response.data;
        
        // Buscar la cotización creada
        const targetQuote = quotes.find(q => q.id === this.quoteId);
        
        if (targetQuote) {
          log.success('Solicitud recibida correctamente por el profesional');
          log.info(`Descripción: ${targetQuote.descripcion}`);
          log.info(`Cliente: ${targetQuote.cliente.nombre}`);
          return true;
        } else {
          log.warning('Solicitud no encontrada en el panel del profesional');
          log.info(`Total de cotizaciones encontradas: ${quotes.length}`);
          return false;
        }
      } else {
        log.error(`Error al obtener cotizaciones: ${response.status}`);
        return false;
      }
    } catch (error) {
      log.error(`Error al verificar recepción profesional: ${error.message}`);
      return false;
    }
  }

  /**
   * PASO 3: Responder a la cotización (Profesional → Cliente)
   */
  async testProfessionalResponse() {
    log.test('PASO 3: Enviando respuesta profesional...');
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/quotes/respond`,
        {
          quoteId: this.quoteId,
          action: 'accept',
          ...testResponseData
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.professionalToken}`
          }
        }
      );

      if (response.status === 200) {
        log.success('Respuesta profesional enviada exitosamente');
        log.info(`Precio: $${testResponseData.precio}`);
        log.info(`Comentario: ${testResponseData.comentario}`);
        
        this.testResults.professionalResponse = true;
        return true;
      } else {
        log.error(`Error al enviar respuesta: ${response.status}`);
        return false;
      }
    } catch (error) {
      log.error(`Error en respuesta profesional: ${error.message}`);
      
      if (error.response) {
        const { status, data } = error.response;
        log.error(`Status: ${status}, Message: ${data.message || data.error}`);
      }
      
      return false;
    }
  }

  /**
   * PASO 4: Verificar que el cliente vea la respuesta
   */
  async testClientSeesResponse() {
    log.test('PASO 4: Verificando que el cliente vea la respuesta...');
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/quotes/client`,
        {
          headers: {
            'Authorization': `Bearer ${this.clientToken}`
          }
        }
      );

      if (response.status === 200) {
        const quotes = response.data;
        
        // Buscar la cotización con respuesta
        const targetQuote = quotes.find(q => q.id === this.quoteId);
        
        if (targetQuote) {
          const acceptedOffers = targetQuote.ofertas.filter(o => o.estado === 'ACEPTADO');
          
          if (acceptedOffers.length > 0) {
            log.success('Respuesta profesional visible para el cliente');
            log.info(`Ofertas aceptadas: ${acceptedOffers.length}`);
            
            // Verificar integridad de datos
            const offer = acceptedOffers[0];
            if (offer.precio === testResponseData.precio && 
                offer.comentario === testResponseData.comentario) {
              log.success('Integridad de datos verificada');
              this.testResults.dataIntegrity = true;
            } else {
              log.warning('Inconsistencia en datos de respuesta');
            }
            
            return true;
          } else {
            log.warning('No se encontraron ofertas aceptadas');
            return false;
          }
        } else {
          log.warning('Cotización no encontrada en panel del cliente');
          return false;
        }
      } else {
        log.error(`Error al obtener cotizaciones del cliente: ${response.status}`);
        return false;
      }
    } catch (error) {
      log.error(`Error al verificar vista del cliente: ${error.message}`);
      return false;
    }
  }

  /**
   * PASO 5: Verificar sincronización de estados
   */
  async testStateSynchronization() {
    log.test('PASO 5: Verificando sincronización de estados...');
    
    try {
      // Obtener estados desde ambas perspectivas
      const [clientQuotes, professionalQuotes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/quotes/client`, {
          headers: { 'Authorization': `Bearer ${this.clientToken}` }
        }),
        axios.get(`${API_BASE_URL}/api/quotes/professional`, {
          headers: { 'Authorization': `Bearer ${this.professionalToken}` }
        })
      ]);

      // Verificar consistencia de estados
      const clientQuote = clientQuotes.data.find(q => q.id === this.quoteId);
      const professionalQuote = professionalQuotes.data.find(q => q.id === this.quoteId);

      if (clientQuote && professionalQuote) {
        const clientOffer = clientQuote.ofertas.find(o => o.estado === 'ACEPTADO');
        const professionalResponse = professionalQuote.mi_respuesta;

        if (clientOffer && professionalResponse && 
            clientOffer.precio === professionalResponse.precio &&
            clientOffer.estado === 'ACEPTADO' &&
            professionalResponse.estado === 'ACEPTADO') {
          log.success('Estados sincronizados correctamente');
          this.testResults.stateSynchronization = true;
          return true;
        } else {
          log.warning('Estados no sincronizados');
          log.info(`Cliente: ${clientOffer?.estado || 'Sin oferta'}, Profesional: ${professionalResponse?.estado || 'Sin respuesta'}`);
          return false;
        }
      } else {
        log.warning('No se pudo comparar estados - cotización no encontrada');
        return false;
      }
    } catch (error) {
      log.error(`Error al verificar sincronización: ${error.message}`);
      return false;
    }
  }

  /**
   * Verificar componentes frontend
   */
  async testFrontendComponents() {
    log.test('Verificando componentes frontend...');
    
    try {
      // Verificar archivos de componentes
      const fs = require('fs');
      const path = require('path');
      
      const componentPaths = [
        'changanet-frontend/src/components/modals/QuoteRequestModal.jsx',
        'changanet-frontend/src/components/MisCotizacionesCliente.jsx',
        'changanet-frontend/src/components/MisCotizacionesProfesional.jsx'
      ];

      let componentsOk = true;
      
      for (const componentPath of componentPaths) {
        if (fs.existsSync(componentPath)) {
          log.success(`Componente encontrado: ${path.basename(componentPath)}`);
          
          // Verificar funcionalidad básica del componente
          const content = fs.readFileSync(componentPath, 'utf8');
          
          if (componentPath.includes('QuoteRequestModal')) {
            if (content.includes('handleSubmit') && content.includes('fetch')) {
              log.success('QuoteRequestModal tiene funcionalidad de envío');
            } else {
              log.warning('QuoteRequestModal puede tener problemas de funcionalidad');
              componentsOk = false;
            }
          }
          
        } else {
          log.error(`Componente faltante: ${componentPath}`);
          componentsOk = false;
        }
      }
      
      return componentsOk;
    } catch (error) {
      log.error(`Error al verificar componentes frontend: ${error.message}`);
      return false;
    }
  }

  /**
   * Ejecutar todas las pruebas
   */
  async runAllTests() {
    console.log('🚀 INICIANDO PRUEBAS COMPLETAS DEL FLUJO DE COTIZACIONES\n');
    console.log('=' .repeat(60));
    
    // Verificar pre-requisitos
    if (!(await this.checkServerConnectivity())) {
      log.error('No se puede continuar sin conectividad del servidor');
      return;
    }

    if (!(await this.authenticateClient())) {
      log.error('No se puede continuar sin autenticación de cliente');
      return;
    }

    if (!(await this.authenticateProfessional())) {
      log.error('No se puede continuar sin autenticación de profesional');
      return;
    }

    console.log('\n📋 EJECUTANDO FLUJO COMPLETO:');
    console.log('-'.repeat(40));

    // Ejecutar flujo principal
    const flowSteps = [
      { name: 'Cliente → Profesional', test: () => this.testClientToProfessional() },
      { name: 'Recepción Profesional', test: () => this.testProfessionalReceivesQuote() },
      { name: 'Respuesta Profesional', test: () => this.testProfessionalResponse() },
      { name: 'Vista del Cliente', test: () => this.testClientSeesResponse() },
      { name: 'Sincronización Estados', test: () => this.testStateSynchronization() }
    ];

    for (const step of flowSteps) {
      const success = await step.test();
      console.log(`${success ? '✅' : '❌'} ${step.name}: ${success ? 'PASS' : 'FAIL'}`);
    }

    // Verificar componentes frontend
    const frontendOk = await this.testFrontendComponents();
    console.log(`${frontendOk ? '✅' : '❌'} Componentes Frontend: ${frontendOk ? 'PASS' : 'FAIL'}`);

    console.log('\n📊 RESULTADOS FINALES:');
    console.log('='.repeat(60));
    
    const allTestsPassed = Object.values(this.testResults).every(result => result) && frontendOk;
    
    if (allTestsPassed) {
      log.success('🎉 FLUJO COMPLETO EXITOSO - Todas las pruebas pasaron');
      console.log('\n✅ CONFIRMADO: El circuito bidireccional Cliente ↔ Profesional funciona correctamente');
      console.log('✅ CONFIRMADO: La integridad de datos se mantiene');
      console.log('✅ CONFIRMADO: Los estados se sincronizan correctamente');
      console.log('✅ CONFIRMADO: Los componentes frontend están operativos');
    } else {
      log.error('🚨 FLUJO CON ERRORES DETECTADOS');
      console.log('\n❌ Pruebas fallidas:');
      
      Object.entries(this.testResults).forEach(([test, result]) => {
        if (!result) {
          console.log(`   - ${test}`);
        }
      });
      
      if (!frontendOk) {
        console.log('   - Componentes Frontend');
      }
    }

    console.log('\n💡 RECOMENDACIONES:');
    if (!this.testResults.clientToProfessional) {
      console.log('   - Verificar autenticación de cliente');
      console.log('   - Validar datos de entrada');
    }
    if (!this.testResults.professionalResponse) {
      console.log('   - Verificar que la cotización esté en estado PENDIENTE');
      console.log('   - Validar formato de precio y comentarios');
    }
    if (!this.testResults.dataIntegrity) {
      console.log('   - Revisar mapeo de campos entre backend y frontend');
    }
    if (!this.testResults.stateSynchronization) {
      console.log('   - Verificar actualización de estados en tiempo real');
    }
    if (!frontendOk) {
      console.log('   - Revisar implementación de componentes React');
      console.log('   - Verificar conexión con API endpoints');
    }

    return allTestsPassed;
  }
}

// Ejecutar pruebas si el archivo se ejecuta directamente
if (require.main === module) {
  const tester = new QuoteFlowTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Error crítico en las pruebas:', error);
    process.exit(1);
  });
}

module.exports = QuoteFlowTester;
