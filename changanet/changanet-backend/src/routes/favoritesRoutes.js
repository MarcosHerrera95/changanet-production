/**
 * Rutas para gestión de favoritos
 * Permite a los clientes gestionar profesionales favoritos
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authenticate');
const {
  addFavorite,
  removeFavorite,
  getFavorites,
  checkFavorite
} = require('../controllers/favoritesController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// POST /api/favorites - Agregar profesional a favoritos
router.post('/', addFavorite);

// GET /api/favorites - Obtener lista de favoritos
router.get('/', getFavorites);

// GET /api/favorites/check/:profesionalId - Verificar si está en favoritos
router.get('/check/:profesionalId', checkFavorite);

// DELETE /api/favorites/:profesionalId - Remover de favoritos
router.delete('/:profesionalId', removeFavorite);

module.exports = router;
