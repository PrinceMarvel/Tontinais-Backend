/**
 * @file Group.js
 * @description Modèle de données Mongoose représentant un groupe de tontine collaborative.
 * @module models/Group
 */

const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: [true, 'Le nom du groupe de tontine est obligatoire.'],
      trim: true,
      maxlength: [80, 'Le nom ne peut dépasser 80 caractères.']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La description ne peut dépasser 500 caractères.']
    },
    montantCotisation: {
      type: Number,
      required: [true, 'Le montant de la cotisation est obligatoire.'],
      min: [1, 'Le montant de la cotisation doit être supérieur à zéro.']
    },
    devise: {
      type: String,
      required: [true, 'La devise est obligatoire.'],
      enum: ['XAF', 'XOF', 'EUR', 'USD'],
      default: 'XAF'
    },
    frequence: {
      type: String,
      required: [true, 'La fréquence de cotisation est obligatoire.'],
      enum: ['HEBDOMADAIRE', 'BI_MENSUEL', 'MENSUEL'],
      default: 'MENSUEL'
    },
    dateDemarrage: {
      type: Date,
      required: [true, 'La date de démarrage de la tontine est obligatoire.']
    },
    nombreMaxMembres: {
      type: Number,
      required: [true, 'Le nombre maximum de participants est obligatoire.'],
      min: [2, 'Un groupe doit contenir au moins 2 participants.'],
      max: [100, 'Un groupe ne peut dépasser 100 participants.']
    },
    chefDeTontine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    statut: {
      type: String,
      enum: ['CREE', 'EN_COURS', 'TERMINE', 'SUSPENDU'],
      default: 'CREE'
    },
    codeInvitation: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    qrCodeUrl: {
      type: String,
      default: ''
    },
    dureeGraceJours: {
      type: Number,
      default: 2,
      min: 0,
      max: 7
    },
    fondsGarantieTotal: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexation pour requêtes rapides par Chef de Tontine et par code d'invitation
groupSchema.index({ chefDeTontine: 1, statut: 1 });

module.exports = mongoose.model('Group', groupSchema);
