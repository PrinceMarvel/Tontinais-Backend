/**
 * @file paymentRoutes.js
 * @description Routes Express pour la réception des Webhooks et la vérification des transactions Mobile Money.
 * @module routes/paymentRoutes
 */

const express = require('express');
const { handlePaymentWebhook, checkPaymentStatus } = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Route Webhook opérateur (publique avec validation de signature cryptographique)
router.post('/webhook', handlePaymentWebhook);

// Route de consultation du statut en temps réel d'un flux de paiement (protégée)
router.get('/status/:reference', protect, checkPaymentStatus);

module.exports = router;

