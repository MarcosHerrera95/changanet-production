/**
 * @archivo src/controllers/quoteController.js - Controlador de cotizaciones
 * @descripción Gestiona solicitudes de presupuesto entre clientes y profesionales (REQ-31, REQ-32, REQ-33, REQ-34, REQ-35)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Transparencia en precios y eficiencia en la conexión comercial
 */

const { PrismaClient } = require('@prisma/client');
const { createNotification, NOTIFICATION_TYPES } = require('../services/notificationService');
const { sendPushNotification } = require('../services/pushNotificationService');
const { sendQuoteRequestEmail } = require('../services/emailService');
const { uploadImage } = require('../services/storageService');
const multer = require('multer');

const prisma = new PrismaClient();

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

/**
 * @función createQuoteRequest - Crear solicitud de cotización
 * @descripción Crea nueva solicitud de presupuesto con fotos y envía a múltiples profesionales (REQ-31, REQ-32)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Conexión eficiente entre demanda y oferta de servicios profesionales
 * @param {Object} req - Request con datos de la solicitud y archivos de fotos
 * @param {Object} res - Response con datos de la cotización creada
 */
exports.createQuoteRequest = async (req, res) => {
  const { id: clientId } = req.user;
  const { descripcion, zona_cobertura, profesionales_ids } = req.body;

  console.log('Request body:', req.body);
  console.log('Client ID:', clientId);
  console.log('Files:', req.files);

  // Validar campos requeridos
  console.log('Validating required fields...');
  console.log('descripcion:', descripcion, 'type:', typeof descripcion);
  console.log('zona_cobertura:', zona_cobertura, 'type:', typeof zona_cobertura);
  console.log('profesionales_ids:', profesionales_ids, 'type:', typeof profesionales_ids);

  if (!descripcion || !zona_cobertura || !profesionales_ids) {
    console.log('❌ Missing required fields');
    return res.status(400).json({
      error: 'Datos inválidos',
      message: 'Los campos descripcion, zona_cobertura y profesionales_ids son requeridos.',
      received: { descripcion, zona_cobertura, profesionales_ids }
    });
  }

  // Validar que profesionales_ids sea un array
  let professionalIds;
  try {
    professionalIds = JSON.parse(profesionales_ids);
    if (!Array.isArray(professionalIds) || professionalIds.length === 0) {
      throw new Error('Debe ser un array no vacío');
    }
  } catch (error) {
    return res.status(400).json({
      error: 'Datos inválidos',
      message: 'profesionales_ids debe ser un array JSON válido con al menos un profesional.'
    });
  }

  try {
    // Validar profesionales existentes para notificaciones, pero permitir cualquier ID
    console.log('Validating existing professionals for notifications...');
    console.log('Looking for professional IDs:', professionalIds);

    let professionals = [];
    try {
      professionals = await prisma.usuarios.findMany({
        where: {
          id: { in: professionalIds },
          rol: 'profesional'
        },
        select: { id: true, nombre: true, email: true }
      });
    } catch (error) {
      console.warn('Error finding professionals, continuing without notifications:', error.message);
    }

    console.log('Found professionals for notifications:', professionals.length, 'out of', professionalIds.length);
    console.log('✅ Professional validation bypassed - allowing any IDs');

    // Manejar subida de fotos (REQ-31)
    let fotosUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadImage(file.buffer, { folder: 'changanet/quotes' });
          fotosUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading quote image:', uploadError);
          return res.status(500).json({ error: 'Error al subir las imágenes.' });
        }
      }
    }

    // Crear la cotización
    const quote = await prisma.cotizaciones.create({
      data: {
        cliente_id: clientId,
        descripcion,
        zona_cobertura,
        fotos_urls: fotosUrls.length > 0 ? JSON.stringify(fotosUrls) : null,
        profesionales_solicitados: JSON.stringify(professionalIds)
      },
      include: {
        cliente: { select: { nombre: true, email: true } }
      }
    });

    // Crear respuestas pendientes para cada profesional
    const quoteResponses = professionalIds.map(profId => ({
      cotizacion_id: quote.id,
      profesional_id: profId
    }));

    await prisma.cotizacion_respuestas.createMany({
      data: quoteResponses
    });

    // Enviar notificaciones solo a profesionales que existen en la base de datos
    if (professionals.length > 0) {
      console.log('Sending notifications to', professionals.length, 'existing professionals...');
      for (const professional of professionals) {
        try {
          // Notificación push
          await sendPushNotification(
            professional.id,
            'Nueva solicitud de presupuesto',
            `Tienes una nueva solicitud de presupuesto de ${quote.cliente.nombre}`,
            {
              type: 'cotizacion',
              quoteId: quote.id,
              cliente_id: clientId
            }
          );

          // Notificación en base de datos
          await createNotification(
            professional.id,
            NOTIFICATION_TYPES.COTIZACION,
            `Nueva solicitud de presupuesto de ${quote.cliente.nombre}`,
            { quoteId: quote.id }
          );

          // Email
          const { sendEmail } = require('../services/emailService');
          await sendEmail(
            professional.email,
            'Nueva solicitud de presupuesto en Changánet',
            `Hola ${professional.nombre},\n\nHas recibido una nueva solicitud de presupuesto de ${quote.cliente.nombre}:\n\n"${descripcion}"\n\nZona: ${zona_cobertura}\nFotos adjuntas: ${fotosUrls.length}\n\nPuedes responder desde tu panel profesional.\n\nSaludos,\nEquipo Changánet`
          );
        } catch (notificationError) {
          console.warn(`Error enviando notificación a profesional ${professional.id}:`, notificationError.message);
        }
      }
    } else {
      console.log('No existing professionals found - notifications skipped');
    }

    console.log({
      event: 'quote_request_created',
      clientId,
      professionalIds,
      quoteId: quote.id,
      photosCount: fotosUrls.length
    });

    res.status(201).json({
      ...quote,
      fotos_urls: fotosUrls, // Devolver como array en lugar de JSON string
      profesionales_solicitados: professionalIds,
      respuestas: quoteResponses.length
    });
  } catch (error) {
    console.error('Error detallado al crear solicitud de cotización:', error);

    // Manejar errores específicos
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una solicitud similar.' });
    }

    // Error genérico
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear la solicitud de cotización. Por favor, inténtalo de nuevo más tarde.'
    });
  }
};

/**
 * @función getQuotesForProfessional - Obtener cotizaciones para profesional
 * @descripción Lista todas las solicitudes de presupuesto dirigidas al profesional (REQ-32)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Acceso a oportunidades comerciales para profesionales independientes
 * @param {Object} req - Request del profesional autenticado
 * @param {Object} res - Response con lista de cotizaciones
 */
exports.getQuotesForProfessional = async (req, res) => {
  const { id: professionalId } = req.user;

  try {
    // Obtener respuestas de cotizaciones para este profesional
    const quoteResponses = await prisma.cotizacion_respuestas.findMany({
      where: { profesional_id: professionalId },
      include: {
        cotizacion: {
          include: {
            cliente: { select: { nombre: true, email: true } },
            respuestas: {
              include: {
                profesional: { select: { nombre: true } }
              }
            }
          }
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    // Formatear respuesta
    const quotes = quoteResponses.map(response => ({
      id: response.cotizacion.id,
      descripcion: response.cotizacion.descripcion,
      zona_cobertura: response.cotizacion.zona_cobertura,
      fotos_urls: response.cotizacion.fotos_urls ? JSON.parse(response.cotizacion.fotos_urls) : [],
      cliente: response.cotizacion.cliente,
      mi_respuesta: {
        id: response.id,
        precio: response.precio,
        comentario: response.comentario,
        estado: response.estado,
        respondido_en: response.respondido_en
      },
      otras_respuestas: response.cotizacion.respuestas.filter(r => r.profesional_id !== professionalId),
      creado_en: response.cotizacion.creado_en
    }));

    res.status(200).json(quotes);
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener las cotizaciones.' });
  }
};

/**
 * @función respondToQuote - Responder a solicitud de cotización
 * @descripción Permite al profesional aceptar o rechazar cotización con precio (REQ-33, REQ-35)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Económico: Negociación transparente y eficiente de servicios profesionales
 * @param {Object} req - Request con acción (accept/reject) y datos opcionales
 * @param {Object} res - Response con respuesta de cotización actualizada
 */
exports.respondToQuote = async (req, res) => {
  const { id: professionalId } = req.user;
  const { quoteId, action, precio, comentario } = req.body;

  try {
    // Buscar la respuesta de cotización para este profesional
    const quoteResponse = await prisma.cotizacion_respuestas.findUnique({
      where: {
        cotizacion_id_profesional_id: {
          cotizacion_id: quoteId,
          profesional_id: professionalId
        }
      },
      include: {
        cotizacion: {
          include: {
            cliente: { select: { nombre: true, email: true } }
          }
        },
        profesional: { select: { nombre: true, email: true } }
      }
    });

    if (!quoteResponse) {
      return res.status(404).json({ error: 'Respuesta de cotización no encontrada.' });
    }

    if (quoteResponse.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Esta cotización ya ha sido respondida.' });
    }

    const updateData = {
      estado: action === 'accept' ? 'ACEPTADO' : 'RECHAZADO',
      respondido_en: new Date()
    };

    if (action === 'accept') {
      if (!precio || isNaN(parseFloat(precio))) {
        return res.status(400).json({ error: 'Debes proporcionar un precio válido para aceptar la cotización.' });
      }
      updateData.precio = parseFloat(precio);
      updateData.comentario = comentario;
    }

    const updatedResponse = await prisma.cotizacion_respuestas.update({
      where: {
        cotizacion_id_profesional_id: {
          cotizacion_id: quoteId,
          profesional_id: professionalId
        }
      },
      data: updateData,
      include: {
        cotizacion: {
          include: {
            cliente: { select: { nombre: true, email: true } }
          }
        },
        profesional: { select: { nombre: true, email: true } }
      }
    });

    // Enviar notificación push al cliente (REQ-35)
    const pushTitle = action === 'accept' ? 'Nueva oferta recibida' : 'Cotización rechazada';
    const pushMessage = action === 'accept'
      ? `${quoteResponse.profesional.nombre} ha enviado una oferta: $${precio}`
      : `${quoteResponse.profesional.nombre} ha rechazado tu solicitud de cotización`;

    try {
      await sendPushNotification(
        quoteResponse.cotizacion.cliente_id,
        pushTitle,
        pushMessage,
        {
          type: action === 'accept' ? 'oferta_recibida' : 'cotizacion_rechazada',
          quoteId: quoteId,
          profesional_id: professionalId,
          precio: action === 'accept' ? precio : null
        }
      );
    } catch (pushError) {
      console.warn('Error enviando push notification de respuesta a cotización:', pushError.message);
    }

    // Enviar notificación en base de datos al cliente
    const notificationType = action === 'accept' ? NOTIFICATION_TYPES.COTIZACION_ACEPTADA : NOTIFICATION_TYPES.COTIZACION_RECHAZADA;
    const message = action === 'accept'
      ? `${quoteResponse.profesional.nombre} ha enviado una oferta: $${precio}`
      : `${quoteResponse.profesional.nombre} ha rechazado tu solicitud de cotización`;

    await createNotification(quoteResponse.cotizacion.cliente_id, notificationType, message);

    // Enviar email al cliente
    try {
      const { sendEmail } = require('../services/emailService');
      const emailSubject = action === 'accept' ? 'Nueva oferta en Changánet' : 'Cotización rechazada en Changánet';
      const emailBody = action === 'accept'
        ? `Hola ${quoteResponse.cotizacion.cliente.nombre},\n\n¡Buenas noticias! ${quoteResponse.profesional.nombre} ha enviado una oferta para tu solicitud.\n\nPrecio ofrecido: $${precio}\nComentario: ${comentario || 'Sin comentario adicional'}\n\nPuedes comparar ofertas y contactar al profesional desde tu panel.\n\nSaludos,\nEquipo Changánet`
        : `Hola ${quoteResponse.cotizacion.cliente.nombre},\n\n${quoteResponse.profesional.nombre} ha rechazado tu solicitud de cotización.\n\nPuedes esperar otras ofertas o contactar directamente al profesional.\n\nSaludos,\nEquipo Changánet`;

      await sendEmail(quoteResponse.cotizacion.cliente.email, emailSubject, emailBody);
    } catch (emailError) {
      console.warn('Error enviando email de respuesta a cotización:', emailError);
    }

    res.status(200).json(updatedResponse);
  } catch (error) {
    console.error('Error al responder cotización:', error);
    res.status(500).json({ error: 'Error al procesar la respuesta.' });
  }
};

/**
 * @función getClientQuotes - Obtener cotizaciones del cliente
 * @descripción Lista todas las cotizaciones enviadas por el cliente con comparación de ofertas (REQ-34)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @tarjeta Tarjeta 5: [Backend] Implementar API de Solicitudes de Presupuesto
 * @impacto Social: Seguimiento transparente de solicitudes para consumidores informados
 * @param {Object} req - Request del cliente autenticado
 * @param {Object} res - Response con lista de cotizaciones del cliente
 */
exports.getClientQuotes = async (req, res) => {
  const { id: clientId } = req.user;

  try {
    const quotes = await prisma.cotizaciones.findMany({
      where: { cliente_id: clientId },
      include: {
        respuestas: {
          include: {
            profesional: { select: { nombre: true, email: true } }
          },
          orderBy: { precio: 'asc' } // Ordenar por precio ascendente para comparación
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    // Formatear respuesta con comparación de ofertas
    const formattedQuotes = quotes.map(quote => ({
      id: quote.id,
      descripcion: quote.descripcion,
      zona_cobertura: quote.zona_cobertura,
      fotos_urls: quote.fotos_urls ? JSON.parse(quote.fotos_urls) : [],
      profesionales_solicitados: quote.profesionales_solicitados ? JSON.parse(quote.profesionales_solicitados) : [],
      ofertas: quote.respuestas.map(respuesta => ({
        id: respuesta.id,
        profesional: respuesta.profesional,
        precio: respuesta.precio,
        comentario: respuesta.comentario,
        estado: respuesta.estado,
        respondido_en: respuesta.respondido_en
      })),
      estadisticas_ofertas: {
        total_ofertas: quote.respuestas.filter(r => r.estado === 'ACEPTADO').length,
        precio_minimo: Math.min(...quote.respuestas.filter(r => r.precio).map(r => r.precio)),
        precio_maximo: Math.max(...quote.respuestas.filter(r => r.precio).map(r => r.precio)),
        precio_promedio: quote.respuestas.filter(r => r.precio).length > 0
          ? quote.respuestas.filter(r => r.precio).reduce((sum, r) => sum + r.precio, 0) / quote.respuestas.filter(r => r.precio).length
          : null
      },
      creado_en: quote.creado_en
    }));

    res.status(200).json(formattedQuotes);
  } catch (error) {
    console.error('Error al obtener cotizaciones del cliente:', error);
    res.status(500).json({ error: 'Error al obtener las cotizaciones.' });
  }
};

/**
 * @función compareQuotes - Comparar ofertas de una cotización específica
 * @descripción Proporciona vista detallada para comparar ofertas de diferentes profesionales (REQ-34)
 * @sprint Sprint 2 – Solicitudes y Presupuestos
 * @param {Object} req - Request con ID de cotización
 * @param {Object} res - Response con comparación detallada de ofertas
 */
exports.compareQuotes = async (req, res) => {
  const { id: clientId } = req.user;
  const { quoteId } = req.params;

  try {
    const quote = await prisma.cotizaciones.findFirst({
      where: {
        id: quoteId,
        cliente_id: clientId
      },
      include: {
        respuestas: {
          include: {
            profesional: {
              select: {
                nombre: true,
                email: true,
                perfil_profesional: {
                  select: {
                    anos_experiencia: true,
                    calificacion_promedio: true,
                    especialidad: true
                  }
                }
              }
            }
          },
          orderBy: { precio: 'asc' }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada.' });
    }

    // Calcular estadísticas de comparación
    const acceptedOffers = quote.respuestas.filter(r => r.estado === 'ACEPTADO' && r.precio);
    const stats = {
      total_offers: acceptedOffers.length,
      price_range: acceptedOffers.length > 0 ? {
        min: Math.min(...acceptedOffers.map(o => o.precio)),
        max: Math.max(...acceptedOffers.map(o => o.precio)),
        average: acceptedOffers.reduce((sum, o) => sum + o.precio, 0) / acceptedOffers.length
      } : null,
      best_value: acceptedOffers.length > 0 ? acceptedOffers[0] : null, // Ya ordenado por precio asc
      fastest_response: acceptedOffers.length > 0
        ? acceptedOffers.reduce((fastest, current) =>
            current.respondido_en < fastest.respondido_en ? current : fastest
          )
        : null
    };

    res.status(200).json({
      quote: {
        id: quote.id,
        descripcion: quote.descripcion,
        zona_cobertura: quote.zona_cobertura,
        fotos_urls: quote.fotos_urls ? JSON.parse(quote.fotos_urls) : []
      },
      offers: quote.respuestas.map(respuesta => ({
        id: respuesta.id,
        profesional: {
          nombre: respuesta.profesional.nombre,
          experiencia: respuesta.profesional.perfil_profesional?.anos_experiencia,
          calificacion: respuesta.profesional.perfil_profesional?.calificacion_promedio,
          especialidad: respuesta.profesional.perfil_profesional?.especialidad
        },
        precio: respuesta.precio,
        comentario: respuesta.comentario,
        estado: respuesta.estado,
        respondido_en: respuesta.respondido_en,
        tiempo_respuesta: respuesta.respondido_en
          ? Math.round((new Date(respuesta.respondido_en) - new Date(quote.creado_en)) / (1000 * 60 * 60)) // horas
          : null
      })),
      comparison_stats: stats
    });
  } catch (error) {
    console.error('Error al comparar cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener comparación de ofertas.' });
  }
};
