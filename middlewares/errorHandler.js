/**
 * @file errorHandler.js
 * @description Middleware centralisé de gestion des erreurs pour l'API RESTful TontiNaïs.
 * @module middlewares/errorHandler
 */

const env = require('../config/env');

/**
 * Traite et formatte de manière sécurisée toutes les erreurs capturées par Express.
 * @param {Error} err Erreur interceptée.
 * @param {import('express').Request} req Requête HTTP.
 * @param {import('express').Response} res Réponse HTTP.
 * @param {import('express').NextFunction} next Fonction de passage.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Une erreur interne du serveur est survenue.';

  // 1. Erreur Mongoose : ID d'objet non valide (CastError / IDOR)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Ressource non trouvée avec l'identifiant fourni : ${err.value}`;
  }

  // 2. Erreur Mongoose : Champ unique en doublon (ex: email déjà enregistré)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'champ';
    message = `Cette valeur existe déjà pour le champ : ${field}.`;
  }

  // 3. Erreur Mongoose : Échec de validation de schéma
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((el) => el.message);
    message = `Erreur de validation des données : ${errors.join(', ')}`;
  }

  // 4. Erreur JWT : Signature corrompue ou invalide
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token d\'authentification invalide ou altéré.';
  }

  // 5. Erreur JWT : Expiration de session
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Votre session a expiré. Veuillez vous reconnecter.';
  }

  // Journalisation interne sécurisée
  if (env.NODE_ENV === 'development') {
    console.error(`[Express Error Handler] (${statusCode}) : ${err.stack || err.message}`);
  } else {
    console.error(`[Express Error Handler] (${statusCode}) : ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
