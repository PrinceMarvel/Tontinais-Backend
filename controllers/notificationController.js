/**
 * @file notificationController.js
 * @description Contrôleur de gestion des notifications in-app et alertes financières pour les membres.
 * @module controllers/notificationController
 */

const Notification = require('../models/Notification');

/**
 * @desc Récupérer les notifications de l'utilisateur connecté
 * @route GET /api/notifications
 * @access Private
 */
exports.getMyNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ user: req.user._id }),
      Notification.countDocuments({ user: req.user._id, lu: false })
    ]);

    res.status(200).json({
      success: true,
      unreadCount,
      total,
      page,
      pages: Math.ceil(total / limit),
      notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Marquer une notification comme lue
 * @route PUT /api/notifications/:id/read
 * @access Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification introuvable.'
      });
    }

    notification.lu = true;
    notification.dateLecture = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Marquer toutes les notifications de l'utilisateur comme lues
 * @route PUT /api/notifications/read-all
 * @access Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, lu: false },
      { $set: { lu: true, dateLecture: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues.'
    });
  } catch (error) {
    next(error);
  }
};

