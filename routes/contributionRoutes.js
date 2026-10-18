/**
 * @file contributionRoutes.js
 * @description Routes Express pour l'enregistrement et la validation des cotisations.
 * @module routes/contributionRoutes
 */

const express = require('express');
const {
  declareContribution,
  getGroupContributions,
  validateContribution
} = require('../controllers/contributionController');
const { protect } = require('../middlewares/auth');
const { verifyGroupMember } = require('../middlewares/roles');
const { handleReceiptUpload } = require('../middlewares/upload');
const { financialRateLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  financialRateLimiter,
  handleReceiptUpload,
  declareContribution
);

router.get('/group/:groupId', verifyGroupMember, getGroupContributions);

router.put('/:id/validate', validateContribution);

module.exports = router;
