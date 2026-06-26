const notificationModel = require('../models/notification');

async function getNotifications(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const unreadOnly = req.query.unread === 'true';
    const offset = (page - 1) * limit;

    const notifications = await notificationModel.findByUser(req.user.id, { limit, offset, unreadOnly });
    const unreadCount = await notificationModel.countUnread(req.user.id);

    res.json({ notifications, unreadCount, page, limit });
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await notificationModel.countUnread(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid notification ID' });
    }
    await notificationModel.markAsRead(id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationModel.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
