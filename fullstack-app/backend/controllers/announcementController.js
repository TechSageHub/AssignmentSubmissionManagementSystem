const announcementModel = require('../models/announcement');
const notificationModel = require('../models/notification');
const { sendAnnouncement } = require('../utils/emailHelper');
const auditLog = require('../utils/auditLogger');
const { getTargetFields } = require('../utils/academic');

// Build the viewer's targeting context so level matching uses the same rules
// as assignments (students compare their level, lecturers their level scope).
function getViewerTarget(user) {
  const fields = getTargetFields(user);
  return {
    role: user.role,
    department: fields.department || null,
    level: fields.level || null,
    level_scope: fields.level_scope || null,
  };
}

async function getAnnouncements(req, res, next) {
  try {
    const target = getViewerTarget(req.user);
    const announcements = await announcementModel.findByVisible({
      role: target.role,
      department: target.department,
      level: target.level,
      levelScope: target.level_scope,
    });
    res.json(announcements);
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, message, targetRole = 'all', targetDepartment = null, targetLevel = null } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'ValidationError', details: 'Title is required' });
    }
    const trimmedMessage = message && message.trim();
    if (!trimmedMessage) {
      return res.status(400).json({ error: 'ValidationError', details: 'Message is required' });
    }
    const allowedRoles = ['all', 'student', 'lecturer', 'admin'];
    if (!allowedRoles.includes(targetRole)) {
      return res.status(400).json({ error: 'ValidationError', details: 'targetRole must be one of: all, student, lecturer, admin' });
    }

    const created = await announcementModel.create({
      title: title.trim(),
      message: trimmedMessage,
      createdBy: req.user.id,
      targetRole,
      targetDepartment: targetDepartment || null,
      targetLevel: targetLevel || null,
      publishedAt: toStoredUtc(new Date()),
    });

    auditLog.log(req, 'announcement', 'announcement', created.id, { title: created.title });

    // Best-effort delivery to every matching user (in-app + email).
    try {
      const targetUsers = await announcementModel.findTargetUsers({
        targetRole,
        targetDepartment: targetDepartment || null,
        targetLevel: targetLevel || null,
      });
      for (const u of targetUsers) {
        try {
          await notificationModel.create({
            userId: u.id,
            type: 'announcement',
            title: 'New Announcement',
            message: created.title,
            link: '/announcements',
          });
        } catch { /* keep delivering to the rest */ }
        await sendAnnouncement(u.email, u.name, created.title, trimmedMessage).catch(() => {});
      }
    } catch (deliveryErr) {
      console.error('Failed to deliver announcement:', deliveryErr.message);
    }

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const announcementId = parseInt(req.params.id, 10);
    const existing = await announcementModel.findById(announcementId);
    if (!existing) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Announcement not found' });
    }
    if (req.user.role === 'lecturer' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'You can only edit your own announcements' });
    }

    const { title, message, targetRole, targetDepartment, targetLevel } = req.body;
    const updated = await announcementModel.update(announcementId, {
      title: title != null ? title.trim() : existing.title,
      message: message != null ? message.trim() : existing.message,
      targetRole: targetRole || existing.target_role,
      targetDepartment: targetDepartment !== undefined ? targetDepartment : existing.target_department,
      targetLevel: targetLevel !== undefined ? targetLevel : existing.target_level,
      updatedAt: toStoredUtc(new Date()),
    });

    const fresh = await announcementModel.findById(announcementId);
    auditLog.log(req, 'update_announcement', 'announcement', announcementId, { title: fresh.title });
    res.json(fresh);
  } catch (err) {
    next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const announcementId = parseInt(req.params.id, 10);
    const existing = await announcementModel.findById(announcementId);
    if (!existing) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Announcement not found' });
    }
    if (req.user.role === 'lecturer' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'You can only delete your own announcements' });
    }

    await announcementModel.remove(announcementId);
    auditLog.log(req, 'delete_announcement', 'announcement', announcementId, {});
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };