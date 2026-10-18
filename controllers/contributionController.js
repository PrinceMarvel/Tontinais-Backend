/**
 * @file contributionController.js
 * @description Contrôleur de gestion des cotisations, envoi de reçus sur Cloudinary et validation par le Chef de Tontine.
 * @module controllers/contributionController
 */

const Contribution = require('../models/Contribution');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * @desc Déclarer une cotisation avec téléversement du reçu sur Cloudinary
 * @route POST /api/contributions
 * @access Private (Membre du groupe)
 */
exports.declareContribution = async (req, res, next) => {
  try {
    const { groupId, tourNumber, referenceTransaction, montant } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez joindre une preuve ou un reçu de paiement (image).'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe de tontine non trouvé.'
      });
    }

    // Téléversement sécurisé de l'image sur Cloudinary
    const cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      'tontinais/recettes'
    );

    // Enregistrement de la déclaration
    const contribution = await Contribution.create({
      group: groupId,
      user: req.user._id,
      tourNumber: parseInt(tourNumber, 10),
      montant: parseFloat(montant) || group.montantCotisation,
      referenceTransaction,
      recuUrl: cloudinaryResult.secure_url,
      recuPublicId: cloudinaryResult.public_id,
      statut: 'EN_ATTENTE_DE_VALIDATION',
      dateDeclaration: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Justificatif téléversé avec succès. Votre cotisation est en attente de validation.',
      contribution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Récupérer les cotisations d'un groupe (filtrables par tour ou statut)
 * @route GET /api/contributions/group/:groupId
 * @access Private (Membre du groupe)
 */
exports.getGroupContributions = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { tourNumber, statut } = req.query;

    const query = { group: groupId };
    if (tourNumber) query.tourNumber = parseInt(tourNumber, 10);
    if (statut) query.statut = statut;

    const contributions = await Contribution.find(query)
      .populate('user', 'nom prenom email avatarUrl')
      .populate('validePar', 'nom prenom')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contributions.length,
      contributions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Valider ou rejeter une cotisation par le Chef de Tontine
 * @route PUT /api/contributions/:id/validate
 * @access Private (Chef de Tontine du groupe)
 */
exports.validateContribution = async (req, res, next) => {
  try {
    const { statut, motifRejet } = req.body; // statut: 'PAYE', 'EN_RETARD', 'A_CORRIGER'

    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      return res.status(404).json({
        success: false,
        error: 'Déclaration de cotisation introuvable.'
      });
    }

    const group = await Group.findById(contribution.group);
    if (group.chefDeTontine.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Seul le Chef de Tontine de ce groupe est autorisé à valider les versements.'
      });
    }

    if (!['PAYE', 'EN_RETARD', 'A_CORRIGER'].includes(statut)) {
      return res.status(400).json({
        success: false,
        error: 'Statut de validation invalide. Choisissez PAYE, EN_RETARD ou A_CORRIGER.'
      });
    }

    contribution.statut = statut;
    contribution.validePar = req.user._id;
    contribution.dateValidation = new Date();
    if (motifRejet) contribution.motifRejet = motifRejet;

    await contribution.save();

    res.status(200).json({
      success: true,
      message: `La cotisation a été marquée comme : ${statut}.`,
      contribution
    });
  } catch (error) {
    next(error);
  }
};
