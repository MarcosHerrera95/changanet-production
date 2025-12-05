// src/routes/geocodeRoutes.js
// Proxy para geocodificación con Nominatim evitando CORS


const express = require('express');
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/authenticate');
const router = express.Router();

// GET /api/geocode?zone=Buenos Aires, Caballito, Argentina
router.get('/', authenticateToken, async (req, res) => {
  const { zone } = req.query;
  if (!zone) return res.status(400).json({ error: 'Falta el parámetro zone' });

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zone)}&limit=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'changannet-app/1.0 (contacto@changannet.com)'
      }
    });
    if (!response.ok) throw new Error('Error en Nominatim');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error en geocodificación:', error);
    res.status(500).json({ error: 'Error al consultar Nominatim' });
  }
});

module.exports = router;
