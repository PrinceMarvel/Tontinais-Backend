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
  body('email')
    .trim()
    .isEmail()
    .withMessage('Veuillez fournir une adresse e-mail valide.')
    .custom((email) => {
      const domain = email.split('@')[1]?.toLowerCase();
      const disposable = [
        'yopmail.com', 'yopmail.fr', 'mailinator.com', 'tempmail.com', 'temp-mail.org',
        '10minutemail.com', 'guerrillamail.com', 'trashmail.com', 'sharklasers.com',
        'dispostable.com', 'getairmail.com', 'mohmal.com', 'fakeinbox.com',
        'throwawaymail.com', 'getnada.com', 'burnermail.io'
      ];
      if (disposable.includes(domain)) {
        throw new Error('Les adresses e-mail temporaires ou jetables sont interdites.');
      }
      return true;
    }),
  body('telephone')
    .notEmpty()
    .withMessage('Le numéro de téléphone est requis.')
    .matches(/^\+[1-9]\d{6,14}$/)
    .withMessage('Veuillez fournir un numéro de téléphone international officiel valide (ex: +225..., +221..., etc.).'),
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
