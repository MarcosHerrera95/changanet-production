/**
 * Servicio de generación de comprobantes PDF
 * REQ-45: Generación de comprobantes de pago
 */

const PDFDocument = require('pdfkit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

/**
 * Genera un comprobante de pago en PDF
 * @param {string} paymentId - ID del pago
 * @returns {Buffer} Buffer del PDF generado
 */
exports.generatePaymentReceipt = async (paymentId) => {
  try {
    // Obtener datos del pago
    const payment = await prisma.pagos.findUnique({
      where: { id: paymentId },
      include: {
        servicio: {
          include: {
            cliente: true,
            profesional: {
              include: {
                perfil_profesional: true
              }
            }
          }
        },
        commission_setting: true,
        payouts: {
          where: { estado: 'completado' },
          orderBy: { fecha_pago: 'desc' },
          take: 1
        }
      }
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    // Crear documento PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Buffer para almacenar el PDF
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Encabezado
    doc.fontSize(20).font('Helvetica-Bold').text('COMPROBANTE DE PAGO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text('Changánet - Plataforma de Servicios Profesionales', { align: 'center' });
    doc.text('Fecha de emisión: ' + new Date().toLocaleDateString('es-AR'), { align: 'center' });
    doc.moveDown(2);

    // Información del pago
    doc.fontSize(14).font('Helvetica-Bold').text('DETALLES DEL PAGO');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`ID de Pago: ${payment.id}`);
    doc.text(`ID de Mercado Pago: ${payment.mercado_pago_id || 'N/A'}`);
    doc.text(`Fecha de Pago: ${payment.fecha_pago ? new Date(payment.fecha_pago).toLocaleDateString('es-AR') : 'Pendiente'}`);
    doc.text(`Estado: ${payment.estado.toUpperCase()}`);
    doc.moveDown();

    // Información del servicio
    doc.fontSize(14).font('Helvetica-Bold').text('DETALLES DEL SERVICIO');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`ID de Servicio: ${payment.servicio.id}`);
    doc.text(`Descripción: ${payment.servicio.descripcion}`);
    doc.text(`Fecha Agendada: ${payment.servicio.fecha_agendada ? new Date(payment.servicio.fecha_agendada).toLocaleDateString('es-AR') : 'No agendada'}`);
    doc.moveDown();

    // Información de las partes
    doc.fontSize(14).font('Helvetica-Bold').text('CLIENTE');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nombre: ${payment.servicio.cliente.nombre}`);
    doc.text(`Email: ${payment.servicio.cliente.email}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('PROFESIONAL');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nombre: ${payment.servicio.profesional.nombre}`);
    doc.text(`Email: ${payment.servicio.profesional.email}`);
    doc.text(`Especialidad: ${payment.servicio.profesional.perfil_profesional?.especialidad || 'N/A'}`);
    doc.moveDown();

    // Desglose financiero
    doc.fontSize(14).font('Helvetica-Bold').text('DESGLOSE FINANCIERO');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Monto Total Pagado: $${payment.monto_total.toFixed(2)}`);

    if (payment.commission_setting) {
      doc.text(`Configuración de Comisión: ${payment.commission_setting.nombre}`);
      doc.text(`Porcentaje de Comisión: ${payment.commission_setting.porcentaje}%`);
    } else {
      doc.text(`Porcentaje de Comisión: ${(payment.comision_plataforma / payment.monto_total * 100).toFixed(1)}%`);
    }

    doc.text(`Comisión Plataforma: $${payment.comision_plataforma.toFixed(2)}`);
    doc.text(`Monto Profesional: $${payment.monto_profesional.toFixed(2)}`);
    doc.moveDown();

    // Información de liberación de fondos
    if (payment.estado === 'aprobado') {
      doc.fontSize(12).font('Helvetica-Bold').text('💰 FONDOS EN CUSTODIA', { color: '#E30613' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text('Los fondos están retenidos por 24 horas según política de seguridad RB-04.');
      doc.text(`Fecha de liberación automática: ${payment.escrow_release_deadline ? new Date(payment.escrow_release_deadline).toLocaleDateString('es-AR') : '24h después del pago'}`);
      doc.moveDown();
    } else if (payment.estado === 'liberado') {
      doc.fontSize(12).font('Helvetica-Bold').text('✅ FONDOS LIBERADOS', { color: '#28a745' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Fecha de liberación: ${new Date(payment.fecha_liberacion).toLocaleDateString('es-AR')}`);
      doc.text('Los fondos han sido transferidos al profesional según RB-03.');

      // Información de payout si existe
      if (payment.payouts && payment.payouts.length > 0) {
        const payout = payment.payouts[0];
        doc.moveDown();
        doc.text(`ID de Payout: ${payout.id}`);
        doc.text(`Fecha de Pago: ${new Date(payout.fecha_pago).toLocaleDateString('es-AR')}`);
        doc.text(`Referencia: ${payout.referencia_pago || 'N/A'}`);
      }
      doc.moveDown();
    }

    // Pie de página
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica');
    doc.text('Este comprobante es generado automáticamente por el sistema Changánet.', { align: 'center' });
    doc.text('Para cualquier consulta, contacte a soporte@changanet.com', { align: 'center' });
    doc.moveDown();
    doc.text('© 2025 Changánet S.A. - Todos los derechos reservados.', { align: 'center' });

    // Finalizar documento
    doc.end();

    // Retornar buffer
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      doc.on('error', reject);
    });

  } catch (error) {
    console.error('Error generando comprobante PDF:', error);
    throw error;
  }
};

/**
 * Genera y guarda un comprobante en el sistema de archivos
 * @param {string} paymentId - ID del pago
 * @returns {string} Ruta del archivo generado
 */
exports.generateAndSaveReceipt = async (paymentId) => {
  try {
    const pdfBuffer = await this.generatePaymentReceipt(paymentId);

    // Crear directorio si no existe
    const receiptsDir = path.join(__dirname, '../receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    // Guardar archivo
    const fileName = `receipt_${paymentId}_${Date.now()}.pdf`;
    const filePath = path.join(receiptsDir, fileName);

    fs.writeFileSync(filePath, pdfBuffer);

    // Actualizar pago con URL del comprobante
    const receiptUrl = `/api/payments/receipts/${fileName}`;
    await prisma.pagos.update({
      where: { id: paymentId },
      data: { url_comprobante: receiptUrl }
    });

    console.log(`✅ Comprobante generado y guardado: ${filePath}`);
    return receiptUrl;

  } catch (error) {
    console.error('Error guardando comprobante:', error);
    throw error;
  }
};

/**
 * Obtiene un comprobante guardado
 * @param {string} fileName - Nombre del archivo
 * @returns {Buffer} Buffer del archivo
 */
exports.getReceiptFile = async (fileName) => {
  try {
    const filePath = path.join(__dirname, '../receipts', fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error('Comprobante no encontrado');
    }

    return fs.readFileSync(filePath);

  } catch (error) {
    console.error('Error obteniendo archivo de comprobante:', error);
    throw error;
  }
};

module.exports = exports;
