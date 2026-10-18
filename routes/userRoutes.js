/**
 * @file userRoutes.js
 * @description Routes Express pour la consultation et modification du profil utilisateur.
 * @module routes/userRoutes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  getProfile,
  updateProfile,
  updatePassword
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

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

const passwordValidation = [
  body('ancienMotDePasse').notEmpty().withMessage('L\'ancien mot de passe est requis.'),
  body('nouveauMotDePasse')
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères.')
];

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/update-password', passwordValidation, validate, updatePassword);

module.exports = router;
