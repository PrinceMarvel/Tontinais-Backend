/**
 * @file env.js
 * @description Centralisation et validation rigoureuse des variables d'environnement de l'application TontiNaïs.
 * @module config/env
 */

const dotenv = require('dotenv');
dotenv.config();

/**
 * Configuration globale des variables d'environnement.
 */
const env = {
  // Environnement de fonctionnement
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5001,

  // Base de données MongoDB Atlas (obligatoire)
  MONGODB_URI: process.env.MONGODB_URI || '',

  // Authentification et Sécurité JWT
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'tontinais_dev_secret_key_change_me_in_production'),
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'tontinais_dev_refresh_secret_key_change_me'),
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

  // Hachage et sécurité
  SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS, 10) || 12,

  // Origine Frontend autorisée (CORS)
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Service Cloudinary pour les reçus de paiement
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || ''
  },

  // Passerelle de paiement direct Mobile Money (Orange Money, MTN, Wave)
  WALLET: {
    PROVIDER: process.env.WALLET_GATEWAY_PROVIDER || 'mock',
    API_KEY: process.env.WALLET_API_KEY || '',
    SECRET_KEY: process.env.WALLET_SECRET_KEY || '',
    WEBHOOK_SECRET: process.env.WALLET_WEBHOOK_SECRET || 'tontinais_wallet_webhook_secret_key_2026'
  }
};

/**
 * Validation des variables obligatoires au démarrage de l'application.
 */
const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingVars = requiredVars.filter((key) => !env[key]);

if (missingVars.length > 0) {
  if (env.NODE_ENV === 'production') {
    console.error(
      `[ERREUR CRITIQUE] Variables d'environnement de production obligatoires manquantes : ${missingVars.join(', ')}`
    );
  } else {
    console.warn(
      `[ATTENTION DÉVELOPPEMENT] Variables d'environnement non définies : ${missingVars.join(', ')}`
    );
  }
}

module.exports = env;
