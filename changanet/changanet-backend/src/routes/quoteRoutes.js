// src/routes/quoteRoutes.js
/**
 * @archivo src/routes/quoteRoutes.js - Rutas de cotizaciones
 * @descripción Define endpoints REST para sistema de solicitudes de presupuesto (REQ-31, REQ-32, REQ-33, REQ-34, REQ-35)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Transparencia en precios y comparación de ofertas
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 * - Creación de cotizaciones con fotos adjuntas (REQ-31)
 * - Envío a múltiples profesionales preseleccionados (REQ-32)
 * - Sistema de respuestas con precios y comentarios (REQ-33)
 * - Vista de comparación de ofertas (REQ-34)
 * - Notificaciones automáticas por email y push (REQ-35)
 *
 * CONFIGURACIÓN MULTER:
 * - Límite de archivo: 5MB por imagen
 * - Hasta 5 fotos por cotización
 * - Solo archivos de imagen permitidos
 * - Almacenamiento en Cloudinary
 *
 * ENDPOINTS:
 * POST /api/quotes - Crear cotización con fotos (cliente, multipart/form-data)
 * GET /api/quotes/professional - Ver cotizaciones pendientes (profesional)
 * GET /api/quotes/client - Ver cotizaciones enviadas (cliente)
 * POST /api/quotes/respond - Responder a cotización (profesional)
 * GET /api/quotes/client/:quoteId/compare - Comparar ofertas (cliente)
 */

const express = require('express');
const multer = require('multer');
const { createQuoteRequest, getQuotesForProfessional, respondToQuote, getClientQuotes, compareQuotes } = require('../controllers/quoteController');
const { authenticateToken } = require('../middleware/authenticate');

// Configuración de multer para fotos de cotizaciones
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @ruta POST / - Crear solicitud de cotización
 * @descripción Permite a clientes crear solicitudes de presupuesto para profesionales (REQ-31)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Conexión eficiente entre demanda y oferta de servicios
 */
router.post('/', upload.array('fotos', 5), createQuoteRequest); // Hasta 5 fotos
router.post('/request', upload.array('fotos', 5), createQuoteRequest); // Alias para compatibilidad

/**
 * @ruta GET /professional - Obtener cotizaciones para profesional
 * @descripción Lista solicitudes de presupuesto pendientes para el profesional (REQ-32)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Acceso a oportunidades de trabajo para profesionales
 */
router.get('/professional', getQuotesForProfessional);

/**
 * @ruta GET /client - Obtener cotizaciones del cliente
 * @descripción Lista todas las cotizaciones enviadas por el cliente (REQ-34)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Social: Seguimiento transparente de solicitudes enviadas
 */
router.get('/client', getClientQuotes);

/**
 * @ruta POST /respond - Responder a cotización
 * @descripción Permite a profesionales aceptar o rechazar solicitudes de presupuesto (REQ-33)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Negociación directa y eficiente de precios
 */
router.post('/respond', respondToQuote);

// Obtener servicios para cliente
router.get('/client/services', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const { id: clientId } = req.user;
  try {
    const services = await prisma.servicios.findMany({
      where: { cliente_id: clientId },
      include: {
        profesional: { select: { nombre: true } }
        // servicio_recurrente: true // Commented out due to schema mismatch
      },
      orderBy: { creado_en: 'desc' }
    });
    res.status(200).json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener servicios.' });
  }
});

/**
 * @ruta GET /client/:quoteId/compare - Comparar ofertas de una cotización
 * @descripción Proporciona vista detallada para comparar ofertas (REQ-34)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @impacto Social: Toma de decisiones informada para consumidores
 */
router.get('/client/:quoteId/compare', compareQuotes);

// Obtener servicios para profesional
router.get('/professional/services', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const { id: professionalId } = req.user;
  try {
    const services = await prisma.servicios.findMany({
      where: { profesional_id: professionalId },
      include: {
        cliente: { select: { nombre: true } }
        // servicio_recurrente: true // Commented out due to schema mismatch
      },
      orderBy: { creado_en: 'desc' }
    });
    res.status(200).json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener servicios.' });
  }
});

module.exports = router;
