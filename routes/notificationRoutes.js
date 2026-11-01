/**
 * @file notificationRoutes.js
 * @description Routes Express pour la consultation et la gestion des notifications utilisateurs.
 * @module routes/notificationRoutes
 */

const express = require('express');
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;

