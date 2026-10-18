/**
 * @file payoutRoutes.js
 * @description Routes Express pour la gestion des cagnottes, tours de distribution et défaillances.
 * @module routes/payoutRoutes
 */

const express = require('express');
const {
  getGroupPayouts,
  generatePayoutSchedule,
  distributePayout,
  checkAndApplyDefaults
} = require('../controllers/payoutController');
const { protect } = require('../middlewares/auth');
const { verifyGroupMember } = require('../middlewares/roles');

const router = express.Router();

router.use(protect);

router.get('/group/:groupId', verifyGroupMember, getGroupPayouts);
router.post('/group/:groupId/generate', generatePayoutSchedule);
router.put('/:id/distribute', distributePayout);
router.post('/group/:groupId/check-defaults', checkAndApplyDefaults);

module.exports = router;
