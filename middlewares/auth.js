/**
 * @file auth.js
 * @description Middleware de protection des routes par validation des jetons JWT.
 * @module middlewares/auth
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

/**
 * Intercepte et valide le token JWT présent dans les en-têtes de requête HTTP.
 * Injecte l'utilisateur authentifié dans `req.user`.
 * @param {import('express').Request} req Requête HTTP.
 * @param {import('express').Response} res Réponse HTTP.
 * @param {import('express').NextFunction} next Fonction suivante.
 */
const protect = async (req, res, next) => {
  let token;

  // Extraction du token Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Accès refusé. Aucun jeton d\'authentification fourni.'
    });
  }

  try {
    // Décodage et vérification du jeton JWT
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Chargement de l'utilisateur actif sans le mot de passe
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'L\'utilisateur associé à ce jeton n\'existe plus.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte a été temporairement désactivé ou suspendu.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Jeton de session non valide ou expiré. Veuillez vous reconnecter.'
    });
  }
};

module.exports = {
  protect
};
