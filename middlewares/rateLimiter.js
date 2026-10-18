/**
 * @file rateLimiter.js
 * @description Configuration des limiteurs de débit (Rate Limiting) pour contrer les attaques DoS et Force Brute.
 * @module middlewares/rateLimiter
 */

const rateLimit = require('express-rate-limit');

/**
 * Limiteur global appliqué à l'ensemble des routes de l'API.
 * Max: 100 requêtes par 15 minutes par IP.
 */
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Nombre excessif de requêtes. Veuillez réessayer dans 15 minutes.'
  }
});

/**
 * Limiteur strict appliqué uniquement aux routes d'authentification (login, register, reset password).
 * Max: 5 tentatives par 15 minutes par IP pour bloquer la force brute.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de tentatives de connexion échouées. Accès temporairement bloqué pendant 15 minutes.'
  }
});

/**
 * Limiteur appliqué aux opérations financières sensibles (cotisations, cagnottes).
 * Max: 30 requêtes par 15 minutes par IP.
 */
const financialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Volume d\'opérations financières trop élevé. Veuillez patienter avant la prochaine tentative.'
  }
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  financialRateLimiter
};
