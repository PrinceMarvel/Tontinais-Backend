/**
 * @file User.js
 * @description Modèle de données Mongoose représentant un utilisateur de la plateforme TontiNaïs.
 * @module models/User
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom est obligatoire.'],
      trim: true,
      maxlength: [50, 'Le nom ne peut dépasser 50 caractères.']
    },
    prenom: {
      type: String,
      required: [true, 'Le prénom est obligatoire.'],
      trim: true,
      maxlength: [50, 'Le prénom ne peut dépasser 50 caractères.']
    },
    email: {
      type: String,
      required: [true, 'L\'adresse e-mail est obligatoire.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Veuillez fournir une adresse e-mail valide.'
      ]
    },
    telephone: {
      type: String,
      required: [true, 'Le numéro de téléphone est obligatoire.'],
      trim: true
    },
    paysCode: {
      type: String,
      default: '',
      trim: true
    },
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire.'],
      minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères.'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['MEMBRE', 'CHEF_DE_TONTINE', 'MODERATEUR_FINANCIER', 'SUPER_ADMIN'],
        message: 'Rôle utilisateur non valide.'
      },
      default: 'MEMBRE'
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    refreshToken: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true
  }
);

/**
 * Hook Mongoose exécuté avant l'enregistrement pour hacher le mot de passe.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) {
    return next();
  }
  const salt = await bcrypt.genSalt(env.SALT_ROUNDS);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
  next();
});

/**
 * Compare le mot de passe fourni avec le hash en base de données.
 * @param {string} motDePasseSaisi Mot de passe en clair.
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparerMotDePasse = async function (motDePasseSaisi) {
  return await bcrypt.compare(motDePasseSaisi, this.motDePasse);
};

/**
 * Génère un jeton d'accès JWT signé.
 * @returns {string} Token JWT d'accès.
 */
userSchema.methods.genererJWT = function () {
  return jwt.sign(
    { id: this._id, role: this.role, email: this.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRE }
  );
};

/**
 * Génère un jeton de rafraîchissement (Refresh Token) JWT signé.
 * @returns {string} Token JWT de rafraîchissement.
 */
userSchema.methods.genererRefreshToken = function () {
  return jwt.sign({ id: this._id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRE
  });
};

module.exports = mongoose.model('User', userSchema);
