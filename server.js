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

  // Gestion de l'arrêt gracieux du serveur (libération immédiate du port)
  const fermerServeur = (signal) => {
    console.log(`\n[Serveur] Signal ${signal} reçu. Arrêt gracieux en cours...`);
    server.close(() => {
      console.log('[Serveur] Serveur HTTP arrêté et port libéré avec succès.');
      process.exit(0);
    });

    // Arrêt forcé après 5 secondes si des sockets restent ouvertes
    setTimeout(() => {
      console.error('[Serveur] Délai dépassé. Fermeture forcée du processus.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGINT', () => fermerServeur('SIGINT'));
  process.on('SIGTERM', () => fermerServeur('SIGTERM'));

  // Gérer les rejets de promesses non capturés (Unhandled Rejections)
  process.on('unhandledRejection', (err) => {
    console.error(`[Fatal Server Error] Rejet de promesse non géré : ${err.message}`);
    server.close(() => process.exit(1));
  });

  // Gérer les exceptions non capturées (Uncaught Exceptions)
  process.on('uncaughtException', (err) => {
    console.error(`[Fatal Server Error] Exception non capturée : ${err.message}`);
    server.close(() => process.exit(1));
  });
};

startServer();
