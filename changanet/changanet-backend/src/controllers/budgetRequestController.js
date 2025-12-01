/**
 * @archivo src/controllers/budgetRequestController.js - Controlador de Solicitudes de Presupuestos
 * @descripción Gestiona solicitudes de presupuesto entre clientes y profesionales
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Sistema completo de solicitudes de presupuestos con distribución automática
 */

const { PrismaClient } = require('@prisma/client');
const { createNotification, NOTIFICATION_TYPES } = require('../services/notificationService');
const { sendPushNotification } = require('../services/pushNotificationService');
const { sendQuoteRequestEmail } = require('../services/emailService');
const { uploadImage } = require('../services/storageService');
const validationService = require('../services/validationService');

const prisma = new PrismaClient();

/**
 * @función createBudgetRequest - Crear solicitud de presupuesto
 * @descripción Crea nueva solicitud de presupuesto con fotos y distribución automática
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Conexión eficiente entre demanda y oferta de servicios profesionales
 * @param {Object} req - Request con datos de la solicitud y archivos de fotos
 * @param {Object} res - Response con datos de la solicitud creada
 */
exports.createBudgetRequest = async (req, res) => {
  const { id: clientId } = req.user;
  const { descripcion, zona_cobertura, especialidad, presupuesto_estimado } = req.body;

  console.log('Request body:', req.body);
  console.log('Client ID:', clientId);
  console.log('Files:', req.files);

  // Validar y sanitizar descripción
  const descValidation = validationService.validateComment(descripcion);
  if (!descValidation.isValid) {
    return res.status(400).json({
      error: 'Descripción inválida',
      message: descValidation.reason
    });
  }

  // Validar campos requeridos
  if (!descValidation.comment || !zona_cobertura || !especialidad) {
    return res.status(400).json({
      error: 'Datos inválidos',
      message: 'Los campos descripcion, zona_cobertura y especialidad son requeridos.',
      received: { descripcion: descValidation.comment, zona_cobertura, especialidad }
    });
  }

  // Validar zona de cobertura (sanitizar)
  const zonaValidation = validationService.validateComment(zona_cobertura);
  if (!zonaValidation.isValid || !zonaValidation.comment) {
    return res.status(400).json({
      error: 'Zona de cobertura inválida',
      message: zonaValidation.reason || 'La zona de cobertura es requerida'
    });
  }

  // Validar especialidad (sanitizar)
  const especialidadValidation = validationService.validateComment(especialidad);
  if (!especialidadValidation.isValid || !especialidadValidation.comment) {
    return res.status(400).json({
      error: 'Especialidad inválida',
      message: especialidadValidation.reason || 'La especialidad es requerida'
    });
  }

  // Usar datos sanitizados
  const sanitizedDescripcion = descValidation.comment;
  const sanitizedZona = zonaValidation.comment;
  const sanitizedEspecialidad = especialidadValidation.comment;

  try {
    // Manejar subida de fotos
    const fotosUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadImage(file.buffer, { folder: 'changanet/budget-requests' });
          fotosUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error('Error uploading budget request image:', uploadError);
          return res.status(500).json({ error: 'Error al subir las imágenes.' });
        }
      }
    }

    // Crear la solicitud de presupuesto
    const budgetRequest = await prisma.cotizaciones.create({
      data: {
        cliente_id: clientId,
        descripcion: sanitizedDescripcion,
        zona_cobertura: sanitizedZona,
        fotos_urls: fotosUrls.length > 0 ? JSON.stringify(fotosUrls) : null,
        // Nota: profesionales_solicitados se llenará con la distribución automática
      },
      include: {
        cliente: { select: { nombre: true, email: true } }
      }
    });

    // Distribución automática: encontrar profesionales calificados
    const professionals = await prisma.perfiles_profesionales.findMany({
      where: {
        especialidad: sanitizedEspecialidad,
        zona_cobertura: zona_cobertura,
        esta_disponible: true,
        usuario: {
          esta_verificado: true,
          bloqueado: false,
          rol: 'profesional'
        }
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            fcm_token: true
          }
        }
      },
      orderBy: [
        { calificacion_promedio: 'desc' },
        { anos_experiencia: 'desc' }
      ],
      take: 10 // Limitar a 10 profesionales para distribución inicial
    });

    // Validar profesionales encontrados
    if (professionals.length === 0) {
      console.warn('No se encontraron profesionales calificados para la distribución automática');
    }

    // Crear respuestas pendientes para cada profesional encontrado
    const professionalIds = professionals.map(p => p.usuario_id);
    const quoteResponses = professionalIds.map(profId => ({
      cotizacion_id: budgetRequest.id,
      profesional_id: profId
    }));

    if (quoteResponses.length > 0) {
      await prisma.cotizacion_respuestas.createMany({
        data: quoteResponses
      });

      // Actualizar la solicitud con los profesionales seleccionados
      await prisma.cotizaciones.update({
        where: { id: budgetRequest.id },
        data: {
          profesionales_solicitados: JSON.stringify(professionalIds)
        }
      });
    }

    // Enviar notificaciones a profesionales
    for (const professional of professionals) {
      try {
        // Notificación push
        await sendPushNotification(
          professional.usuario.id,
          'Nueva solicitud de presupuesto',
          `Tienes una nueva solicitud de presupuesto de ${budgetRequest.cliente.nombre}`,
          {
            type: 'budget_request',
            requestId: budgetRequest.id,
            cliente_id: clientId
          }
        );

        // Notificación en base de datos
        await createNotification(
          professional.usuario.id,
          NOTIFICATION_TYPES.COTIZACION,
          `Nueva solicitud de presupuesto de ${budgetRequest.cliente.nombre}`,
          { requestId: budgetRequest.id }
        );

        // Email
        const { sendEmail } = require('../services/emailService');
        await sendEmail(
          professional.usuario.email,
          'Nueva solicitud de presupuesto en Changánet',
          `Hola ${professional.usuario.nombre},\n\nHas recibido una nueva solicitud de presupuesto:\n\n"${descripcion}"\n\nZona: ${zona_cobertura}\nEspecialidad: ${especialidad}\nPresupuesto estimado: ${presupuesto_estimado || 'No especificado'}\nFotos adjuntas: ${fotosUrls.length}\n\nPuedes responder desde tu panel profesional.\n\nSaludos,\nEquipo Changánet`
        );
      } catch (notificationError) {
        console.warn(`Error enviando notificación a profesional ${professional.usuario.id}:`, notificationError.message);
      }
    }

    console.log({
      event: 'budget_request_created',
      clientId,
      professionalIds,
      requestId: budgetRequest.id,
      photosCount: fotosUrls.length
    });

    res.status(201).json({
      ...budgetRequest,
      fotos_urls: fotosUrls,
      profesionales_solicitados: professionalIds,
      respuestas_pendientes: quoteResponses.length
    });
  } catch (error) {
    console.error('Error detallado al crear solicitud de presupuesto:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una solicitud similar.' });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear la solicitud de presupuesto. Por favor, inténtalo de nuevo más tarde.'
    });
  }
};

/**
 * @función getClientBudgetRequests - Obtener solicitudes del cliente
 * @descripción Lista todas las solicitudes de presupuesto enviadas por el cliente
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Social: Seguimiento transparente de solicitudes enviadas
 * @param {Object} req - Request del cliente autenticado
 * @param {Object} res - Response con lista de solicitudes
 */
exports.getClientBudgetRequests = async (req, res) => {
  const { clientId } = req.params;
  const { id: userId } = req.user;

  // Verificar que el usuario solo pueda ver sus propias solicitudes
  if (clientId !== userId) {
    return res.status(403).json({ error: 'No tienes permiso para ver estas solicitudes.' });
  }

  try {
    const requests = await prisma.cotizaciones.findMany({
      where: { cliente_id: clientId },
      include: {
        respuestas: {
          include: {
            profesional: {
              select: {
                nombre: true,
                email: true,
                perfil_profesional: {
                  select: {
                    especialidad: true,
                    calificacion_promedio: true,
                    anos_experiencia: true
                  }
                }
              }
            }
          },
          orderBy: { precio: 'asc' }
        }
      },
      orderBy: { creado_en: 'desc' }
    });

    // Formatear respuesta
    const formattedRequests = requests.map(request => ({
      id: request.id,
      descripcion: request.descripcion,
      zona_cobertura: request.zona_cobertura,
      fotos_urls: request.fotos_urls ? JSON.parse(request.fotos_urls) : [],
      profesionales_solicitados: request.profesionales_solicitados ? JSON.parse(request.profesionales_solicitados) : [],
      ofertas: request.respuestas.map(respuesta => ({
        id: respuesta.id,
        profesional: {
          nombre: respuesta.profesional.nombre,
          especialidad: respuesta.profesional.perfil_profesional?.especialidad,
          calificacion: respuesta.profesional.perfil_profesional?.calificacion_promedio,
          experiencia: respuesta.profesional.perfil_profesional?.anos_experiencia
        },
        precio: respuesta.precio,
        comentario: respuesta.comentario,
        estado: respuesta.estado,
        respondido_en: respuesta.respondido_en
      })),
      estadisticas_ofertas: {
        total_ofertas: request.respuestas.filter(r => r.estado === 'ACEPTADO').length,
        precio_minimo: request.respuestas.filter(r => r.precio).length > 0
          ? Math.min(...request.respuestas.filter(r => r.precio).map(r => r.precio))
          : null,
        precio_maximo: request.respuestas.filter(r => r.precio).length > 0
          ? Math.max(...request.respuestas.filter(r => r.precio).map(r => r.precio))
          : null,
        precio_promedio: request.respuestas.filter(r => r.precio).length > 0
          ? request.respuestas.filter(r => r.precio).reduce((sum, r) => sum + r.precio, 0) / request.respuestas.filter(r => r.precio).length
          : null
      },
      creado_en: request.creado_en
    }));

    res.status(200).json(formattedRequests);
  } catch (error) {
    console.error('Error al obtener solicitudes del cliente:', error);
    res.status(500).json({ error: 'Error al obtener las solicitudes.' });
  }
};

/**
 * @función getBudgetRequestOffers - Obtener ofertas para una solicitud específica
 * @descripción Proporciona vista detallada de todas las ofertas para una solicitud
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Social: Toma de decisiones informada para consumidores
 * @param {Object} req - Request con ID de solicitud
 * @param {Object} res - Response con ofertas detalladas
 */
exports.getBudgetRequestOffers = async (req, res) => {
  const { id: requestId } = req.params;
  const { id: userId } = req.user;

  try {
    // Verificar que la solicitud pertenece al usuario
    const request = await prisma.cotizaciones.findFirst({
      where: {
        id: requestId,
        cliente_id: userId
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada o no tienes acceso.' });
    }

    const offers = await prisma.cotizacion_respuestas.findMany({
      where: { cotizacion_id: requestId },
      include: {
        profesional: {
          select: {
            nombre: true,
            email: true,
            perfil_profesional: {
              select: {
                especialidad: true,
                calificacion_promedio: true,
                anos_experiencia: true,
                descripcion: true
              }
            }
          }
        }
      },
      orderBy: { precio: 'asc' }
    });

    // Calcular estadísticas
    const acceptedOffers = offers.filter(o => o.estado === 'ACEPTADO' && o.precio);
    const stats = {
      total_offers: acceptedOffers.length,
      price_range: acceptedOffers.length > 0 ? {
        min: Math.min(...acceptedOffers.map(o => o.precio)),
        max: Math.max(...acceptedOffers.map(o => o.precio)),
        average: acceptedOffers.reduce((sum, o) => sum + o.precio, 0) / acceptedOffers.length
      } : null,
      best_value: acceptedOffers.length > 0 ? acceptedOffers[0] : null,
      fastest_response: acceptedOffers.length > 0
        ? acceptedOffers.reduce((fastest, current) =>
            current.respondido_en < fastest.respondido_en ? current : fastest
          )
        : null
    };

    res.status(200).json({
      request: {
        id: request.id,
        descripcion: request.descripcion,
        zona_cobertura: request.zona_cobertura,
        fotos_urls: request.fotos_urls ? JSON.parse(request.fotos_urls) : []
      },
      offers: offers.map(offer => ({
        id: offer.id,
        profesional: {
          nombre: offer.profesional.nombre,
          especialidad: offer.profesional.perfil_profesional?.especialidad,
          experiencia: offer.profesional.perfil_profesional?.anos_experiencia,
          calificacion: offer.profesional.perfil_profesional?.calificacion_promedio,
          descripcion: offer.profesional.perfil_profesional?.descripcion
        },
        precio: offer.precio,
        comentario: offer.comentario,
        estado: offer.estado,
        respondido_en: offer.respondido_en,
        tiempo_respuesta: offer.respondido_en
          ? Math.round((new Date(offer.respondido_en) - new Date(request.creado_en)) / (1000 * 60 * 60))
          : null
      })),
      comparison_stats: stats
    });
  } catch (error) {
    console.error('Error al obtener ofertas:', error);
    res.status(500).json({ error: 'Error al obtener las ofertas.' });
  }
};

/**
 * @función getProfessionalInbox - Obtener bandeja de entrada del profesional
 * @descripción Lista solicitudes de presupuesto pendientes para el profesional
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Acceso a oportunidades de trabajo para profesionales
 * @param {Object} req - Request del profesional autenticado
 * @param {Object} res - Response con solicitudes pendientes
 */
exports.getProfessionalInbox = async (req, res) => {
  const { professionalId } = req.params;
  const { id: userId } = req.user;

  // Verificar que el usuario solo pueda ver su propia bandeja
  if (professionalId !== userId) {
    return res.status(403).json({ error: 'No tienes permiso para ver esta bandeja.' });
  }

  try {
    const responses = await prisma.cotizacion_respuestas.findMany({
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

    const requests = responses.map(response => ({
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

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error al obtener bandeja del profesional:', error);
    res.status(500).json({ error: 'Error al obtener la bandeja.' });
  }
};

/**
 * @función createOffer - Crear oferta para una solicitud
 * @descripción Permite a profesionales enviar ofertas con precios y comentarios
 * @sprint Sprint de Solicitudes de Presupuestos
 * @tarjeta Implementar backend completo para módulo de Solicitudes de Presupuestos
 * @impacto Económico: Negociación directa y eficiente de precios
 * @param {Object} req - Request con datos de la oferta
 * @param {Object} res - Response con oferta creada
 */
exports.createOffer = async (req, res) => {
  const { id: professionalId } = req.user;
  const { id: requestId } = req.params;
  const { precio, comentario } = req.body;

  // Validar y sanitizar comentario si existe
  let sanitizedComentario = null;
  if (comentario) {
    const commentValidation = validationService.validateComment(comentario);
    if (!commentValidation.isValid) {
      return res.status(400).json({
        error: 'Comentario inválido',
        message: commentValidation.reason
      });
    }
    sanitizedComentario = commentValidation.comment;
  }

  try {
    // Validar que el usuario es un profesional verificado
    const professionalProfile = await prisma.perfiles_profesionales.findUnique({
      where: { usuario_id: professionalId },
      include: {
        usuario: {
          select: {
            rol: true,
            esta_verificado: true,
            bloqueado: true
          }
        }
      }
    });

    if (!professionalProfile) {
      return res.status(403).json({ error: 'Perfil profesional no encontrado.' });
    }

    if (professionalProfile.usuario.rol !== 'profesional') {
      return res.status(403).json({ error: 'Solo los profesionales pueden enviar ofertas.' });
    }

    if (!professionalProfile.usuario.esta_verificado) {
      return res.status(403).json({ error: 'Debes estar verificado para enviar ofertas.' });
    }

    if (professionalProfile.usuario.bloqueado) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada.' });
    }

    if (!professionalProfile.esta_disponible) {
      return res.status(403).json({ error: 'Tu perfil no está disponible actualmente.' });
    }

    // Verificar que la solicitud existe y el profesional puede responder
    const response = await prisma.cotizacion_respuestas.findUnique({
      where: {
        cotizacion_id_profesional_id: {
          cotizacion_id: requestId,
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

    if (!response) {
      return res.status(404).json({ error: 'Solicitud no encontrada o no tienes acceso.' });
    }

    // Validar que el profesional está calificado para esta solicitud
    // (especialidad y zona coinciden)
    const request = response.cotizacion;
    const parsedProfesionales = request.profesionales_solicitados ? JSON.parse(request.profesionales_solicitados) : [];

    if (!parsedProfesionales.includes(professionalId)) {
      return res.status(403).json({ error: 'No estás autorizado para responder esta solicitud.' });
    }

    if (response.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Esta solicitud ya ha sido respondida.' });
    }

    if (!precio || isNaN(parseFloat(precio))) {
      return res.status(400).json({ error: 'Debes proporcionar un precio válido.' });
    }

    // Actualizar la respuesta
    const updatedResponse = await prisma.cotizacion_respuestas.update({
      where: {
        cotizacion_id_profesional_id: {
          cotizacion_id: requestId,
          profesional_id: professionalId
        }
      },
      data: {
        precio: parseFloat(precio),
        comentario: sanitizedComentario || '',
        estado: 'ACEPTADO',
        respondido_en: new Date()
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

    // Notificación push al cliente
    try {
      await sendPushNotification(
        response.cotizacion.cliente_id,
        'Nueva oferta recibida',
        `${response.profesional.nombre} ha enviado una oferta: $${precio}`,
        {
          type: 'oferta_recibida',
          requestId: requestId,
          profesional_id: professionalId,
          precio: precio
        }
      );
    } catch (pushError) {
      console.warn('Error enviando push notification:', pushError.message);
    }

    // Notificación en base de datos al cliente
    await createNotification(
      response.cotizacion.cliente_id,
      NOTIFICATION_TYPES.COTIZACION_ACEPTADA,
      `${response.profesional.nombre} ha enviado una oferta: $${precio}`,
      { requestId: requestId, precio: precio }
    );

    // Email al cliente
    try {
      const { sendEmail } = require('../services/emailService');
      await sendEmail(
        response.cotizacion.cliente.email,
        'Nueva oferta en Changánet',
        `Hola ${response.cotizacion.cliente.nombre},\n\n¡Buenas noticias! ${response.profesional.nombre} ha enviado una oferta para tu solicitud.\n\nPrecio ofrecido: $${precio}\nComentario: ${comentario || 'Sin comentario adicional'}\n\nPuedes comparar ofertas desde tu panel.\n\nSaludos,\nEquipo Changánet`
      );
    } catch (emailError) {
      console.warn('Error enviando email:', emailError);
    }

    res.status(200).json(updatedResponse);
  } catch (error) {
    console.error('Error al crear oferta:', error);
    res.status(500).json({ error: 'Error al procesar la oferta.' });
  }
};
