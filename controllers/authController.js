/**
 * @file authController.js
 * @description Contrôleur d'authentification (Inscription, Connexion, Refresh Token, Déconnexion).
 * @module controllers/authController
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

/**
 * Génère et retourne les tokens d'accès et de rafraîchissement avec réponse formatée.
 */
const sendTokenResponse = async (user, statusCode, res) => {
  const token = user.genererJWT();
  const refreshToken = user.genererRefreshToken();

  // Enregistrement du refresh token dans le document utilisateur
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const optionsCookie = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, optionsCookie)
    .json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
};

/**
 * @desc Inscription d'un nouvel utilisateur
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res, next) => {
  try {
    const { nom, prenom, email, telephone, motDePasse, role } = req.body;

    // Vérification d'existence préalable
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'Cette adresse e-mail est déjà utilisée par un autre compte.'
      });
    }

    // Protection : Seuls MEMBRE ou CHEF_DE_TONTINE peuvent être créés directement en public
    const userRole = ['CHEF_DE_TONTINE', 'MEMBRE'].includes(role) ? role : 'MEMBRE';

    const user = await User.create({
      nom,
      prenom,
      email,
      telephone,
      motDePasse,
      role: userRole
    });

    await sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Connexion d'un utilisateur
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, motDePasse } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un e-mail et un mot de passe.'
      });
    }

    // Recherche de l'utilisateur avec sélection explicite du mot de passe
    const user = await User.findOne({ email }).select('+motDePasse');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants de connexion non valides.'
      });
    }

    const estValide = await user.comparerMotDePasse(motDePasse);
    if (!estValide) {
      return res.status(401).json({
        success: false,
        error: 'Identifiants de connexion non valides.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Votre compte est suspendu. Veuillez contacter l\'administration.'
      });
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Renouvellement du jeton d'accès via Refresh Token
 * @route POST /api/auth/refresh
 * @access Public
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Jeton de rafraîchissement requis.'
      });
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Jeton de rafraîchissement invalide ou révoqué.'
      });
    }

    const newAccessToken = user.genererJWT();
    res.status(200).json({
      success: true,
      token: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Jeton de rafraîchissement expiré ou altéré.'
    });
  }
};

/**
 * @desc Récupérer le profil de l'utilisateur connecté
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Déconnexion de l'utilisateur
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.refreshToken = undefined;
      await req.user.save({ validateBeforeSave: false });
    }

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Déconnexion effectuée avec succès.'
    });
  } catch (error) {
    next(error);
  }
};
