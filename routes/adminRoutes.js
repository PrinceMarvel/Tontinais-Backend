/**
 * @file adminRoutes.js
 * @description Routes Express d'administration centrale et gestion des permissions.
 * @module routes/adminRoutes
 */

const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  getAllGroups
} = require('../controllers/adminController');
const { protect } = require('../middlewares/auth');
const { verifyAdmin } = require('../middlewares/roles');

const router = express.Router();

// Toutes les routes d'administration nécessitent un token valide et le statut Admin
router.use(protect);
router.use(verifyAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.get('/groups', getAllGroups);

module.exports = router;
