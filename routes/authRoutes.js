/**
 * @file authRoutes.js
 * @description Routes Express pour l'authentification et la gestion des sessions utilisateurs.
 * @module routes/authRoutes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  register,
  login,
  refreshToken,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { authRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * Middleware de validation express-validator pour intercepter les saisies incorrectes.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg
    });
  }
  next();
};

// Validation pour l'inscription
const registerValidation = [
  body('nom').trim().notEmpty().withMessage('Le nom est requis.'),
  body('prenom').trim().notEmpty().withMessage('Le prénom est requis.'),
  body('email').isEmail().withMessage('Veuillez fournir un e-mail valide.'),
  body('telephone').notEmpty().withMessage('Le numéro de téléphone est requis.'),
  body('motDePasse')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères.')
];

// Validation pour la connexion
const loginValidation = [
  body('email').isEmail().withMessage('Veuillez fournir un e-mail valide.'),
  body('motDePasse').notEmpty().withMessage('Le mot de passe est requis.')
];

// Routes d'authentification publiques avec Rate Limiting strict
router.post('/register', authRateLimiter, registerValidation, validate, register);
router.post('/login', authRateLimiter, loginValidation, validate, login);
router.post('/refresh', refreshToken);

// Routes d'authentification protégées
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
