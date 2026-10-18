/**
 * @file upload.js
 * @description Middleware de téléversement sécurisé en mémoire via Multer avec validation stricte du type MIME.
 * @module middlewares/upload
 */

const multer = require('multer');

// Configuration du stockage temporaire en mémoire RAM
const storage = multer.memoryStorage();

/**
 * Filtre de validation des fichiers pour autoriser uniquement les images.
 * Protection contre les injections de scripts ou d'exécutables (.exe, .php, etc.).
 */
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Format de fichier invalide. Seuls les formats d\'image JPG, PNG et WEBP sont acceptés.'
      ),
      false
    );
  }
};

/**
 * Instance Multer configurée pour les reçus de paiement.
 * Taille maximale autorisée : 5 Mo.
 */
const uploadReceipt = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Mo
  },
  fileFilter: imageFileFilter
}).single('recu');

/**
 * Wrapper de gestion propre des erreurs d'envoi de fichier Multer.
 */
const handleReceiptUpload = (req, res, next) => {
  uploadReceipt(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Le fichier dépasse la taille maximale autorisée de 5 Mo.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Erreur lors de la réception du fichier : ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
};

module.exports = {
  handleReceiptUpload
};
