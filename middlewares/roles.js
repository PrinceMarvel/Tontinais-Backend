/**
 * @file roles.js
 * @description Middlewares de contrôle d'accès basés sur les rôles (RBAC) et la propriété de groupe.
 * @module middlewares/roles
 */

const Group = require('../models/Group');
const Membership = require('../models/Membership');

/**
 * Restreint l'accès strictement au Super Admin (Créateur et Lead de l'application).
 */
const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Utilisateur non authentifié.'
    });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Permission insuffisante. Accès strictement réservé au Créateur et Administrateur principal.'
    });
  }

  next();
};

/**
 * Restreint l'accès aux Chefs de Tontine et aux Administrateurs.
 */
const verifyChefDeTontine = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Utilisateur non authentifié.'
    });
  }

  const allowedRoles = ['CHEF_DE_TONTINE', 'SUPER_ADMIN'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Permission refusée. Cette action nécessite le statut de Chef de Tontine.'
    });
  }

  next();
};

/**
 * Vérifie que l'utilisateur connecté est membre actif du groupe spécifié dans l'URL.
 * Prévient les attaques BOLA / IDOR.
 */
const verifyGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.params.id;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Identifiant du groupe manquant dans la requête.'
      });
    }

    // Un Super Admin a accès d'office pour supervision
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Vérifier l'existence du groupe
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe de tontine non trouvé.'
      });
    }

    // Le Chef de Tontine créateur possède un accès de plein droit
    if (group.chefDeTontine && group.chefDeTontine.toString() === req.user._id.toString()) {
      req.group = group;
      return next();
    }

    // Vérifier l'adhésion de l'utilisateur (actif ou en attente)
    const membership = await Membership.findOne({
      group: groupId,
      user: req.user._id,
      statut: { $in: ['ACTIF', 'EN_ATTENTE'] }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Vous ne faites pas partie de ce groupe de tontine.'
      });
    }

    req.group = group;
    req.membership = membership;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyAdmin,
  verifyChefDeTontine,
  verifyGroupMember
};
