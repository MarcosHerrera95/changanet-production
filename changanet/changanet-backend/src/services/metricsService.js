// src/services/metricsService.js - Servicio de métricas para Prometheus
const promClient = require('prom-client');

/**
 * Inicializa el registro de métricas de Prometheus
 * Debe ser llamado al inicio de la aplicación
 */
function initializeMetrics() {
  // Métricas por defecto del sistema
  const collectDefaultMetrics = promClient.collectDefaultMetrics;
  collectDefaultMetrics({ prefix: 'changanet_' });

  console.log('✅ Métricas por defecto de Prometheus inicializadas');
}

/**
 * Métricas personalizadas para Changánet
 */

// Contador de servicios
const servicesTotal = new promClient.Counter({
  name: 'changanet_services_total',
  help: 'Total de servicios registrados en Changánet',
  labelNames: ['tipo', 'estado', 'impacto']
});

// Contador de usuarios
const usersTotal = new promClient.Counter({
  name: 'changanet_users_total',
  help: 'Total de usuarios registrados en Changánet',
  labelNames: ['rol', 'origen']
});

// Contador de SMS
const smsTotal = new promClient.Counter({
  name: 'changanet_sms_total',
  help: 'Total de SMS enviados por Changánet',
  labelNames: ['estado', 'tipo']
});

// Histograma de duración de solicitudes HTTP
const httpRequestDuration = new promClient.Histogram({
  name: 'changanet_http_request_duration_seconds',
  help: 'Duración de las solicitudes HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10] // buckets en segundos
});

// Contador de solicitudes HTTP
const httpRequestsTotal = new promClient.Counter({
  name: 'changanet_http_requests_total',
  help: 'Total de solicitudes HTTP por método y código de estado',
  labelNames: ['method', 'route', 'status_code']
});

// Gauge de usuarios activos
const activeUsers = new promClient.Gauge({
  name: 'changanet_active_users',
  help: 'Número de usuarios activos actualmente',
  labelNames: ['rol']
});

// Contador de errores de negocio
const businessErrorsTotal = new promClient.Counter({
  name: 'changanet_business_errors_total',
  help: 'Total de errores de negocio en Changánet',
  labelNames: ['tipo', 'componente']
});

// Métricas de triple impacto
const tripleImpactActivities = new promClient.Counter({
  name: 'changanet_triple_impact_activities_total',
  help: 'Total de actividades con triple impacto',
  labelNames: ['tipo_impacto', 'categoria']
});

// Métricas de negocio específicas
const quotesRequested = new promClient.Counter({
  name: 'changanet_quotes_requested_total',
  help: 'Total de cotizaciones solicitadas',
  labelNames: ['categoria_servicio', 'estado']
});

const servicesCompleted = new promClient.Counter({
  name: 'changanet_services_completed_total',
  help: 'Total de servicios completados exitosamente',
  labelNames: ['categoria', 'ubicacion', 'calificacion_promedio']
});

const userEngagement = new promClient.Histogram({
  name: 'changanet_user_engagement_duration_seconds',
  help: 'Duración de engagement de usuarios en segundos',
  labelNames: ['tipo_usuario', 'accion'],
  buckets: [30, 60, 300, 600, 1800, 3600] // 30s, 1min, 5min, 10min, 30min, 1hora
});

const conversionRate = new promClient.Gauge({
  name: 'changanet_conversion_rate',
  help: 'Tasa de conversión de visitantes a usuarios registrados',
  labelNames: ['fuente', 'tipo_conversion']
});

const revenueTotal = new promClient.Counter({
  name: 'changanet_revenue_total',
  help: 'Ingresos totales generados por la plataforma',
  labelNames: ['tipo_ingreso', 'metodo_pago']
});

// ===== MÉTRICAS DE PAGOS Y COMISIONES =====

// Contador de pagos procesados
const paymentsProcessedTotal = new promClient.Counter({
  name: 'changanet_payments_processed_total',
  help: 'Total de pagos procesados por la plataforma',
  labelNames: ['estado', 'metodo_pago', 'tipo_servicio']
});

// Histograma de latencia de pagos
const paymentProcessingDuration = new promClient.Histogram({
  name: 'changanet_payment_processing_duration_seconds',
  help: 'Duración del procesamiento de pagos en segundos',
  labelNames: ['tipo_operacion', 'exito'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30] // buckets en segundos
});

// Gauge de pagos pendientes
const pendingPayments = new promClient.Gauge({
  name: 'changanet_pending_payments',
  help: 'Número de pagos actualmente en estado pendiente',
  labelNames: ['tipo']
});

// Contador de comisiones calculadas
const commissionsCalculatedTotal = new promClient.Counter({
  name: 'changanet_commissions_calculated_total',
  help: 'Total de comisiones calculadas por la plataforma',
  labelNames: ['tipo_servicio', 'rango_porcentaje']
});

// Histograma de montos de pago
const paymentAmount = new promClient.Histogram({
  name: 'changanet_payment_amount',
  help: 'Distribución de montos de pago en ARS',
  labelNames: ['tipo_pago'],
  buckets: [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000] // buckets en ARS
});

// Contador de errores de pago
const paymentErrorsTotal = new promClient.Counter({
  name: 'changanet_payment_errors_total',
  help: 'Total de errores en procesamiento de pagos',
  labelNames: ['tipo_error', 'componente']
});

// Gauge de fondos en custodia
const escrowFunds = new promClient.Gauge({
  name: 'changanet_escrow_funds_ars',
  help: 'Monto total de fondos en custodia en ARS',
  labelNames: ['estado']
});

// Contador de payouts procesados
const payoutsProcessedTotal = new promClient.Counter({
  name: 'changanet_payouts_processed_total',
  help: 'Total de payouts procesados a profesionales',
  labelNames: ['estado', 'metodo_pago']
});

// Histograma de latencia de liberación de fondos
const fundReleaseDuration = new promClient.Histogram({
  name: 'changanet_fund_release_duration_hours',
  help: 'Tiempo entre aprobación de pago y liberación de fondos en horas',
  labelNames: ['automatico'],
  buckets: [1, 6, 12, 24, 48, 72, 168] // buckets en horas
});

// Contador de webhooks procesados
const webhooksProcessedTotal = new promClient.Counter({
  name: 'changanet_webhooks_processed_total',
  help: 'Total de webhooks de pasarelas de pago procesados',
  labelNames: ['tipo', 'estado', 'proveedor']
});

// Gauge de throughput de pagos
const paymentThroughput = new promClient.Gauge({
  name: 'changanet_payment_throughput_per_minute',
  help: 'Throughput de pagos procesados por minuto',
  labelNames: ['tipo_operacion']
});

// Métricas específicas del sistema de búsqueda
const searchRequestsTotal = new promClient.Counter({
  name: 'changanet_search_requests_total',
  help: 'Total de solicitudes de búsqueda realizadas',
  labelNames: ['cached', 'has_filters', 'has_location']
});

const searchDuration = new promClient.Histogram({
  name: 'changanet_search_duration_seconds',
  help: 'Duración de las búsquedas en segundos',
  labelNames: ['cached', 'result_count'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const searchResultsCount = new promClient.Histogram({
  name: 'changanet_search_results_count',
  help: 'Número de resultados devueltos por búsqueda',
  labelNames: ['has_filters', 'has_location'],
  buckets: [0, 1, 5, 10, 25, 50, 100, 500]
});

const autocompleteRequestsTotal = new promClient.Counter({
  name: 'changanet_autocomplete_requests_total',
  help: 'Total de solicitudes de autocompletado',
  labelNames: ['type', 'result_count']
});

const cacheHitRatio = new promClient.Gauge({
  name: 'changanet_cache_hit_ratio',
  help: 'Ratio de aciertos del caché (0-1)',
  labelNames: ['cache_type']
});

/**
 * Funciones para incrementar métricas
 */

// Servicios
function incrementServiceScheduled(tipo = 'general', impacto = 'economic') {
  servicesTotal.inc({ tipo, estado: 'agendado', impacto });
}

function incrementServiceCompleted(tipo = 'general', impacto = 'economic') {
  servicesTotal.inc({ tipo, estado: 'completado', impacto });
}

// Usuarios
function incrementUserRegistered(rol = 'cliente', origen = 'email') {
  usersTotal.inc({ rol, origen });
}

// SMS
function incrementSmsSent(estado = 'exitoso', tipo = 'notificacion') {
  smsTotal.inc({ estado, tipo });
}

// Errores de negocio
function incrementBusinessError(tipo = 'general', componente = 'unknown') {
  businessErrorsTotal.inc({ tipo, componente });
}

// Triple impacto
function incrementTripleImpactActivity(tipoImpacto = 'social', categoria = 'servicio') {
  tripleImpactActivities.inc({ tipo_impacto: tipoImpacto, categoria });
}

// Cotizaciones
function incrementQuoteRequested(categoriaServicio = 'general', estado = 'pendiente') {
  quotesRequested.inc({ categoria_servicio: categoriaServicio, estado });
}

// Servicios completados (función específica)
function incrementServiceCompletedDetailed(categoria = 'general', ubicacion = 'desconocida', calificacion = '0') {
  servicesCompleted.inc({ categoria, ubicacion, calificacion_promedio: calificacion });
}

// Engagement de usuario
function recordUserEngagement(tipoUsuario = 'cliente', accion = 'navegacion', duracionSegundos) {
  userEngagement.observe({ tipo_usuario: tipoUsuario, accion }, duracionSegundos);
}

// Tasa de conversión
function setConversionRate(fuente = 'directo', tipoConversion = 'registro', tasa) {
  conversionRate.set({ fuente, tipo_conversion: tipoConversion }, tasa);
}

// Ingresos
function incrementRevenue(tipoIngreso = 'comision', metodoPago = 'efectivo', monto) {
  revenueTotal.inc({ tipo_ingreso: tipoIngreso, metodo_pago: metodoPago }, monto);
}

// Usuarios activos
function setActiveUsers(count, rol = 'total') {
  activeUsers.set({ rol }, count);
}

function incrementActiveUsers(rol = 'cliente') {
  activeUsers.inc({ rol });
}

function decrementActiveUsers(rol = 'cliente') {
  activeUsers.dec({ rol });
}

// Funciones de métricas de búsqueda
function incrementSearchRequest(cached = false, hasFilters = false, hasLocation = false) {
  searchRequestsTotal.inc({ cached: cached.toString(), has_filters: hasFilters.toString(), has_location: hasLocation.toString() });
}

function recordSearchDuration(durationSeconds, cached = false, resultCount = 0) {
  searchDuration.observe({ cached: cached.toString(), result_count: resultCount.toString() }, durationSeconds);
}

function recordSearchResultsCount(count, hasFilters = false, hasLocation = false) {
  searchResultsCount.observe({ has_filters: hasFilters.toString(), has_location: hasLocation.toString() }, count);
}

function incrementAutocompleteRequest(type = 'all', resultCount = 0) {
  autocompleteRequestsTotal.inc({ type, result_count: resultCount.toString() });
}

function setCacheHitRatio(ratio, cacheType = 'redis') {
  cacheHitRatio.set({ cache_type: cacheType }, ratio);
}

// ===== FUNCIONES DE MÉTRICAS DE PAGOS =====

// Pagos procesados
function incrementPaymentProcessed(estado = 'aprobado', metodoPago = 'mercadopago', tipoServicio = 'general') {
  paymentsProcessedTotal.inc({ estado, metodo_pago: metodoPago, tipo_servicio: tipoServicio });
}

// Latencia de procesamiento de pagos
function recordPaymentProcessingDuration(tipoOperacion = 'create_preference', exito = true, durationSeconds) {
  paymentProcessingDuration.observe({ tipo_operacion: tipoOperacion, exito: exito.toString() }, durationSeconds);
}

// Pagos pendientes
function setPendingPayments(count, tipo = 'total') {
  pendingPayments.set({ tipo }, count);
}

function incrementPendingPayments(tipo = 'total') {
  pendingPayments.inc({ tipo });
}

function decrementPendingPayments(tipo = 'total') {
  pendingPayments.dec({ tipo });
}

// Comisiones calculadas
function incrementCommissionCalculated(tipoServicio = 'general', rangoPorcentaje = '5-10') {
  commissionsCalculatedTotal.inc({ tipo_servicio: tipoServicio, rango_porcentaje: rangoPorcentaje });
}

// Montos de pago
function recordPaymentAmount(monto, tipoPago = 'servicio') {
  paymentAmount.observe({ tipo_pago: tipoPago }, monto);
}

// Errores de pago
function incrementPaymentError(tipoError = 'general', componente = 'unknown') {
  paymentErrorsTotal.inc({ tipo_error: tipoError, componente });
}

// Fondos en custodia
function setEscrowFunds(monto, estado = 'total') {
  escrowFunds.set({ estado }, monto);
}

function incrementEscrowFunds(monto, estado = 'total') {
  escrowFunds.inc({ estado }, monto);
}

function decrementEscrowFunds(monto, estado = 'total') {
  escrowFunds.dec({ estado }, monto);
}

// Payouts procesados
function incrementPayoutProcessed(estado = 'completado', metodoPago = 'bank_transfer') {
  payoutsProcessedTotal.inc({ estado, metodo_pago: metodoPago });
}

// Latencia de liberación de fondos
function recordFundReleaseDuration(hours, automatico = true) {
  fundReleaseDuration.observe({ automatico: automatico.toString() }, hours);
}

// Webhooks procesados
function incrementWebhookProcessed(tipo = 'payment', estado = 'success', proveedor = 'mercadopago') {
  webhooksProcessedTotal.inc({ tipo, estado, proveedor });
}

// Throughput de pagos
function setPaymentThroughput(throughput, tipoOperacion = 'processed') {
  paymentThroughput.set({ tipo_operacion: tipoOperacion }, throughput);
}

/**
 * Middleware para medir duración de solicitudes HTTP
 */
function createHttpMetricsMiddleware() {
  return (req, res, next) => {
    const start = Date.now();

    // Cuando la respuesta termine
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // en segundos
      const method = req.method;
      const route = req.route ? req.route.path : req.path;
      const statusCode = res.statusCode.toString();

      // Registrar métricas
      httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
      httpRequestsTotal.inc({ method, route, status_code: statusCode });
    });

    next();
  };
}

/**
 * Obtener todas las métricas en formato Prometheus
 */
function getMetrics() {
  return promClient.register.metrics();
}

/**
 * Obtener registro de métricas para depuración
 */
function getRegistry() {
  return promClient.register;
}

/**
 * Limpiar todas las métricas (útil para pruebas)
 */
function clearMetrics() {
  promClient.register.clear();
}

module.exports = {
  initializeMetrics,
  createHttpMetricsMiddleware,
  getMetrics,
  getRegistry,
  clearMetrics,

  // Funciones de métricas
  incrementServiceScheduled,
  incrementServiceCompleted,
  incrementUserRegistered,
  incrementSmsSent,
  incrementBusinessError,
  incrementTripleImpactActivity,
  incrementQuoteRequested,
  incrementServiceCompletedDetailed,
  recordUserEngagement,
  setConversionRate,
  incrementRevenue,
  setActiveUsers,
  incrementActiveUsers,
  decrementActiveUsers,

  // Funciones de métricas de búsqueda
  incrementSearchRequest,
  recordSearchDuration,
  recordSearchResultsCount,
  incrementAutocompleteRequest,
  setCacheHitRatio,

  // Funciones de métricas de pagos
  incrementPaymentProcessed,
  recordPaymentProcessingDuration,
  setPendingPayments,
  incrementPendingPayments,
  decrementPendingPayments,
  incrementCommissionCalculated,
  recordPaymentAmount,
  incrementPaymentError,
  setEscrowFunds,
  incrementEscrowFunds,
  decrementEscrowFunds,
  incrementPayoutProcessed,
  recordFundReleaseDuration,
  incrementWebhookProcessed,
  setPaymentThroughput,

  // Objetos de métricas (para acceso directo si es necesario)
  servicesTotal,
  usersTotal,
  smsTotal,
  httpRequestDuration,
  httpRequestsTotal,
  activeUsers,
  businessErrorsTotal,
  tripleImpactActivities,
  quotesRequested,
  servicesCompleted,
  userEngagement,
  conversionRate,
  revenueTotal
};
