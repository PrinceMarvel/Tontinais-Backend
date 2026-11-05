/**
 * @file groupController.js
 * @description Contrôleur de gestion des groupes de tontine, invitations et adhésions.
 * @module controllers/groupController
 */

const crypto = require('crypto');
const QRCode = require('qrcode');
const Group = require('../models/Group');
const Membership = require('../models/Membership');

/**
 * @desc Créer un nouveau groupe de tontine
 * @route POST /api/groups
 * @access Private (CHEF_DE_TONTINE, SUPER_ADMIN)
 */
exports.createGroup = async (req, res, next) => {
  try {
    const {
      nom,
      description,
      montantCotisation,
      devise,
      frequence,
      dateDemarrage,
      nombreMaxMembres,
      dureeGraceJours
    } = req.body;

    // Génération d'un code d'invitation aléatoire et sécurisé de 8 caractères
    const codeInvitation = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Génération du QR Code Data URL pour partage immédiat
    const invitePayload = JSON.stringify({ code: codeInvitation, nom });
    const qrCodeUrl = await QRCode.toDataURL(invitePayload);

    const group = await Group.create({
      nom,
      description,
      montantCotisation,
      devise: devise || 'XAF',
      frequence: frequence || 'MENSUEL',
      dateDemarrage,
      nombreMaxMembres,
      dureeGraceJours: dureeGraceJours || 2,
      chefDeTontine: req.user._id,
      codeInvitation,
      qrCodeUrl,
      statut: 'CREE'
    });

    // Création automatique de l'adhésion pour le Chef de Tontine
    await Membership.create({
      group: group._id,
      user: req.user._id,
      statut: 'ACTIF',
      roleDansGroupe: 'CHEF_DE_TONTINE',
      rangTour: 0,
      dateValidation: new Date()
    });

    res.status(201).json({
      success: true,
      group
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Récupérer tous les groupes de l'utilisateur connecté
 * @route GET /api/groups
 * @access Private
 */
exports.getMyGroups = async (req, res, next) => {
  try {
    const memberships = await Membership.find({
      user: req.user._id,
      statut: { $in: ['ACTIF', 'EN_ATTENTE'] }
    }).populate({
      path: 'group',
      populate: { path: 'chefDeTontine', select: 'nom prenom email' }
    });

    const groups = memberships.map((m) => ({
      ...m.group.toObject(),
      membershipStatus: m.statut,
      roleDansGroupe: m.roleDansGroupe,
      rangTour: m.rangTour
    }));

    res.status(200).json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Récupérer les détails d'un groupe spécifique avec la liste des membres
 * @route GET /api/groups/:id
 * @access Private
 */
exports.getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      'chefDeTontine',
      'nom prenom email telephone avatarUrl'
    );

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe de tontine non trouvé.'
      });
    }

    const members = await Membership.find({ group: group._id })
      .populate('user', 'nom prenom email telephone avatarUrl')
      .sort({ rangTour: 1 });

    res.status(200).json({
      success: true,
      group,
      members
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Demander l'adhésion à un groupe via son code d'invitation
 * @route POST /api/groups/join
 * @access Private
 */
exports.joinGroupWithCode = async (req, res, next) => {
  try {
    const { codeInvitation } = req.body;

    if (!codeInvitation) {
      return res.status(400).json({
        success: false,
        error: 'Le code d\'invitation est requis.'
      });
    }

    const group = await Group.findOne({ codeInvitation: codeInvitation.toUpperCase() });
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Aucun groupe trouvé avec ce code d\'invitation.'
      });
    }

    // Vérification du nombre maximal de membres
    const activeMembersCount = await Membership.countDocuments({
      group: group._id,
      statut: 'ACTIF'
    });

    if (activeMembersCount >= group.nombreMaxMembres) {
      return res.status(400).json({
        success: false,
        error: 'Ce groupe de tontine a déjà atteint sa capacité maximale de membres.'
      });
    }

    // Création ou mise à jour de la demande d'adhésion
    const existingMembership = await Membership.findOne({
      group: group._id,
      user: req.user._id
    });

    if (existingMembership) {
      if (existingMembership.statut === 'ACTIF') {
        return res.status(400).json({
          success: false,
          error: 'Vous êtes déjà membre actif de ce groupe.'
        });
      }
      if (existingMembership.statut === 'EN_ATTENTE') {
        return res.status(400).json({
          success: false,
          error: 'Votre demande d\'adhésion pour ce groupe est déjà en cours de validation.'
        });
      }
    }

    const membership = await Membership.create({
      group: group._id,
      user: req.user._id,
      statut: 'EN_ATTENTE'
    });

    res.status(201).json({
      success: true,
      message: 'Demande d\'adhésion soumise avec succès au Chef de Tontine.',
      group,
      membership
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Valider ou rejeter une demande d'adhésion (Chef de Tontine en 1-clic)
 * @route PUT /api/groups/:groupId/members/:membershipId/validate
 * @access Private (Chef de Tontine du groupe)
 */
exports.validateMembership = async (req, res, next) => {
  try {
    const { action, rangTour } = req.body; // action: 'APPROUVER' ou 'REJETER'

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe non trouvé.'
      });
    }

    if (group.chefDeTontine.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Seul le Chef de Tontine de ce groupe peut valider les membres.'
      });
    }

    const membership = await Membership.findById(req.params.membershipId);
    if (!membership) {
      return res.status(404).json({
        success: false,
        error: 'Demande d\'adhésion non trouvée.'
      });
    }

    if (action === 'APPROUVER') {
      membership.statut = 'ACTIF';
      membership.dateValidation = new Date();
      if (rangTour) membership.rangTour = rangTour;
    } else if (action === 'REJETER') {
      membership.statut = 'REJETE';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Action invalide. Utilisez APPROUVER ou REJETER.'
      });
    }

    await membership.save();

    res.status(200).json({
      success: true,
      message: `La demande d'adhésion a été ${action === 'APPROUVER' ? 'approuvée' : 'rejetée'}.`,
      membership
    });
  } catch (error) {
    next(error);
  }
};
