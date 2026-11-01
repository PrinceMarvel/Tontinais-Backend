/**
 * @file paymentController.js
 * @description Contrôleur de traitement des Webhooks opérateurs et de vérification d'état des transactions directes.
 * @module controllers/paymentController
 */

const Contribution = require('../models/Contribution');
const Payout = require('../models/Payout');
const WalletService = require('../services/walletService');

/**
 * @desc Réception et traitement sécurisé des Webhooks asynchrones des opérateurs Mobile Money
 * @route POST /api/payments/webhook
 * @access Public (Vérification par signature cryptographique HMAC)
 */
exports.handlePaymentWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-wallet-signature'] || req.headers['x-signature'];

    // En environnement de production avec secret configuré, vérification de la signature
    if (process.env.NODE_ENV === 'production') {
      const isValid = WalletService.verifyWebhookSignature(req.body, signature);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Signature de webhook invalide ou tentative de falsification.'
        });
      }
    }

    const { reference, status, operatorTransactionId, failureReason } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Référence de transaction absente.' });
    }

    // 1. Traitement des flux de collecte (Cotisations : TONTI-COLL)
    if (reference.startsWith('TONTI-COLL')) {
      const contribution = await Contribution.findOne({ referenceTransaction: reference });
      if (contribution) {
        if (status === 'SUCCESS' || status === 'CONFIRMED') {
          contribution.statut = 'PAYE';
          contribution.datePaiement = new Date();
          if (operatorTransactionId) {
            contribution.gatewayTransactionId = operatorTransactionId;
          }
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          contribution.statut = 'ECHOUE';
          contribution.motifEchec = failureReason || 'Paiement refusé ou annulé par l\'opérateur.';
        }
        await contribution.save();
      }
    }

    // 2. Traitement des flux de versement (Cagnottes : TONTI-DISB)
    if (reference.startsWith('TONTI-DISB')) {
      const payout = await Payout.findOne({ transactionReference: reference });
      if (payout) {
        if (status === 'SUCCESS' || status === 'CONFIRMED') {
          payout.statut = 'DISTRIBUE';
          payout.dateEffective = new Date();
        } else if (status === 'FAILED') {
          payout.statut = 'BLOQUE';
          payout.notes = `Échec de virement opérateur : ${failureReason || 'Erreur inconnue'}`;
        }
        await payout.save();
      }
    }

    // Réponse rapide 200 OK requise par les agrégateurs de paiement
    res.status(200).json({
      received: true,
      reference,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Vérifier l'état en temps réel d'une transaction directe Mobile Money
 * @route GET /api/payments/status/:reference
 * @access Private
 */
exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const { reference } = req.params;

    // Recherche dans les cotisations
    const contribution = await Contribution.findOne({ referenceTransaction: reference })
      .populate('user', 'nom prenom')
      .populate('group', 'nom devise');

    if (contribution) {
      return res.status(200).json({
        success: true,
        type: 'CONTRIBUTION',
        reference,
        statut: contribution.statut,
        montant: contribution.montant,
        devise: contribution.group?.devise,
        datePaiement: contribution.datePaiement
      });
    }

    // Recherche dans les versements de cagnotte
    const payout = await Payout.findOne({ transactionReference: reference })
      .populate('beneficiaire', 'nom prenom')
      .populate('group', 'nom devise');

    if (payout) {
      return res.status(200).json({
        success: true,
        type: 'PAYOUT',
        reference,
        statut: payout.statut,
        montantTotal: payout.montantTotal,
        devise: payout.group?.devise,
        dateEffective: payout.dateEffective
      });
    }

    res.status(404).json({
      success: false,
      error: `Aucune transaction trouvée pour la référence ${reference}.`
    });
  } catch (error) {
    next(error);
  }
};

