const userModel = require('../models/user');

async function getStudents(req, res, next) {
  try {
    const students = await userModel.findAllStudents();
    res.json(students);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { department, programme, level, phone } = req.body;
    const user = await userModel.updateProfile(req.user.id, { department, programme, level, phone });
    if (!user) {
      return res.status(404).json({ error: 'NotFoundError', details: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStudents, updateProfile };
