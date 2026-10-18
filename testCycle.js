/**
 * @file testCycle.js
 * @description Script de test d'intégration automatisé pour valider le cycle complet de TontiNaïs.
 * @module tests/testCycle
 */

const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');
const Group = require('./models/Group');
const Membership = require('./models/Membership');
const Contribution = require('./models/Contribution');
const Payout = require('./models/Payout');

const TEST_PORT = 5002;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

const logSuccess = (msg) => console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
const logFail = (msg, err) => console.error(`  \x1b[31m✖\x1b[0m ${msg}`, err || '');
const logSection = (title) => console.log(`\n\x1b[36m=== ${title} ===\x1b[0m`);

/**
 * Nettoie toutes les données de test associées au domaine @tontinais.test.
 */
async function cleanTestData() {
  try {
    const testUsers = await User.find({ email: { $regex: /@tontinais\.test$/i } }).select('_id');
    const testUserIds = testUsers.map((u) => u._id);

    const testGroups = await Group.find({
      $or: [
        { chefDeTontine: { $in: testUserIds } },
        { nom: { $regex: /^Tontine Solidarité/i } }
      ]
    }).select('_id');
    const testGroupIds = testGroups.map((g) => g._id);

    await Contribution.deleteMany({
      $or: [{ group: { $in: testGroupIds } }, { user: { $in: testUserIds } }]
    });
    await Payout.deleteMany({
      $or: [{ group: { $in: testGroupIds } }, { beneficiaire: { $in: testUserIds } }]
    });
    await Membership.deleteMany({
      $or: [{ group: { $in: testGroupIds } }, { user: { $in: testUserIds } }]
    });
    await Group.deleteMany({ _id: { $in: testGroupIds } });
    await User.deleteMany({
      $or: [{ _id: { $in: testUserIds } }, { email: { $regex: /@tontinais\.test$/i } }]
    });
  } catch (err) {
    console.warn(`[Avertissement Nettoyage] : ${err.message}`);
  }
}

async function runFullCycleTest() {
  let server;
  let testCount = 0;
  let passCount = 0;

  const assertStep = (condition, title, details = '', failureDetails = '') => {
    testCount++;
    if (condition) {
      passCount++;
      logSuccess(`${title} ${details}`);
    } else {
      const errInfo = failureDetails ? ` -> Erreur: ${failureDetails}` : '';
      logFail(`${title} ${details}${errInfo}`);
      throw new Error(`Échec à l'étape : ${title}${errInfo}`);
    }
  };

  try {
    logSection('1. Initialisation & Assainissement de l\'Environnement');
    await connectDB();
    logSuccess('Connexion réussie à MongoDB Atlas');

    await cleanTestData();
    logSuccess('Assainissement préalable des données de test terminé');

    server = await new Promise((resolve) => {
      const s = app.listen(TEST_PORT, () => {
        logSuccess(`Serveur de test Express actif sur le port ${TEST_PORT}`);
        resolve(s);
      });
    });

    logSection('2. Vérification de santé (Healthcheck)');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assertStep(
      healthRes.status === 200 && healthData.status === 'OK',
      'Route /api/health fonctionnelle',
      `[${healthData.status}]`,
      `[${healthRes.status}] ${healthData.error || ''}`
    );

    logSection('3. Inscription et Connexion du Chef de Tontine');
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const chefPayload = {
      nom: 'Sow',
      prenom: 'Amadou',
      email: `chef_${timestamp}_${randomSuffix}@tontinais.test`,
      telephone: `+23769${Math.floor(1000000 + Math.random() * 9000000)}`,
      motDePasse: 'Securite@2026',
      role: 'CHEF_DE_TONTINE'
    };

    const chefRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chefPayload)
    });
    const chefRegData = await chefRegRes.json();
    assertStep(
      chefRegRes.status === 201 && chefRegData.token,
      'Inscription du Chef de Tontine réussie',
      `(${chefPayload.email})`,
      `[${chefRegRes.status}] ${chefRegData.error || JSON.stringify(chefRegData)}`
    );

    const chefToken = chefRegData.token;

    logSection('4. Création d\'une Tontine Collaborative avec Paramètres');
    const groupPayload = {
      nom: `Tontine Solidarité ${timestamp}`,
      description: 'Groupe de test pour la validation du cycle complet.',
      montantCotisation: 25000,
      devise: 'XAF',
      frequence: 'MENSUEL',
      dateDemarrage: new Date(Date.now() + 86400000).toISOString(),
      nombreMaxMembres: 5,
      dureeGraceJours: 3
    };

    const groupRes = await fetch(`${BASE_URL}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`
      },
      body: JSON.stringify(groupPayload)
    });
    const groupData = await groupRes.json();
    assertStep(
      groupRes.status === 201 && groupData.group?.codeInvitation,
      'Création du groupe de tontine',
      `Code: ${groupData.group?.codeInvitation}`,
      `[${groupRes.status}] ${groupData.error || ''}`
    );

    const group = groupData.group;

    logSection('5. Inscription et Adhésion d\'un Membre');
    const membrePayload = {
      nom: 'Kouam',
      prenom: 'Aïcha',
      email: `membre_${timestamp}_${randomSuffix}@tontinais.test`,
      telephone: `+23769${Math.floor(1000000 + Math.random() * 9000000)}`,
      motDePasse: 'Securite@2026',
      role: 'MEMBRE'
    };

    const membreRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(membrePayload)
    });
    const membreRegData = await membreRegRes.json();
    assertStep(
      membreRegRes.status === 201 && membreRegData.token,
      'Inscription du Membre réussie',
      `(${membrePayload.email})`,
      `[${membreRegRes.status}] ${membreRegData.error || ''}`
    );

    const membreToken = membreRegData.token;

    const joinRes = await fetch(`${BASE_URL}/groups/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${membreToken}`
      },
      body: JSON.stringify({ codeInvitation: group.codeInvitation })
    });
    const joinData = await joinRes.json();
    assertStep(
      joinRes.status === 201 && joinData.membership,
      'Demande d\'adhésion soumise par le membre',
      '',
      `[${joinRes.status}] ${joinData.error || ''}`
    );

    const membershipId = joinData.membership._id;

    logSection('6. Validation de l\'Adhésion par le Chef');
    const validMemberRes = await fetch(`${BASE_URL}/groups/${group._id}/members/${membershipId}/validate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`
      },
      body: JSON.stringify({ statut: 'ACTIF' })
    });
    const validMemberData = await validMemberRes.json();
    assertStep(
      validMemberRes.status === 200 && validMemberData.membership?.statut === 'ACTIF',
      'Adhésion validée en statut ACTIF par le Chef',
      '',
      `[${validMemberRes.status}] ${validMemberData.error || ''}`
    );

    logSection('7. Génération de l\'Échéancier des Tours (Payout Schedule)');
    const genPayoutRes = await fetch(`${BASE_URL}/payouts/group/${group._id}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`
      }
    });
    const genPayoutData = await genPayoutRes.json();
    assertStep(
      genPayoutRes.status === 200 && Array.isArray(genPayoutData.payouts),
      'Calendrier des tours généré',
      `(${genPayoutData.payouts?.length} tours prévus)`,
      `[${genPayoutRes.status}] ${genPayoutData.error || ''}`
    );

    const firstPayout = genPayoutData.payouts[0];

    logSection('8. Déclaration de Cotisation par le Membre avec Reçu');
    const dummyImageBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43
    ]);

    const formData = new FormData();
    formData.append('groupId', group._id);
    formData.append('tourNumber', '1');
    formData.append('montant', '25000');
    formData.append('referenceTransaction', `TXN-${timestamp}`);
    formData.append('recu', new Blob([dummyImageBuffer], { type: 'image/jpeg' }), 'recu_test.jpg');

    const contribRes = await fetch(`${BASE_URL}/contributions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${membreToken}` },
      body: formData
    });
    const contribData = await contribRes.json();
    assertStep(
      contribRes.status === 201 && contribData.contribution?._id,
      'Cotisation déclarée avec justificatif',
      `(Statut: ${contribData.contribution?.statut})`,
      `[${contribRes.status}] ${contribData.error || ''}`
    );

    const contributionId = contribData.contribution._id;

    logSection('9. Validation du Versement par le Chef de Tontine');
    const validContribRes = await fetch(`${BASE_URL}/contributions/${contributionId}/validate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`
      },
      body: JSON.stringify({ statut: 'PAYE' })
    });
    const validContribData = await validContribRes.json();
    assertStep(
      validContribRes.status === 200 && validContribData.contribution?.statut === 'PAYE',
      'Cotisation validée et marquée comme PAYÉE',
      '',
      `[${validContribRes.status}] ${validContribData.error || ''}`
    );

    logSection('10. Distribution du Tour de Cagnotte (Payout)');
    const distRes = await fetch(`${BASE_URL}/payouts/${firstPayout._id}/distribute`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`
      }
    });
    const distData = await distRes.json();
    assertStep(
      distRes.status === 200 && distData.payout?.statut === 'DISTRIBUE',
      'Cagnotte distribuée avec succès au bénéficiaire',
      '',
      `[${distRes.status}] ${distData.error || ''}`
    );

    logSection('11. Blindage de Sécurité & Contrôle d\'Accès (Anti-BOLA / IDOR)');
    const unauthorizedRes = await fetch(`${BASE_URL}/contributions/${contributionId}/validate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${membreToken}`
      },
      body: JSON.stringify({ statut: 'PAYE' })
    });
    assertStep(
      unauthorizedRes.status === 403,
      'Protection BOLA/IDOR : Rejet 403 strict sur action non autorisée',
      '',
      `Attendu: 403, Reçu: ${unauthorizedRes.status}`
    );

    logSection('12. Vérification des Défaillances Automatiques');
    const defaultsRes = await fetch(`${BASE_URL}/payouts/group/${group._id}/check-defaults`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chefToken}`
      }
    });
    const defaultsData = await defaultsRes.json();
    assertStep(
      defaultsRes.status === 200,
      'Détection et analyse des membres défaillants opérationnelle',
      '',
      `[${defaultsRes.status}] ${defaultsData.error || ''}`
    );

    logSection('🎉 RÉSULTAT FINAL DU CYCLE DE VALIDATION');
    console.log(`\n\x1b[32m✔ Tous les tests ont réussi : ${passCount}/${testCount} validations franchies sans anomalie !\x1b[0m\n`);
  } catch (error) {
    console.error(`\n\x1b[31m💥 Arrêt prématuré du cycle de test : ${error.message}\x1b[0m\n`);
  } finally {
    await cleanTestData();
    logSuccess('Nettoyage final des données de test exécuté');

    if (server) {
      server.close();
      logSuccess('Serveur de test HTTP arrêté');
    }
    await mongoose.disconnect();
    logSuccess('Connexion MongoDB Atlas libérée');
  }
}

runFullCycleTest();
