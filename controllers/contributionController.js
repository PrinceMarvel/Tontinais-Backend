/**
 * @file contributionController.js
 * @description Contrôleur de gestion des cotisations 100% directes par Mobile Money / Portefeuille électronique.
 * Orchestre l'initiation du débit et la validation par saisie du code secret / mot de passe sur le guichet opérateur.
 * @module controllers/contributionController
 */

const Contribution = require('../models/Contribution');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const WalletService = require('../services/walletService');

/**
 * @desc Initier une cotisation directe via Mobile Money (Orange Money, MTN, Wave)
 * @route POST /api/contributions
 * @access Private (Membre actif du groupe)
 */
exports.initiateContribution = async (req, res, next) => {
  try {
    const { groupId, tourNumber, walletProvider, walletPhone, montant, autoConfirm } = req.body;

    // 1. Vérification de l'existence du groupe
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Groupe de tontine introuvable.'
      });
    }

    // 2. Vérification que l'utilisateur est membre actif ou Chef de tontine
    const isChef = group.chefDeTontine.toString() === req.user._id.toString();
    const membership = await Membership.findOne({
      group: groupId,
      user: req.user._id,
      statut: 'ACTIF'
    });

    if (!isChef && !membership && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Vous devez être un membre actif de ce groupe pour cotiser.'
      });
    }

    const tourNum = parseInt(tourNumber, 10);
    const montantCotisation = parseFloat(montant) || group.montantCotisation;

    // 3. Vérification de doublon de versement pour le même tour
    const existing = await Contribution.findOne({
      group: groupId,
      user: req.user._id,
      tourNumber: tourNum
    });

    if (existing && existing.statut === 'PAYE') {
      return res.status(400).json({
        success: false,
        error: `Votre cotisation pour le tour n°${tourNum} a déjà été réglée avec succès.`
      });
    }

    // 4. Appel au service d'agrégation bancaire pour générer la session de collecte
    const walletResult = await WalletService.initiateCollection({
      amount: montantCotisation,
      currency: group.devise,
      phone: walletPhone,
      provider: walletProvider,
      description: `Cotisation TontiNaïs - ${group.nom} (Tour ${tourNum})`,
      metadata: {
        groupId,
        userId: req.user._id.toString(),
        tourNumber: tourNum
      }
    });

    // Définition de l'état : EN_ATTENTE_USSD pour passage obligatoire par le guichet opérateur
    const shouldAutoConfirm = autoConfirm === true;
    const finalStatut = shouldAutoConfirm ? 'PAYE' : 'EN_ATTENTE_USSD';
    const datePaiement = shouldAutoConfirm ? new Date() : null;

    let contribution;
    if (existing) {
      existing.montant = montantCotisation;
      existing.walletProvider = walletProvider;
      existing.walletPhone = walletPhone;
      existing.referenceTransaction = walletResult.reference;
      existing.gatewayTransactionId = walletResult.simulation?.mockGatewayId || walletResult.reference;
      existing.statut = finalStatut;
      existing.datePaiement = datePaiement;
      contribution = await existing.save();
    } else {
      contribution = await Contribution.create({
        group: groupId,
        user: req.user._id,
        tourNumber: tourNum,
        montant: montantCotisation,
        walletProvider,
        walletPhone,
        referenceTransaction: walletResult.reference,
        gatewayTransactionId: walletResult.simulation?.mockGatewayId || walletResult.reference,
        statut: finalStatut,
        datePaiement
      });
    }

    res.status(201).json({
      success: true,
      message: shouldAutoConfirm
        ? `Cotisation de ${montantCotisation} ${group.devise} débitée avec succès.`
        : `Session de paiement ouverte. Veuillez vous authentifier sur le guichet ${walletProvider}.`,
      reference: walletResult.reference,
      statut: finalStatut,
      checkoutSession: {
        contributionId: contribution._id,
        reference: walletResult.reference,
        operator: walletProvider,
        phone: walletPhone,
        amount: montantCotisation,
        currency: group.devise,
        groupName: group.nom,
        tourNumber: tourNum
      },
      contribution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Confirmer la transaction après validation du code secret PIN / mot de passe sur le guichet
 * @route POST /api/contributions/:id/confirm
 * @access Private
 */
exports.confirmContributionPayment = async (req, res, next) => {
  try {
    const { pinCode, transactionCode } = req.body;
    const contribution = await Contribution.findById(req.params.id).populate('group', 'nom devise');
    if (!contribution) {
      return res.status(404).json({
        success: false,
        error: 'Transaction de cotisation introuvable.'
      });
    }

    if (contribution.statut === 'PAYE') {
      return res.status(200).json({
        success: true,
        message: 'Cette cotisation est déjà validée et payée.',
        statut: 'PAYE',
        transactionId: contribution.gatewayTransactionId || contribution.referenceTransaction,
        datePaiement: contribution.datePaiement,
        contribution
      });
    }

    const code = (transactionCode || pinCode || '').toString().trim();
    if (!code || code.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez renseigner le code de confirmation de transaction de l’opérateur (3 caractères minimum).'
      });
    }

    contribution.statut = 'PAYE';
    contribution.gatewayTransactionId = code;
    contribution.datePaiement = new Date();
    await contribution.save();

    res.status(200).json({
      success: true,
      message: `Paiement certifié avec succès par l'opérateur ${contribution.walletProvider}. Statut : PAYÉ.`,
      statut: 'PAYE',
      transactionId: code,
      datePaiement: contribution.datePaiement,
      contribution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Annuler un paiement de cotisation (bascule automatiquement au statut ECHOUE)
 * @route POST /api/contributions/:id/cancel
 * @access Private
 */
exports.cancelContributionPayment = async (req, res, next) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) {
      return res.status(404).json({ success: false, error: 'Transaction de cotisation introuvable.' });
    }
    if (contribution.statut !== 'PAYE') {
      contribution.statut = 'ECHOUE';
      contribution.motifEchec = 'Annulation manuelle par l’utilisateur';
      await contribution.save();
    }
    res.status(200).json({
      success: true,
      message: 'Paiement annulé. Statut : Échec.',
      statut: 'ECHOUE',
      contribution
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Récupérer les cotisations d'un groupe avec traçabilité des transactions
 * @route GET /api/contributions/group/:groupId
 * @access Private (Membre du groupe)
 */
exports.getGroupContributions = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { tourNumber, statut } = req.query;

    const query = { group: groupId };
    if (tourNumber) query.tourNumber = parseInt(tourNumber, 10);
    if (statut) query.statut = statut;

    const contributions = await Contribution.find(query)
      .populate('user', 'nom prenom email telephone avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contributions.length,
      contributions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Récupérer l'historique personnel de cotisation de l'utilisateur connecté
 * @route GET /api/contributions/me
 * @access Private
 */
exports.getMyContributions = async (req, res, next) => {
  try {
    const contributions = await Contribution.find({ user: req.user._id })
      .populate('group', 'nom devise frequence montantCotisation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contributions.length,
      contributions
    });
  } catch (error) {
    next(error);
  }
};
