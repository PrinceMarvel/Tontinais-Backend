/**
 * @file Payout.js
 * @description Modèle de données Mongoose représentant l'attribution et le versement d'une cagnotte de tour.
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

module.exports = mongoose.model('Payout', payoutSchema);
