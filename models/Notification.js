/**
 * @file Notification.js
 * @description Modèle de données Mongoose représentant les alertes et notifications d'activité financière.
 * @module models/Notification
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'identifiant de l\'utilisateur destinataire est obligatoire.']
    },
    titre: {
      type: String,
      required: [true, 'Le titre de la notification est obligatoire.'],
      trim: true,
      maxlength: [100, 'Le titre ne peut dépasser 100 caractères.']
    },
    message: {
      type: String,
      required: [true, 'Le message est obligatoire.'],
      trim: true,
      maxlength: [500, 'Le message ne peut dépasser 500 caractères.']
    },
    type: {
      type: String,
      enum: {
        values: ['PAIEMENT_RECU', 'TOUR_GAGNE', 'COTISATION_RAPPEL', 'ADHESION_VALIDEE', 'INFO'],
        message: 'Type de notification invalide.'
      },
      default: 'INFO'
    },
    lien: {
      type: String,
      default: '',
      trim: true
    },
    lu: {
      type: Boolean,
      default: false
    },
    dateLecture: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexation pour l'affichage ultra-rapide des alertes non lues de l'utilisateur
notificationSchema.index({ user: 1, lu: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

