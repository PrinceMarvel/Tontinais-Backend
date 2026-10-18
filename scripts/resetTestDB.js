/**
 * @file resetTestDB.js
 * @description Script de purge et de réinitialisation des données de test de la base MongoDB Atlas.
 * @module scripts/resetTestDB
 */

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const Contribution = require('../models/Contribution');
const Payout = require('../models/Payout');

const logSuccess = (msg) => console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
const logInfo = (msg) => console.log(`  \x1b[34mℹ\x1b[0m ${msg}`);
const logFail = (msg, err) => console.error(`  \x1b[31m✖\x1b[0m ${msg}`, err || '');

async function resetTestDatabase() {
  console.log('\n\x1b[36m=== 🧹 Réinitialisation de la Base de Données de Test ===\x1b[0m');

  try {
    await connectDB();
    logSuccess('Connexion à MongoDB Atlas établie.');

    // 1. Identification des utilisateurs de test
    const testUsers = await User.find({ email: { $regex: /@tontinais\.test$/i } }).select('_id');
    const testUserIds = testUsers.map((u) => u._id);

    // 2. Identification des groupes de test
    const testGroups = await Group.find({
      $or: [
        { chefDeTontine: { $in: testUserIds } },
        { nom: { $regex: /^Tontine Solidarité/i } }
      ]
    }).select('_id');
    const testGroupIds = testGroups.map((g) => g._id);

    // 3. Suppression des contributions associées
    const deletedContribs = await Contribution.deleteMany({
      $or: [
        { group: { $in: testGroupIds } },
        { user: { $in: testUserIds } }
      ]
    });
    logInfo(`${deletedContribs.deletedCount} cotisation(s) de test supprimée(s).`);

    // 4. Suppression des cagnottes / échéanciers associés
    const deletedPayouts = await Payout.deleteMany({
      $or: [
        { group: { $in: testGroupIds } },
        { beneficiaire: { $in: testUserIds } }
      ]
    });
    logInfo(`${deletedPayouts.deletedCount} tour(s) de cagnotte de test supprimé(s).`);

    // 5. Suppression des adhésions
    const deletedMemberships = await Membership.deleteMany({
      $or: [
        { group: { $in: testGroupIds } },
        { user: { $in: testUserIds } }
      ]
    });
    logInfo(`${deletedMemberships.deletedCount} adhésion(s) de test supprimée(s).`);

    // 6. Suppression des groupes
    const deletedGroups = await Group.deleteMany({ _id: { $in: testGroupIds } });
    logInfo(`${deletedGroups.deletedCount} groupe(s) de test supprimé(s).`);

    // 7. Suppression des utilisateurs
    const deletedUsers = await User.deleteMany({
      $or: [
        { _id: { $in: testUserIds } },
        { email: { $regex: /@tontinais\.test$/i } }
      ]
    });
    logInfo(`${deletedUsers.deletedCount} utilisateur(s) de test supprimé(s).`);

    logSuccess('Base de données de test entièrement réinitialisée et nettoyée avec succès.\n');
  } catch (error) {
    logFail('Erreur lors de la réinitialisation de la base de test :', error.message);
  } finally {
    await mongoose.disconnect();
    logSuccess('Connexion MongoDB Atlas libérée.');
  }
}

resetTestDatabase();
