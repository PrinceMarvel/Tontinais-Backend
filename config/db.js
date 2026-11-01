/**
 * @file db.js
 * @description Module de connexion sécurisée et robuste à la base de données MongoDB Atlas.
 * @module config/db
 */

const mongoose = require('mongoose');
const env = require('./env');

/**
 * Établit la connexion à l'instance MongoDB Atlas.
 * Configuré avec gestion des tentatives de reconnexion et évènements système.
 * @returns {Promise<typeof mongoose>} Instance Mongoose connectée.
 */
const connectDB = async () => {
  if (!env.MONGODB_URI) {
    console.error(
      '[MongoDB Fatal Error] La variable d\'environnement MONGODB_URI n\'est pas configurée.\n' +
      'Veuillez renseigner MONGODB_URI dans vos variables d\'environnement Render ou dans votre fichier .env.'
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000
    });

    console.log(
      `[MongoDB Atlas] Connexion établie avec succès sur le cluster : ${conn.connection.host}`
    );

    // Écouteurs d'évènements Mongoose
    mongoose.connection.on('error', (err) => {
      console.error(`[MongoDB Error] Erreur de connexion détectée : ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB Warning] Connexion intermédiaire perdue avec MongoDB Atlas.');
    });

    return conn;
  } catch (error) {
    console.error(`[MongoDB Fatal Error] Échec lors de la connexion initiale : ${error.message}`);
    if (error.message.includes('Could not connect to any servers')) {
      console.error(
        '[MongoDB Diagnostic] Le pare-feu réseau de MongoDB Atlas refuse la connexion.\n' +
        'Assurez-vous d\'avoir autorisé l\'accès depuis n\'importe où (0.0.0.0/0) dans :\n' +
        'MongoDB Atlas > Security > Network Access > Add IP Address > Allow Access From Anywhere.'
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
