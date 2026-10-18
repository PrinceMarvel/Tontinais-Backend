/**
 * @file payoutController.js
 * @description Contrôleur d'orchestration des distributions de cagnottes et de détection des membres défaillants.
 * @module controllers/payoutController
 */

const Payout = require('../models/Payout');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const Contribution = require('../models/Contribution');

/**
 * @desc Obtenir le calendrier des versements de cagnotte d'un groupe
 * @route GET /api/payouts/group/:groupId
 * @access Private (Membre du groupe)
 */
exports.getGroupPayouts = async (req, res, next) => {
  try {
    const payouts = await Payout.find({ group: req.params.groupId })
      .populate('beneficiaire', 'nom prenom email telephone avatarUrl')
      .sort({ tourNumber: 1 });

    res.status(200).json({
      success: true,
      count: payouts.length,
      payouts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Initialiser et générer le planning des tours pour le groupe
 * @route POST /api/payouts/group/:groupId/generate
 * @access Private (Chef de Tontine)
 */
exports.generatePayoutSchedule = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Groupe non trouvé.' });
    }

    if (group.chefDeTontine.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Accès réservé au Chef de Tontine.' });
    }

    const members = await Membership.find({ group: group._id, statut: 'ACTIF' }).sort({ rangTour: 1 });
    if (members.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun membre actif dans ce groupe.' });
    }

    const totalCagnotte = group.montantCotisation * members.length;
    const payoutsCreated = [];

    let dateCourante = new Date(group.dateDemarrage);

    for (let i = 0; i < members.length; i++) {
      const tourNum = i + 1;

      // Calcul des dates selon la fréquence
      const datePrevue = new Date(dateCourante);
      if (group.frequence === 'HEBDOMADAIRE') {
        dateCourante.setDate(dateCourante.getDate() + 7);
      } else if (group.frequence === 'BI_MENSUEL') {
        dateCourante.setDate(dateCourante.getDate() + 14);
      } else {
        dateCourante.setMonth(dateCourante.getMonth() + 1);
      }

      const payout = await Payout.findOneAndUpdate(
        { group: group._id, tourNumber: tourNum },
        {
          group: group._id,
          tourNumber: tourNum,
          beneficiaire: members[i].user,
          montantTotal: totalCagnotte,
          datePrevue,
          statut: 'PLANIFIE'
        },
        { upsert: true, new: true }
      );
      payoutsCreated.push(payout);
    }

    group.statut = 'EN_COURS';
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Planning des tours généré avec succès.',
      payouts: payoutsCreated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Marquer la cagnotte d'un tour comme distribuée au bénéficiaire
 * @route PUT /api/payouts/:id/distribute
 * @access Private (Chef de Tontine)
 */
exports.distributePayout = async (req, res, next) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ success: false, error: 'Tour de distribution non trouvé.' });
    }

    const group = await Group.findById(payout.group);
    if (group.chefDeTontine.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Accès réservé au Chef de Tontine.' });
    }

    payout.statut = 'DISTRIBUE';
    payout.dateEffective = new Date();
    await payout.save();

    res.status(200).json({
      success: true,
      message: 'Cagnotte marquée comme distribuée avec succès.',
      payout
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Traitement des cas limites : Basculement automatique en Défaillant si délai de grâce dépassé
 * @route POST /api/payouts/group/:groupId/check-defaults
 * @access Private (Chef de Tontine / Admin)
 */
exports.checkAndApplyDefaults = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, error: 'Groupe non trouvé.' });

    const activeMembers = await Membership.find({ group: group._id, statut: 'ACTIF' });
    const dureeGraceMs = group.dureeGraceJours * 24 * 60 * 60 * 1000;
    const maintenant = new Date();

    const resultats = [];

    for (const m of activeMembers) {
      // Recherche de la dernière cotisation payée ou en attente
      const cotis = await Contribution.findOne({
        group: group._id,
        user: m.user,
        statut: { $in: ['PAYE', 'EN_ATTENTE_DE_VALIDATION'] }
      });

      if (!cotis) {
        // Délais dépassés depuis le démarrage ou le dernier tour
        const dateLimite = new Date(group.dateDemarrage.getTime() + dureeGraceMs);
        if (maintenant > dateLimite) {
          m.statut = 'DEFAILLANT';
          m.motifSuspension = 'Dépassement automatique du délai de grâce sans justificatif.';
          await m.save();
          resultats.push({ user: m.user, statut: 'DEFAILLANT' });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Analyse des défaillances exécutée.',
      impactedMembers: resultats
    });
  } catch (error) {
    next(error);
  }
};
