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
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
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
    process.exit(1);
  }
};

module.exports = connectDB;
