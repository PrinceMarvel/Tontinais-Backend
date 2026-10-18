/**
 * @file server.js
 * @description Point d'entrée principal de l'API REST TontiNaïs (Node.js / Express).
 * @module server
 */

const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

// Démarrage du serveur et connexion à MongoDB Atlas
const startServer = async () => {
  // 1. Connexion à la base de données
  await connectDB();

  // 2. Démarrage de l'écoute HTTP
  const server = app.listen(env.PORT, () => {
    console.log(
      `===================================================\n` +
      `  🚀 Serveur TontiNaïs Démarré avec Succès !\n` +
      `  🔹 Mode         : ${env.NODE_ENV}\n` +
      `  🔹 Port         : ${env.PORT}\n` +
      `  🔹 API Health   : http://localhost:${env.PORT}/api/health\n` +
      `===================================================`
    );
  });

  // Gérer les rejets de promesses non capturés (Unhandled Rejections)
  process.on('unhandledRejection', (err) => {
    console.error(`[Fatal Server Error] Rejet de promesse non géré : ${err.message}`);
    server.close(() => process.exit(1));
  });

  // Gérer les exceptions non capturées (Uncaught Exceptions)
  process.on('uncaughtException', (err) => {
    console.error(`[Fatal Server Error] Exception non capturée : ${err.message}`);
    process.exit(1);
  });
};

startServer();
