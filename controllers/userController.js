/**
 * @file userController.js
 * @description Contrôleur de gestion des profils et paramètres utilisateurs.
 * @module controllers/userController
 */

const User = require('../models/User');

/**
 * @desc Récupérer le profil de l'utilisateur connecté
 * @route GET /api/users/profile
 * @access Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mettre à jour les informations du profil utilisateur
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { nom, prenom, telephone, avatarUrl } = req.body;

    const fieldsToUpdate = {};
    if (nom) fieldsToUpdate.nom = nom;
    if (prenom) fieldsToUpdate.prenom = prenom;
    if (telephone) fieldsToUpdate.telephone = telephone;
    if (avatarUrl !== undefined) fieldsToUpdate.avatarUrl = avatarUrl;

    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Mettre à jour le mot de passe utilisateur
 * @route PUT /api/users/update-password
 * @access Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;

    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({
        success: false,
        error: 'L\'ancien et le nouveau mot de passe sont requis.'
      });
    }

    const user = await User.findById(req.user._id).select('+motDePasse');

    const estValide = await user.comparerMotDePasse(ancienMotDePasse);
    if (!estValide) {
      return res.status(401).json({
        success: false,
        error: 'L\'ancien mot de passe fourni est incorrect.'
      });
    }

    user.motDePasse = nouveauMotDePasse;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès.'
    });
  } catch (error) {
    next(error);
  }
};
