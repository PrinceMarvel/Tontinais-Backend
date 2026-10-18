/**
 * @file roles.js
 * @description Middlewares de contrôle d'accès basés sur les rôles (RBAC) et la propriété de groupe.
 * @module middlewares/roles
 */

const Membership = require('../models/Membership');

/**
 * Restreint l'accès aux administrateurs (Super Admin et Modérateur Financier).
 */
const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Utilisateur non authentifié.'
    });
  }

  const allowedRoles = ['SUPER_ADMIN', 'MODERATEUR_FINANCIER'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Permission insuffisante. Accès réservé à l\'administration.'
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

    const membership = await Membership.findOne({
      group: groupId,
      user: req.user._id,
      status: 'ACTIF'
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Vous n\'êtes pas membre actif de ce groupe de tontine.'
      });
    }

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
