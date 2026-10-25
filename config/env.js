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

  // Base de données MongoDB Atlas
  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb+srv://TontiNais:DabeJerome@tontinais.xdtbgyd.mongodb.net/?appName=TontiNais',

  // Authentification et Sécurité JWT
  JWT_SECRET: process.env.JWT_SECRET || 'tontinais_super_secret_jwt_key_production_level_90plus_2026',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'tontinais_refresh_token_ultra_secure_key_2026',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

  // Hachage et sécurité
  SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS, 10) || 12,

  // Origine Frontend autorisée (CORS)
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Service Cloudinary pour les reçus de paiement
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'tontinais',
    API_KEY: process.env.CLOUDINARY_API_KEY || '123456789012345',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || 'tontinais_cloudinary_secret_key'
  }
};

/**
 * Validation basique au démarrage en environnement de production.
 */
if (env.NODE_ENV === 'production') {
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
  const missingVars = requiredVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.warn(
      `[ATTENTION] Variables d'environnement de production manquantes : ${missingVars.join(', ')}`
    );
  }
}

module.exports = env;
