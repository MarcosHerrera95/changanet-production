/**
 * Servicio de chat unificado usando Socket.IO
 * Interfaz simplificada para usar con ChatContext
 * Reemplaza la implementación anterior basada en Firebase RTDB
 */

import socketService from './socketService';

class ChatService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Inicializa el servicio de chat
   * Nota: El ChatContext maneja la conexión Socket.IO directamente
   */
  initialize(userId) {
    if (this.isInitialized) return;

    console.log('ChatService inicializado - usando ChatContext para Socket.IO');
    this.isInitialized = true;
  }

  /**
   * Desconecta el servicio de chat
   * Nota: El ChatContext maneja la desconexión
   */
  disconnect() {
    this.isInitialized = false;
  }

  /**
   * Método de compatibilidad - usar ChatContext directamente
   * @deprecated Usar ChatContext.sendMessage en su lugar
   */
  async sendMessage(remitenteId, destinatarioId, contenido, urlImagen = null) {
    console.warn('ChatService.sendMessage está deprecated. Usar ChatContext directamente.');
    return { success: false, error: 'Usar ChatContext directamente' };
  }

  /**
   * Método de compatibilidad - usar ChatContext directamente
   * @deprecated Usar ChatContext.markAsRead en su lugar
   */
  async markAsRead(senderId, recipientId) {
    console.warn('ChatService.markAsRead está deprecated. Usar ChatContext directamente.');
    return { success: false, error: 'Usar ChatContext directamente' };
  }

  /**
   * Obtiene el estado de conexión del socket service
   */
  getConnectionStatus() {
    return socketService.getConnectionStatus();
  }
}

// Instancia singleton para compatibilidad
const chatService = new ChatService();

export default chatService;

// Exportar socketService para uso directo si es necesario
export { socketService };
