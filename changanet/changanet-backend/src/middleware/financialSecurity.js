/**
 * Middleware de seguridad para operaciones financieras
 * Implementa validaciones de seguridad avanzadas para pagos, retiros y comisiones
 * REQ-41 a REQ-45: Cumplimiento de seguridad financiera
 */

const logger = require('../services/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Rate limiting para operaciones financieras
const financialOperations = new Map();

/**
 * Middleware de validación de operaciones financieras
 * Implementa estándares de seguridad financiera PCI DSS y mejores prácticas
 * Verifica permisos, rate limiting, prevención de fraude y registra auditoría completa
 */
const validateFinancialOperation = (operationType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.rol;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent') || 'Unknown';

      // 1. Verificar autenticación
      if (!userId) {
        logger.warn('Financial operation attempted without authentication', {
          service: 'financial_security',
          operation: operationType,
          ip: clientIP,
          userAgent
        });
        return res.status(401).json({
          error: 'Autenticación requerida para operaciones financieras'
        });
      }

      // 2. Rate limiting por usuario (máximo 10 operaciones financieras por hora)
      const userKey = `user_${userId}`;
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hora
      const maxOperations = 10;

      if (!financialOperations.has(userKey)) {
        financialOperations.set(userKey, []);
      }

      const userOperations = financialOperations.get(userKey);
      // Limpiar operaciones antiguas
      const recentOperations = userOperations.filter(op => now - op < windowMs);

      if (recentOperations.length >= maxOperations) {
        logger.warn('Financial operation rate limit exceeded', {
          service: 'financial_security',
          userId,
          operation: operationType,
          operationsCount: recentOperations.length,
          ip: clientIP
        });
        return res.status(429).json({
          error: 'Demasiadas operaciones financieras. Intente nuevamente en una hora.'
        });
      }

      // Registrar operación
      recentOperations.push(now);
      financialOperations.set(userKey, recentOperations);

      // 3. Validar permisos por tipo de operación
      const rolePermissions = {
        create_payment: ['cliente'],
        release_funds: ['cliente'],
        create_withdrawal: ['profesional'],
        manage_bank_accounts: ['profesional'],
        manage_commissions: ['admin'],
        process_withdrawals: ['admin'],
        view_financial_reports: ['admin']
      };

      const allowedRoles = rolePermissions[operationType];
      if (allowedRoles && !allowedRoles.includes(userRole)) {
        logger.warn('Financial operation permission denied', {
          service: 'financial_security',
          userId,
          userRole,
          operation: operationType,
          requiredRoles: allowedRoles,
          ip: clientIP
        });
        return res.status(403).json({
          error: 'No tiene permisos para realizar esta operación financiera'
        });
      }

      // 4. Validar datos sensibles en el body y cumplimiento PCI DSS
      if (req.body) {
        const sensitiveFields = ['numero_cuenta', 'cvu', 'documento_titular', 'monto'];
        const hasSensitiveData = sensitiveFields.some(field => req.body[field]);

        if (hasSensitiveData) {
          // Verificar que la conexión sea HTTPS en producción (PCI DSS Requirement 4)
          if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
            logger.error('Sensitive financial data sent over non-HTTPS connection', {
              service: 'financial_security',
              userId,
              operation: operationType,
              protocol: req.protocol,
              ip: clientIP
            });
            return res.status(400).json({
              error: 'Los datos sensibles deben enviarse a través de HTTPS'
            });
          }

          // Validar headers de seguridad adicionales
          const userAgent = req.get('User-Agent');
          if (!userAgent || userAgent.length < 10) {
            logger.warn('Suspicious request without proper User-Agent', {
              service: 'financial_security',
              userId,
              operation: operationType,
              ip: clientIP
            });
          }

          // Verificar Content-Type para requests con datos sensibles
          const contentType = req.get('Content-Type');
          if (!contentType || !contentType.includes('application/json')) {
            logger.warn('Request with sensitive data has invalid Content-Type', {
              service: 'financial_security',
              userId,
              operation: operationType,
              contentType,
              ip: clientIP
            });
          }
        }
      }

      // 5. Validación de fraude y duplicados
      if (req.body) {
        await validateFraudPrevention(req, operationType, userId, clientIP);
      }

      // 6. Verificar estado de verificación del usuario para operaciones críticas
      if (['create_withdrawal', 'manage_bank_accounts'].includes(operationType)) {
        const user = await prisma.usuarios.findUnique({
          where: { id: userId },
          select: {
            esta_verificado: true,
            bloqueado: true,
            perfil_profesional: {
              select: { estado_verificacion: true }
            }
          }
        });

        if (user.bloqueado) {
          logger.warn('Blocked user attempted financial operation', {
            service: 'financial_security',
            userId,
            operation: operationType,
            ip: clientIP
          });
          return res.status(403).json({
            error: 'Su cuenta está bloqueada. Contacte al soporte.'
          });
        }

        if (!user.esta_verificado) {
          logger.warn('Unverified user attempted financial operation', {
            service: 'financial_security',
            userId,
            operation: operationType,
            ip: clientIP
          });
          return res.status(403).json({
            error: 'Debe verificar su cuenta antes de realizar operaciones financieras'
          });
        }

        if (userRole === 'profesional' && user.perfil_profesional?.estado_verificacion !== 'verificado') {
          logger.warn('Unverified professional attempted financial operation', {
            service: 'financial_security',
            userId,
            operation: operationType,
            verificationStatus: user.perfil_profesional?.estado_verificacion,
            ip: clientIP
          });
          return res.status(403).json({
            error: 'Debe verificar su perfil profesional antes de realizar operaciones financieras'
          });
        }
      }

      // 6. Registrar auditoría de la operación
      await logFinancialAudit({
        userId,
        operation: operationType,
        amount: req.body?.amount || req.body?.monto || null,
        ip: clientIP,
        userAgent,
        endpoint: req.originalUrl,
        method: req.method,
        userRole
      });

      // 7. Agregar metadata de seguridad al request
      req.financialSecurity = {
        validated: true,
        operationType,
        timestamp: now,
        securityLevel: getSecurityLevel(operationType)
      };

      next();

    } catch (error) {
      logger.error('Financial security middleware error', {
        service: 'financial_security',
        userId: req.user?.id,
        operation: operationType,
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Error de validación de seguridad financiera'
      });
    }
  };
};

/**
 * Middleware de validación de montos financieros
 * Previene manipulación de montos y valida rangos
 */
const validateFinancialAmounts = (req, res, next) => {
  try {
    const { amount, monto, grossAmount, commissionAmount, netAmount } = req.body;

    // Función auxiliar para validar monto
    const validateAmount = (value, fieldName) => {
      if (value !== undefined) {
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`${fieldName} debe ser un número válido`);
        }

        if (value < 0) {
          throw new Error(`${fieldName} no puede ser negativo`);
        }

        // Validar límites razonables (máximo $1,000,000)
        if (value > 1000000) {
          throw new Error(`${fieldName} excede el límite máximo permitido`);
        }
      }
    };

    // Validar diferentes campos de monto
    validateAmount(amount, 'Monto');
    validateAmount(monto, 'Monto');
    validateAmount(grossAmount, 'Monto bruto');
    validateAmount(commissionAmount, 'Comisión');
    validateAmount(netAmount, 'Monto neto');

    // Validar lógica de montos para payouts
    if (grossAmount && commissionAmount && netAmount) {
      const calculatedNet = grossAmount - commissionAmount;
      if (Math.abs(calculatedNet - netAmount) > 0.01) { // Tolerancia de 1 centavo
        logger.warn('Financial amount validation failed: inconsistent amounts', {
          service: 'financial_security',
          userId: req.user?.id,
          grossAmount,
          commissionAmount,
          netAmount,
          calculatedNet,
          ip: req.ip
        });
        return res.status(400).json({
          error: 'Los montos proporcionados son inconsistentes'
        });
      }
    }

    next();

  } catch (error) {
    logger.error('Financial amount validation error', {
      service: 'financial_security',
      userId: req.user?.id,
      error: error.message,
      ip: req.ip
    });

    res.status(400).json({
      error: error.message
    });
  }
};

/**
 * Determina el nivel de seguridad requerido para una operación
 */
function getSecurityLevel(operationType) {
  const securityLevels = {
    create_payment: 'medium',
    release_funds: 'high',
    create_withdrawal: 'high',
    manage_bank_accounts: 'high',
    manage_commissions: 'critical',
    process_withdrawals: 'critical',
    view_financial_reports: 'medium'
  };

  return securityLevels[operationType] || 'low';
}

/**
 * Validación de prevención de fraude
 */
async function validateFraudPrevention(req, operationType, userId, clientIP) {
  try {
    const { amount, monto, serviceId, bankDetails } = req.body;

    // 1. Validación de montos sospechosos
    const transactionAmount = amount || monto;
    if (transactionAmount) {
      // Verificar límites de transacción
      const maxTransactionAmount = parseFloat(process.env.MAX_TRANSACTION_AMOUNT || '100000');
      const minTransactionAmount = parseFloat(process.env.MIN_TRANSACTION_AMOUNT || '100');

      if (transactionAmount > maxTransactionAmount) {
        logger.warn('Transaction amount exceeds maximum limit', {
          service: 'fraud_prevention',
          userId,
          operationType,
          amount: transactionAmount,
          maxAllowed: maxTransactionAmount,
          ip: clientIP
        });
        throw new Error(`El monto de la transacción excede el límite máximo permitido de $${maxTransactionAmount}`);
      }

      if (transactionAmount < minTransactionAmount) {
        logger.warn('Transaction amount below minimum limit', {
          service: 'fraud_prevention',
          userId,
          operationType,
          amount: transactionAmount,
          minAllowed: minTransactionAmount,
          ip: clientIP
        });
        throw new Error(`El monto de la transacción debe ser al menos $${minTransactionAmount}`);
      }

      // Verificar patrones de fraude: múltiplos redondos grandes
      if (transactionAmount >= 50000 && transactionAmount % 10000 === 0) {
        logger.warn('Suspicious round amount detected', {
          service: 'fraud_prevention',
          userId,
          operationType,
          amount: transactionAmount,
          ip: clientIP
        });
        // No bloquear, pero registrar para monitoreo
      }
    }

    // 2. Detección de duplicados
    if (operationType === 'create_payment' && serviceId) {
      const recentPayment = await prisma.pagos.findFirst({
        where: {
          servicio_id: serviceId,
          estado: { in: ['pendiente', 'aprobado'] },
          fecha_pago: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Últimos 5 minutos
          }
        }
      });

      if (recentPayment) {
        logger.warn('Duplicate payment attempt detected', {
          service: 'fraud_prevention',
          userId,
          operationType,
          serviceId,
          existingPaymentId: recentPayment.id,
          ip: clientIP
        });
        throw new Error('Ya existe un pago activo para este servicio. Evite pagos duplicados.');
      }
    }

    // 3. Validación de frecuencia de operaciones
    if (operationType === 'create_withdrawal') {
      const recentWithdrawals = await prisma.transactions_log.count({
        where: {
          usuario_id: userId,
          tipo_transaccion: 'create_withdrawal',
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
          },
          exito: true
        }
      });

      const maxDailyWithdrawals = parseInt(process.env.MAX_DAILY_WITHDRAWALS || '3');
      if (recentWithdrawals >= maxDailyWithdrawals) {
        logger.warn('Daily withdrawal limit exceeded', {
          service: 'fraud_prevention',
          userId,
          operationType,
          recentWithdrawals,
          maxAllowed: maxDailyWithdrawals,
          ip: clientIP
        });
        throw new Error(`Ha excedido el límite diario de retiros (${maxDailyWithdrawals}). Intente nuevamente mañana.`);
      }
    }

    // 4. Validación de datos bancarios para retiros
    if (operationType === 'create_withdrawal' && bankDetails) {
      // Verificar que no se usen los mismos datos bancarios en corto tiempo
      const recentBankDetails = await prisma.transactions_log.findFirst({
        where: {
          usuario_id: userId,
          tipo_transaccion: 'create_withdrawal',
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Última hora
          },
          exito: true,
          detalles: {
            path: ['bankDetails', 'cvu'],
            equals: bankDetails.cvu
          }
        }
      });

      if (recentBankDetails) {
        logger.warn('Same bank details used recently', {
          service: 'fraud_prevention',
          userId,
          operationType,
          ip: clientIP
        });
        throw new Error('Los mismos datos bancarios fueron usados recientemente. Espere al menos 1 hora entre retiros.');
      }
    }

  } catch (error) {
    logger.error('Fraud prevention validation error', {
      service: 'fraud_prevention',
      userId,
      operationType,
      error: error.message,
      ip: clientIP
    });
    throw error;
  }
}

/**
 * Registra auditoría de operaciones financieras en transactions_log
 */
async function logFinancialAudit(auditData) {
  try {
    await prisma.transactions_log.create({
      data: {
        tipo_transaccion: auditData.operation,
        entidad_tipo: 'financial_operation',
        entidad_id: auditData.userId,
        usuario_id: auditData.userId,
        monto: auditData.amount || null,
        detalles: {
          operation: auditData.operation,
          endpoint: auditData.endpoint,
          method: auditData.method,
          userRole: auditData.userRole,
          securityLevel: getSecurityLevel(auditData.operation),
          amount: auditData.amount,
          currency: auditData.currency || 'ARS'
        },
        ip_address: auditData.ip,
        user_agent: auditData.userAgent,
        exito: true
      }
    });
  } catch (error) {
    logger.error('Financial audit logging error', {
      service: 'financial_security',
      error: error.message,
      auditData
    });
  }
}

/**
 * Middleware para operaciones de alto riesgo
 * Requiere verificación adicional (ej: 2FA en el futuro)
 */
const highRiskOperation = (req, res, next) => {
  const operationType = req.financialSecurity?.operationType;
  const securityLevel = req.financialSecurity?.securityLevel;

  if (securityLevel === 'critical' || securityLevel === 'high') {
    // En el futuro, aquí se podría implementar:
    // - Verificación de 2FA
    // - Verificación de dispositivo
    // - Límites de tiempo de sesión
    // - Geolocalización

    logger.info('High-risk financial operation authorized', {
      service: 'financial_security',
      userId: req.user?.id,
      operation: operationType,
      securityLevel,
      ip: req.ip
    });
  }

  next();
};

/**
 * Cleanup periódico del rate limiting (cada hora)
 */
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hora

  for (const [key, operations] of financialOperations.entries()) {
    const recentOperations = operations.filter(op => now - op < windowMs);
    if (recentOperations.length === 0) {
      financialOperations.delete(key);
    } else {
      financialOperations.set(key, recentOperations);
    }
  }

  logger.debug('Financial rate limiting cleanup completed', {
    service: 'financial_security',
    activeUsers: financialOperations.size
  });
}, 60 * 60 * 1000); // Cada hora

module.exports = {
  validateFinancialOperation,
  validateFinancialAmounts,
  highRiskOperation
};
