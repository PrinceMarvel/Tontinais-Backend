/**
 * @file contributionRoutes.js
 * @description Routes Express pour les cotisations 100% directes par Mobile Money.
 * @module routes/contributionRoutes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  initiateContribution,
  confirmContributionPayment,
  getGroupContributions,
  getMyContributions
} = require('../controllers/contributionController');
const { protect } = require('../middlewares/auth');
const { verifyGroupMember } = require('../middlewares/roles');
const { financialRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * Middleware d'interception et de validation des erreurs express-validator.
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

const contributionValidation = [
  body('groupId').isMongoId().withMessage('Identifiant de groupe invalide.'),
  body('tourNumber').isInt({ min: 1 }).withMessage('Le numéro de tour doit être un entier supérieur à zéro.'),
  body('walletProvider')
    .isIn(['ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'MOOV', 'AUTRE'])
    .withMessage('Opérateur Mobile Money non reconnu.'),
  body('walletPhone').trim().notEmpty().withMessage('Le numéro de téléphone Mobile Money est obligatoire.')
];

// Toutes les routes de cotisation requièrent une authentification JWT valide
router.use(protect);

// 1. Déclencher un paiement direct Mobile Money (avec Rate Limiting financier anti-abus)
router.post(
  '/',
  financialRateLimiter,
  contributionValidation,
  validate,
  initiateContribution
);

// 2. Confirmer le débit direct (validation code PIN / simulateur)
router.post('/:id/confirm', confirmContributionPayment);

// 3. Consulter les cotisations du groupe
router.get('/group/:groupId', verifyGroupMember, getGroupContributions);

// 4. Consulter son propre historique de versements
router.get('/me', getMyContributions);

module.exports = router;
