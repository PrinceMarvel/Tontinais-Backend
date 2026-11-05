/**
 * @file Payout.js
 * @description Modèle de données Mongoose représentant l'attribution et le versement 100% direct sur portefeuille de la cagnotte.
 * @module models/Payout
 */

const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'L\'identifiant du groupe est obligatoire.']
    },
    tourNumber: {
      type: Number,
      required: [true, 'Le numéro du tour de distribution est obligatoire.'],
      min: 1
    },
    beneficiaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le bénéficiaire de la cagnotte est obligatoire.']
    },
    montantTotal: {
      type: Number,
      required: [true, 'Le montant total de la cagnotte est obligatoire.'],
      min: [1, 'Le montant doit être supérieur à zéro.']
    },
    datePrevue: {
      type: Date,
      required: [true, 'La date prévue de distribution est obligatoire.']
    },
    dateEffective: {
      type: Date
    },
    modeDistribution: {
      type: String,
      enum: ['WALLET_DIRECT'],
      default: 'WALLET_DIRECT'
    },
    walletProvider: {
      type: String,
      enum: ['ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'MOOV', 'AIRTEL_MONEY', 'MPESA', 'FREE_MONEY', 'TMONEY', 'CARTE_BANCAIRE', 'AUTRE'],
      default: 'ORANGE_MONEY'
    },
    walletPhone: {
      type: String,
      trim: true,
      default: ''
    },
    transactionReference: {
      type: String,
      trim: true,
      default: ''
    },
    gatewayDisbursementId: {
      type: String,
      trim: true,
      default: ''
    },
    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    statut: {
      type: String,
      enum: ['PLANIFIE', 'EN_COURS', 'DISTRIBUE', 'BLOQUE'],
      default: 'PLANIFIE'
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

// Unicité : un seul payout par tour par groupe
payoutSchema.index({ group: 1, tourNumber: 1 }, { unique: true });
payoutSchema.index({ beneficiaire: 1, statut: 1 });
payoutSchema.index({ group: 1, statut: 1 });

module.exports = mongoose.model('Payout', payoutSchema);
