/**
 * @file Contribution.js
 * @description Modèle de données Mongoose représentant une cotisation 100% directe par Mobile Money / Wallet.
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
    walletProvider: {
      type: String,
      required: [true, 'Le portefeuille Mobile Money est obligatoire.'],
      enum: {
        values: ['ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'MOOV', 'AUTRE'],
        message: 'Opérateur de portefeuille non supporté.'
      },
      default: 'ORANGE_MONEY'
    },
    walletPhone: {
      type: String,
      required: [true, 'Le numéro de téléphone du portefeuille est obligatoire.'],
      trim: true
    },
    referenceTransaction: {
      type: String,
      required: [true, 'La référence de transaction est obligatoire.'],
      unique: true,
      trim: true
    },
    gatewayTransactionId: {
      type: String,
      trim: true,
      default: ''
    },
    statut: {
      type: String,
      enum: {
        values: ['EN_ATTENTE_USSD', 'PAYE', 'EN_RETARD', 'ECHOUE', 'DEFAILLANT'],
        message: 'Statut de cotisation non reconnu.'
      },
      default: 'EN_ATTENTE_USSD'
    },
    datePaiement: {
      type: Date
    },
    motifEchec: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexation pour éviter les doublons de cotisation pour le même tour dans un groupe
contributionSchema.index({ group: 1, user: 1, tourNumber: 1 }, { unique: true });
contributionSchema.index({ group: 1, statut: 1 });
contributionSchema.index({ user: 1, statut: 1 });
contributionSchema.index({ referenceTransaction: 1 });

module.exports = mongoose.model('Contribution', contributionSchema);
