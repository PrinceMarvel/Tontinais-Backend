/**
 * @file cloudinary.js
 * @description Configuration du service Cloudinary pour le stockage sécurisé des reçus de paiement.
 * @module config/cloudinary
 */

const cloudinary = require('cloudinary').v2;
const env = require('./env');

// Initialisation des identifiants Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY.CLOUD_NAME,
  api_key: env.CLOUDINARY.API_KEY,
  api_secret: env.CLOUDINARY.API_SECRET,
  secure: true
});

/**
 * Téléverse un tampon mémoire (Buffer) ou un fichier vers Cloudinary dans un dossier sécurisé.
 * @param {Buffer} fileBuffer Buffer du fichier reçu via Multer.
 * @param {string} folder Dossier de destination sur Cloudinary (ex: 'tontinais/recettes').
 * @returns {Promise<{public_id: string, secure_url: string}>}
 */
const uploadToCloudinary = (fileBuffer, folder = 'tontinais/recettes') => {
  return new Promise((resolve, reject) => {
    // Détection de clés de démonstration par défaut en développement local
    const isMockCredentials =
      !env.CLOUDINARY.API_SECRET ||
      env.CLOUDINARY.API_KEY === '123456789012345' ||
      env.CLOUDINARY.CLOUD_NAME === 'tontinais';

    if (isMockCredentials && env.NODE_ENV !== 'production') {
      console.warn(
        '[Cloudinary Notice] Clés de développement détectées : stockage direct en Data-URI pour les tests locaux.'
      );
      const mimeType = 'image/jpeg';
      const base64Data = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;
      return resolve({
        public_id: `dev_mock_${Date.now()}`,
        secure_url: dataUri
      });
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }]
      },
      (error, result) => {
        if (error) {
          // En mode développement, repli transparent sur Data-URI si l'API Cloudinary rejette les identifiants
          if (env.NODE_ENV !== 'production') {
            console.warn(
              `[Cloudinary Fallback] Erreur API Cloudinary (${error.message}). Repli automatique sur Data-URI local.`
            );
            const base64Data = fileBuffer.toString('base64');
            return resolve({
              public_id: `fallback_${Date.now()}`,
              secure_url: `data:image/jpeg;base64,${base64Data}`
            });
          }
          return reject(new Error(`[Cloudinary Error] Échec de l'envoi de l'image : ${error.message}`));
        }
        resolve({
          public_id: result.public_id,
          secure_url: result.secure_url
        });
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Supprime une ressource hébergée sur Cloudinary via son public_id.
 * @param {string} publicId Identifiant public du fichier.
 * @returns {Promise<object>}
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId || publicId.startsWith('dev_mock_') || publicId.startsWith('fallback_')) {
      return { result: 'ok' };
    }
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`[Cloudinary Delete Error] Impossible de supprimer ${publicId} : ${error.message}`);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary
};
