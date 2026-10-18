/**
 * @file security.js
 * @description Suite de middlewares de durcissement sécuritaire (Helmet, NoSQL Sanitization, HPP).
 * @module middlewares/security
 */

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

/**
 * Configure et applique l'ensemble des sécurités système au niveau HTTP et requêtes.
 * @param {import('express').Express} app Application Express.
 */
const configureSecurity = (app) => {
  // 1. Durcissement des en-têtes HTTP via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 an
        includeSubDomains: true,
        preload: true
      }
    })
  );

  // 2. Prévention des injections NoSQL ($ et .)
  app.use(
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`[NoSQL Sanitizer Alert] Tentative d'injection bloquée dans le champ : ${key}`);
      }
    })
  );

  // 3. Protection contre la pollution de paramètres HTTP (HPP)
  app.use(
    hpp({
      whitelist: ['status', 'role', 'currency', 'frequency']
    })
  );
};

module.exports = configureSecurity;
