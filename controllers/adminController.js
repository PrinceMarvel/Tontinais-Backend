/**
 * @file adminController.js
 * @description Contrôleur d'administration centrale, supervision des litiges et gestion multi-comptes admin.
 * @module controllers/adminController
 */

const User = require('../models/User');
const Group = require('../models/Group');
const Contribution = require('../models/Contribution');
const Payout = require('../models/Payout');

/**
 * @desc Obtenir les statistiques globales pour le Dashboard Administrateur
 * @route GET /api/admin/dashboard
 * @access Private (SUPER_ADMIN, MODERATEUR_FINANCIER)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUtilisateurs = await User.countDocuments();
    const totalGroupes = await Group.countDocuments();
    const totalCotisations = await Contribution.countDocuments({ statut: 'PAYE' });
    const cotisationsEnAttente = await Contribution.countDocuments({ statut: 'EN_ATTENTE_DE_VALIDATION' });
    const totalPayoutsDistribues = await Payout.countDocuments({ statut: 'DISTRIBUE' });

    res.status(200).json({
      success: true,
      stats: {
        totalUtilisateurs,
        totalGroupes,
        totalCotisations,
        cotisationsEnAttente,
        totalPayoutsDistribues
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Récupérer la liste complète des utilisateurs avec filtre
 * @route GET /api/admin/users
 * @access Private (SUPER_ADMIN)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Modifier le rôle ou désactiver le compte d'un utilisateur (Gestion multi-comptes Admin)
 * @route PUT /api/admin/users/:id/role
 * @access Private (SUPER_ADMIN)
 */
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé.'
      });
    }

    if (role) {
      if (!['MEMBRE', 'CHEF_DE_TONTINE', 'MODERATEUR_FINANCIER', 'SUPER_ADMIN'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Rôle administrateur ou utilisateur non valide.'
        });
      }
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Statut/Rôle utilisateur mis à jour par l\'administration.',
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Superviser l'ensemble des groupes de tontine de la plateforme
 * @route GET /api/admin/groups
 * @access Private (SUPER_ADMIN, MODERATEUR_FINANCIER)
 */
exports.getAllGroups = async (req, res, next) => {
  try {
    const groups = await Group.find()
      .populate('chefDeTontine', 'nom prenom email telephone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (error) {
    next(error);
  }
};
