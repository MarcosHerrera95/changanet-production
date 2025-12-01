// src/routes/mapsRoutes.js - Rutas para Google Maps API
const express = require('express');
const { getGeocodeData, getDistanceMatrix } = require('../services/mapService');

const router = express.Router();

/**
 * GET /api/maps/geocode
 * Geocodifica una dirección usando Google Maps API
 */
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        error: 'Dirección requerida',
        message: 'Debe proporcionar una dirección para geocodificar'
      });
    }

    const geocodeData = await getGeocodeData(address);

    res.status(200).json({
      success: true,
      data: geocodeData
    });
  } catch (error) {
    console.error('Error en geocodificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

/**
* POST /api/maps/distance
* Calcula la distancia entre dos puntos usando Google Distance Matrix API
*/
router.post('/distance', async (req, res) => {
 try {
   const { origins, destinations } = req.body;

   if (!origins || !destinations) {
     return res.status(400).json({
       error: 'Parámetros requeridos',
       message: 'Debe proporcionar origins y destinations'
     });
   }

   const distanceData = await getDistanceMatrix(origins, destinations);

   res.status(200).json({
     success: true,
     data: distanceData
   });
 } catch (error) {
   console.error('Error en cálculo de distancia:', error);
   res.status(500).json({
     error: 'Error interno del servidor',
     message: error.message
   });
 }
});

module.exports = router;
