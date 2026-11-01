/**
 * @file rateLimiter.js
 * @description Configuration des middlewares de débit.
 * Configuré en mode requêtes illimitées pour garantir une fluidité totale sans aucun blocage 429.
 * @module middlewares/rateLimiter
 */

/**
 * Middleware transparent (Pass-through) garantissant un flux de requêtes totalement illimité.
 * Élimine toute restriction ou blocage lors des tests et de l'utilisation intensive.
 */
const unlimitedPassThrough = (req, res, next) => {
  next();
};

const globalRateLimiter = unlimitedPassThrough;
const authRateLimiter = unlimitedPassThrough;
const financialRateLimiter = unlimitedPassThrough;

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  financialRateLimiter
};
