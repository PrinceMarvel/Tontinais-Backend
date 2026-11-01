/**
 * @file app.js
 * @description Assemblage principal de l'application Express, des middlewares de sécurité et des routes API.
 * @module app
 */

const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const configureSecurity = require('./middlewares/security');
const { globalRateLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');

// Importation des fichiers de routes API
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// 1. Configuration fine du CORS (Restriction absolue en production)
const corsOptions = {
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-signature', 'x-signature']
};
app.use(cors(corsOptions));

// 2. Application des middlewares de sécurité système (Helmet, Sanitization NoSQL, HPP)
configureSecurity(app);

// 3. Parsers de corps de requêtes HTTP
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Rate Limiting global sur toutes les requêtes API
app.use('/api', globalRateLimiter);

// 5. Route de vérification de santé du serveur (Healthcheck)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    application: 'TontiNaïs API RESTful',
    slogan: "L'épargne solidaire, intelligente et sécurisée à portée de main.",
    timestamp: new Date().toISOString()
  });
});

// 6. Montage des routes API métier
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// 7. Route 404 pour les ressources non trouvées
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `La route demandée '${req.originalUrl}' n'existe pas sur le serveur TontiNaïs.`
  });
});

// 8. Middleware d'erreur centralisé
app.use(errorHandler);

module.exports = app;
