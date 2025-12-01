/**
 * @archivo src/routes/notificationRoutes.js - Rutas de notificaciones
 * @descripción Define endpoints REST para gestión de notificaciones (REQ-19, REQ-20)
 * @sprint Sprint 2 – Notificaciones y Comunicación
 * @tarjeta Tarjeta 4: [Backend] Implementar API de Notificaciones
 * @impacto Social: Endpoints seguros para gestión de notificaciones accesibles
 */

const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authenticate');

const router = express.Router();

// GET /api/notifications - Obtener notificaciones del usuario
router.get('/', authenticateToken, notificationController.getNotifications);

// PUT /api/notifications/:id/read - Marcar notificación como leída
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

// PUT /api/notifications/read-all - Marcar todas como leídas
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

// DELETE /api/notifications/:id - Eliminar notificación
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

// FCM Token Management
// POST /api/notifications/register-token - Registrar token FCM
router.post('/register-token', authenticateToken, notificationController.registerFCMToken);

// DELETE /api/notifications/unregister-token - Eliminar token FCM
router.delete('/unregister-token', authenticateToken, notificationController.unregisterFCMToken);

// POST /api/notifications/test - Enviar notificación de prueba (desarrollo)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', authenticateToken, notificationController.sendTestNotification);
}

// POST /api/notifications/test-fcm - Enviar notificación FCM de prueba (desarrollo)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test-fcm', authenticateToken, async (req, res) => {
    try {
      const { title, body } = req.body;
      const userId = req.user.id;

      // Enviar notificación FCM de prueba
      const { sendPushNotification } = require('../services/pushNotificationService');
      const result = await sendPushNotification(
        userId,
        title || 'Notificación de Prueba FCM',
        body || 'Esta es una notificación de prueba desde Changánet',
        {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      );

      res.status(200).json({
        success: true,
        message: 'Notificación FCM enviada exitosamente',
        data: result
      });
    } catch (error) {
      console.error('Error enviando notificación FCM de prueba:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message
      });
    }
  });
}

// GET /api/notifications/preferences - Obtener preferencias de notificación
router.get('/preferences', authenticateToken, notificationController.getNotificationPreferences);

// PUT /api/notifications/preferences - Actualizar preferencias de notificación
router.put('/preferences', authenticateToken, notificationController.updateNotificationPreferences);

// POST /api/notifications/create - Crear notificación (admin)
router.post('/create', authenticateToken, notificationController.createNotification);

// GET /api/notifications/grouped - Obtener notificaciones agrupadas
router.get('/grouped', authenticateToken, notificationController.getGroupedNotifications);

// GET /api/notifications/stats - Obtener estadísticas de notificaciones
router.get('/stats', authenticateToken, notificationController.getNotificationStats);

// WebSocket endpoint info
// GET /api/notifications/ws-info - Información para conexión WebSocket
router.get('/ws-info', authenticateToken, (req, res) => {
  const wsUrl = process.env.WS_URL || `ws://localhost:${process.env.PORT || 3003}`;
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

  res.json({
    success: true,
    wsUrl: `${wsUrl}/ws/notifications?token=${token}`,
    protocols: ['notification:new', 'notification:read', 'notification:updated']
  });
});

module.exports = router;
