// src/controllers/custodyController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createCustody = async (req, res) => {
  const { id: clientId } = req.user;
  const { servicio_id, monto } = req.body;

  try {
    const service = await prisma.servicios.findUnique({
      where: { id: servicio_id },
      include: { cliente: true, profesional: true }
    });

    if (!service || service.cliente_id !== clientId) {
      return res.status(403).json({ error: 'No tienes permiso para esta custodia.' });
    }

    // Simular custodia de fondos (en producción integraría con Stripe/PayPal)
    const custody = {
      id: 'cust_' + Date.now(),
      servicio_id,
      cliente_id: clientId,
      profesional_id: service.profesional_id,
      monto: parseFloat(monto),
      estado: 'retenido',
      creado_en: new Date()
    };

    res.status(201).json(custody);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear custodia de fondos.' });
  }
};

exports.releaseCustody = async (req, res) => {
  const { custodyId } = req.params;

  try {
    // Simular liberación de fondos
    const custody = {
      id: custodyId,
      estado: 'liberado',
      liberado_en: new Date()
    };

    res.status(200).json(custody);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al liberar custodia de fondos.' });
  }
};

exports.getCustodyStatus = async (req, res) => {
  const { id: userId } = req.user;
  const { serviceId } = req.params;

  try {
    // Simular obtener estado de custodia
    const custody = {
      servicio_id: serviceId,
      estado: 'retenido',
      monto: 100.00
    };

    res.status(200).json(custody);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estado de custodia.' });
  }
};
