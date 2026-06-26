const assignmentModel = require('../models/assignment');
const rubricModel = require('../models/rubric');

async function getRubric(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const criteria = await rubricModel.findByAssignment(assignmentId);
    res.json(criteria);
  } catch (err) {
    next(err);
  }
}

async function saveRubric(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFound', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    const { criteria } = req.body;
    if (!Array.isArray(criteria)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Criteria must be an array' });
    }

    const totalMax = criteria.reduce((sum, c) => sum + Number(c.maxScore), 0);
    if (totalMax > 100) {
      return res.status(400).json({ error: 'ValidationError', details: 'Total max score cannot exceed 100' });
    }

    await rubricModel.saveCriteria(assignmentId, criteria);
    const saved = await rubricModel.findByAssignment(assignmentId);
    res.json(saved);
  } catch (err) {
    next(err);
  }
}

module.exports = { getRubric, saveRubric };
