/**
 * @file groupRoutes.js
 * @description Routes Express pour la gestion des groupes de tontine et adhésions.
 * @module routes/groupRoutes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createGroup,
  getMyGroups,
  getGroupById,
  joinGroupWithCode,
  validateMembership,
  deleteGroup
} = require('../controllers/groupController');
const { protect } = require('../middlewares/auth');
const { verifyChefDeTontine, verifyGroupMember } = require('../middlewares/roles');

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

// Validations pour la création de groupe
const createGroupValidation = [
  body('nom').trim().notEmpty().withMessage('Le nom du groupe est requis.'),
  body('montantCotisation')
    .isFloat({ min: 1 })
    .withMessage('Le montant de la cotisation doit être un nombre positif.'),
  body('dateDemarrage').isISO8601().withMessage('Une date de démarrage valide est requise.'),
  body('nombreMaxMembres')
    .isInt({ min: 2, max: 100 })
    .withMessage('Le nombre maximal de membres doit être compris entre 2 et 100.')
];

// Routes protégées des groupes
router.use(protect);

router
  .route('/')
  .post(verifyChefDeTontine, createGroupValidation, validate, createGroup)
  .get(getMyGroups);

router.post('/join', body('codeInvitation').notEmpty().withMessage('Code d\'invitation requis.'), validate, joinGroupWithCode);

router.get('/:id', verifyGroupMember, getGroupById);
router.delete('/:id', deleteGroup);

router.put('/:groupId/members/:membershipId/validate', validateMembership);

module.exports = router;
