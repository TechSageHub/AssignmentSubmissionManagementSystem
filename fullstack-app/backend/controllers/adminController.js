const userModel = require('../models/user');
const auditLog = require('../utils/auditLogger');

async function getUsers(req, res, next) {
  try {
    const users = await userModel.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'NotFound', details: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['student', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Role must be student, lecturer, or admin' });
    }
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'NotFound', details: 'User not found' });
    }
    await userModel.updateRole(Number(id), role);
    auditLog.log(req, 'update_role', 'user', Number(id), { newRole: role });
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'NotFound', details: 'User not found' });
    }
    const newStatus = !user.is_active;
    await userModel.setActiveStatus(Number(id), newStatus);
    auditLog.log(req, newStatus ? 'activate_user' : 'suspend_user', 'user', Number(id));
    res.json({ message: `User ${newStatus ? 'activated' : 'suspended'} successfully` });
  } catch (err) {
    next(err);
  }
}

async function getSystemStats(req, res, next) {
  try {
    const stats = await userModel.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const auditLogModel = require('../utils/auditLogger');
    const logs = await auditLogModel.findAll(200);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}

module.exports = { getUsers, getUser, updateUserRole, toggleUserStatus, getSystemStats, getAuditLogs };
