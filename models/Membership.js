/**
 * @file Membership.js
 * @description Modèle de données Mongoose représentant l'adhésion et la position d'un membre dans un groupe.
 * @module models/Membership
 */

const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'L\'identifiant du groupe est obligatoire.']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'identifiant de l\'utilisateur est obligatoire.']
    },
    statut: {
      type: String,
      enum: ['EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'DEFAILLANT', 'REJETE'],
      default: 'EN_ATTENTE'
    },
    rangTour: {
      type: Number,
      default: 0,
      min: 0
    },
    roleDansGroupe: {
      type: String,
      enum: ['MEMBRE', 'CHEF_DE_TONTINE', 'SUPPLEANT'],
      default: 'MEMBRE'
    },
    fondsGarantieContribue: {
      type: Number,
      default: 0
    },
    dateValidation: {
      type: Date
    },
    motifSuspension: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Unicité : un utilisateur ne peut faire qu'une seule demande/adhésion par groupe
membershipSchema.index({ group: 1, user: 1 }, { unique: true });
membershipSchema.index({ group: 1, statut: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
