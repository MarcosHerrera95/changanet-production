/**
 * Servicio de gestión de cuentas bancarias
 * Implementa REQ-44: Gestión de cuentas bancarias para retiros
 * Incluye validación bancaria, encriptación de datos sensibles y auditoría
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const logger = require('./logger');

const prisma = new PrismaClient();

// Claves de encriptación (deberían estar en variables de entorno)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'changanet-encryption-key-32-chars';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encripta datos sensibles usando AES-256-GCM
 * @param {string} text - Texto a encriptar
 * @returns {string} Texto encriptado en formato JSON
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipherGCM(ALGORITHM, ENCRYPTION_KEY);
  cipher.setIV(iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  });
}

/**
 * Desencripta datos sensibles
 * @param {string} encryptedData - Datos encriptados en formato JSON
 * @returns {string} Texto desencriptado
 */
function decrypt(encryptedData) {
  try {
    const { encrypted, iv, authTag } = JSON.parse(encryptedData);
    const decipher = crypto.createDecipherGCM(ALGORITHM, ENCRYPTION_KEY);
    decipher.setIV(Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Error desencriptando datos');
  }
}

/**
 * Valida datos bancarios básicos
 * @param {Object} bankData - Datos bancarios
 * @returns {Object} Resultado de validación
 */
function validateBankData(bankData) {
  const errors = [];

  // Validar banco
  if (!bankData.banco || bankData.banco.length < 2) {
    errors.push('Nombre del banco es requerido y debe tener al menos 2 caracteres');
  }

  // Validar tipo de cuenta
  const validTypes = ['checking', 'savings'];
  if (!bankData.tipo_cuenta || !validTypes.includes(bankData.tipo_cuenta)) {
    errors.push('Tipo de cuenta debe ser "checking" o "savings"');
  }

  // Validar número de cuenta (depende del banco, pero generalmente 8-20 dígitos)
  const accountRegex = /^[0-9]{8,20}$/;
  if (!bankData.numero_cuenta || !accountRegex.test(bankData.numero_cuenta)) {
    errors.push('Número de cuenta debe tener entre 8 y 20 dígitos');
  }

  // Validar CVU si se proporciona (22 dígitos para Argentina)
  if (bankData.cvu) {
    const cvuRegex = /^[0-9]{22}$/;
    if (!cvuRegex.test(bankData.cvu)) {
      errors.push('CVU debe tener exactamente 22 dígitos');
    }
  }

  // Validar alias si se proporciona
  if (bankData.alias && bankData.alias.length < 3) {
    errors.push('Alias debe tener al menos 3 caracteres');
  }

  // Validar titular
  if (!bankData.titular || bankData.titular.length < 2) {
    errors.push('Nombre del titular es requerido');
  }

  // Validar documento del titular (DNI para Argentina)
  const dniRegex = /^[0-9]{7,8}$/;
  if (!bankData.documento_titular || !dniRegex.test(bankData.documento_titular)) {
    errors.push('Documento del titular debe ser un DNI válido (7-8 dígitos)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Crea una nueva cuenta bancaria para un profesional
 * @param {string} professionalId - ID del profesional
 * @param {Object} bankData - Datos bancarios
 * @returns {Object} Cuenta bancaria creada
 */
async function createBankAccount(professionalId, bankData) {
  try {
    // Verificar que el usuario sea profesional
    const user = await prisma.usuarios.findUnique({
      where: { id: professionalId },
      select: { rol: true, nombre: true }
    });

    if (!user || user.rol !== 'profesional') {
      throw new Error('Solo los profesionales pueden registrar cuentas bancarias');
    }

    // Validar datos bancarios
    const validation = validateBankData(bankData);
    if (!validation.isValid) {
      throw new Error(`Datos bancarios inválidos: ${validation.errors.join(', ')}`);
    }

    // Verificar que no exista ya una cuenta con el mismo número para este profesional
    const existingAccount = await prisma.cuentas_bancarias.findFirst({
      where: {
        profesional_id: professionalId,
        numero_cuenta_encrypted: encrypt(bankData.numero_cuenta)
      }
    });

    if (existingAccount) {
      throw new Error('Ya tienes registrada una cuenta con este número');
    }

    // Encriptar datos sensibles
    const encryptedAccountNumber = encrypt(bankData.numero_cuenta);
    const encryptedDocument = encrypt(bankData.documento_titular);
    const encryptedCvu = bankData.cvu ? encrypt(bankData.cvu) : null;

    // Crear cuenta bancaria
    const bankAccount = await prisma.cuentas_bancarias.create({
      data: {
        profesional_id: professionalId,
        banco: bankData.banco,
        tipo_cuenta: bankData.tipo_cuenta,
        numero_cuenta_encrypted: encryptedAccountNumber,
        cvu_encrypted: encryptedCvu,
        alias: bankData.alias,
        titular: bankData.titular,
        documento_titular_encrypted: encryptedDocument,
        estado: 'pendiente', // Requiere verificación por admin
        verificado: false
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'bank_account_created',
      entidad_tipo: 'cuentas_bancarias',
      entidad_id: bankAccount.id,
      usuario_id: professionalId,
      detalles: {
        banco: bankData.banco,
        tipo_cuenta: bankData.tipo_cuenta,
        titular: bankData.titular
      },
      ip_address: null, // Se obtendría del request
      user_agent: null
    });

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    await createNotification(
      professionalId,
      'cuenta_bancaria_creada',
      `Tu cuenta bancaria en ${bankData.banco} ha sido registrada y está pendiente de verificación.`,
      { bankAccountId: bankAccount.id, banco: bankData.banco }
    );

    logger.info('Bank account created successfully', {
      service: 'bank_accounts',
      userId: professionalId,
      bankAccountId: bankAccount.id,
      banco: bankData.banco
    });

    return {
      id: bankAccount.id,
      banco: bankAccount.banco,
      tipo_cuenta: bankAccount.tipo_cuenta,
      alias: bankAccount.alias,
      titular: bankAccount.titular,
      estado: bankAccount.estado,
      verificado: bankAccount.verificado,
      creado_en: bankAccount.creado_en
    };

  } catch (error) {
    logger.error('Error creating bank account', {
      service: 'bank_accounts',
      userId: professionalId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene las cuentas bancarias de un profesional
 * @param {string} professionalId - ID del profesional
 * @returns {Array} Lista de cuentas bancarias
 */
async function getBankAccounts(professionalId) {
  try {
    const accounts = await prisma.cuentas_bancarias.findMany({
      where: { profesional_id: professionalId },
      select: {
        id: true,
        banco: true,
        tipo_cuenta: true,
        alias: true,
        titular: true,
        estado: true,
        verificado: true,
        fecha_verificacion: true,
        motivo_rechazo: true,
        creado_en: true,
        actualizado_en: true
      },
      orderBy: { creado_en: 'desc' }
    });

    return accounts;
  } catch (error) {
    logger.error('Error getting bank accounts', {
      service: 'bank_accounts',
      userId: professionalId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Actualiza una cuenta bancaria
 * @param {string} accountId - ID de la cuenta
 * @param {string} professionalId - ID del profesional
 * @param {Object} updateData - Datos a actualizar
 * @returns {Object} Cuenta actualizada
 */
async function updateBankAccount(accountId, professionalId, updateData) {
  try {
    // Verificar que la cuenta pertenezca al profesional
    const account = await prisma.cuentas_bancarias.findFirst({
      where: {
        id: accountId,
        profesional_id: professionalId
      }
    });

    if (!account) {
      throw new Error('Cuenta bancaria no encontrada');
    }

    // Solo permitir actualización si no está verificada
    if (account.verificado) {
      throw new Error('No se pueden modificar cuentas bancarias ya verificadas');
    }

    // Validar datos si se incluyen campos sensibles
    if (updateData.numero_cuenta || updateData.documento_titular || updateData.cvu) {
      const validation = validateBankData({
        ...account,
        ...updateData,
        numero_cuenta: updateData.numero_cuenta || decrypt(account.numero_cuenta_encrypted),
        documento_titular: updateData.documento_titular || decrypt(account.documento_titular_encrypted),
        cvu: updateData.cvu || (account.cvu_encrypted ? decrypt(account.cvu_encrypted) : null)
      });

      if (!validation.isValid) {
        throw new Error(`Datos bancarios inválidos: ${validation.errors.join(', ')}`);
      }
    }

    // Preparar datos de actualización
    const updateFields = {};

    if (updateData.banco) updateFields.banco = updateData.banco;
    if (updateData.tipo_cuenta) updateFields.tipo_cuenta = updateData.tipo_cuenta;
    if (updateData.alias) updateFields.alias = updateData.alias;
    if (updateData.titular) updateFields.titular = updateData.titular;

    // Encriptar campos sensibles si se actualizan
    if (updateData.numero_cuenta) {
      updateFields.numero_cuenta_encrypted = encrypt(updateData.numero_cuenta);
    }
    if (updateData.documento_titular) {
      updateFields.documento_titular_encrypted = encrypt(updateData.documento_titular);
    }
    if (updateData.cvu !== undefined) {
      updateFields.cvu_encrypted = updateData.cvu ? encrypt(updateData.cvu) : null;
    }

    // Resetear estado de verificación si se modifican datos sensibles
    if (updateData.numero_cuenta || updateData.documento_titular || updateData.cvu) {
      updateFields.estado = 'pendiente';
      updateFields.verificado = false;
      updateFields.fecha_verificacion = null;
      updateFields.verificado_por = null;
    }

    const updatedAccount = await prisma.cuentas_bancarias.update({
      where: { id: accountId },
      data: updateFields,
      select: {
        id: true,
        banco: true,
        tipo_cuenta: true,
        alias: true,
        titular: true,
        estado: true,
        verificado: true,
        fecha_verificacion: true,
        motivo_rechazo: true,
        creado_en: true,
        actualizado_en: true
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'bank_account_updated',
      entidad_tipo: 'cuentas_bancarias',
      entidad_id: accountId,
      usuario_id: professionalId,
      detalles: updateData,
      ip_address: null,
      user_agent: null
    });

    logger.info('Bank account updated successfully', {
      service: 'bank_accounts',
      userId: professionalId,
      bankAccountId: accountId
    });

    return updatedAccount;

  } catch (error) {
    logger.error('Error updating bank account', {
      service: 'bank_accounts',
      userId: professionalId,
      accountId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Elimina una cuenta bancaria (solo si no tiene retiros asociados)
 * @param {string} accountId - ID de la cuenta
 * @param {string} professionalId - ID del profesional
 * @returns {boolean} True si se eliminó
 */
async function deleteBankAccount(accountId, professionalId) {
  try {
    // Verificar que la cuenta pertenezca al profesional
    const account = await prisma.cuentas_bancarias.findFirst({
      where: {
        id: accountId,
        profesional_id: professionalId
      },
      include: {
        retiros: true
      }
    });

    if (!account) {
      throw new Error('Cuenta bancaria no encontrada');
    }

    // No permitir eliminación si tiene retiros asociados
    if (account.retiros.length > 0) {
      throw new Error('No se puede eliminar una cuenta bancaria que tiene retiros asociados');
    }

    // Solo permitir eliminación si no está verificada
    if (account.verificado) {
      throw new Error('No se pueden eliminar cuentas bancarias verificadas');
    }

    await prisma.cuentas_bancarias.delete({
      where: { id: accountId }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: 'bank_account_deleted',
      entidad_tipo: 'cuentas_bancarias',
      entidad_id: accountId,
      usuario_id: professionalId,
      detalles: { banco: account.banco },
      ip_address: null,
      user_agent: null
    });

    logger.info('Bank account deleted successfully', {
      service: 'bank_accounts',
      userId: professionalId,
      bankAccountId: accountId
    });

    return true;

  } catch (error) {
    logger.error('Error deleting bank account', {
      service: 'bank_accounts',
      userId: professionalId,
      accountId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Verifica una cuenta bancaria (solo para admins)
 * @param {string} accountId - ID de la cuenta
 * @param {string} adminId - ID del admin
 * @param {boolean} approved - Si se aprueba o rechaza
 * @param {string} reason - Motivo si se rechaza
 * @returns {Object} Cuenta verificada
 */
async function verifyBankAccount(accountId, adminId, approved, reason = null) {
  try {
    const account = await prisma.cuentas_bancarias.findUnique({
      where: { id: accountId },
      include: {
        profesional: { select: { nombre: true, email: true } }
      }
    });

    if (!account) {
      throw new Error('Cuenta bancaria no encontrada');
    }

    const updateData = {
      estado: approved ? 'activa' : 'rechazada',
      verificado: approved,
      fecha_verificacion: new Date(),
      verificado_por: adminId
    };

    if (!approved && reason) {
      updateData.motivo_rechazo = reason;
    }

    const verifiedAccount = await prisma.cuentas_bancarias.update({
      where: { id: accountId },
      data: updateData,
      select: {
        id: true,
        banco: true,
        tipo_cuenta: true,
        alias: true,
        titular: true,
        estado: true,
        verificado: true,
        fecha_verificacion: true,
        motivo_rechazo: true,
        profesional: { select: { nombre: true, email: true } }
      }
    });

    // Log de auditoría
    await logTransaction({
      tipo_transaccion: approved ? 'bank_account_verified' : 'bank_account_rejected',
      entidad_tipo: 'cuentas_bancarias',
      entidad_id: accountId,
      usuario_id: adminId,
      detalles: {
        approved,
        reason,
        banco: account.banco,
        titular: account.titular
      },
      ip_address: null,
      user_agent: null
    });

    // Notificar al profesional
    const { createNotification } = require('./notificationService');
    const notificationType = approved ? 'cuenta_bancaria_verificada' : 'cuenta_bancaria_rechazada';
    const message = approved
      ? `Tu cuenta bancaria en ${account.banco} ha sido verificada y ya puedes realizar retiros.`
      : `Tu cuenta bancaria en ${account.banco} ha sido rechazada. Motivo: ${reason}`;

    await createNotification(
      account.profesional_id,
      notificationType,
      message,
      { bankAccountId: accountId, approved, reason }
    );

    logger.info('Bank account verification completed', {
      service: 'bank_accounts',
      adminId,
      bankAccountId: accountId,
      approved,
      reason
    });

    return verifiedAccount;

  } catch (error) {
    logger.error('Error verifying bank account', {
      service: 'bank_accounts',
      adminId,
      accountId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Función auxiliar para logging de transacciones
 */
async function logTransaction(logData) {
  try {
    await prisma.transactions_log.create({
      data: logData
    });
  } catch (error) {
    logger.error('Error logging transaction', {
      service: 'bank_accounts',
      error: error.message
    });
  }
}

module.exports = {
  createBankAccount,
  getBankAccounts,
  updateBankAccount,
  deleteBankAccount,
  verifyBankAccount,
  validateBankData
};
