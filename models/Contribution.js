/**
 * @file Contribution.js
 * @description Modèle de données Mongoose représentant une cotisation individuelle et son justificatif.
 * @module models/Contribution
 */

const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'L\'identifiant du groupe est obligatoire.']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'identifiant du membre cotisant est obligatoire.']
    },
    tourNumber: {
      type: Number,
      required: [true, 'Le numéro du tour de tontine est obligatoire.'],
      min: 1
    },
    montant: {
      type: Number,
      required: [true, 'Le montant de la cotisation est obligatoire.'],
      min: [1, 'Le montant doit être supérieur à zéro.']
    },
    referenceTransaction: {
      type: String,
      required: [true, 'La référence de transaction Mobile Money/Virement est obligatoire.'],
      trim: true
    },
    recuUrl: {
      type: String,
      required: [true, 'L\'URL du reçu de paiement sur Cloudinary est obligatoire.']
    },
    recuPublicId: {
      type: String,
      required: [true, 'L\'identifiant public Cloudinary est obligatoire.']
    },
    statut: {
      type: String,
      enum: ['EN_ATTENTE_DE_VALIDATION', 'PAYE', 'EN_RETARD', 'A_CORRIGER', 'DEFAILLANT'],
      default: 'EN_ATTENTE_DE_VALIDATION'
    },
    motifRejet: {
      type: String,
      default: ''
    },
    validePar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dateDeclaration: {
      type: Date,
      default: Date.now
    },
    dateValidation: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexation pour éviter les doublons de versement pour le même tour dans un groupe
contributionSchema.index({ group: 1, user: 1, tourNumber: 1 }, { unique: true });
contributionSchema.index({ group: 1, statut: 1 });

module.exports = mongoose.model('Contribution', contributionSchema);
