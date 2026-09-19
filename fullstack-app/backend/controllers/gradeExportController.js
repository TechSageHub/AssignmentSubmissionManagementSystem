const assignmentModel = require('../models/assignment');
const submissionModel = require('../models/submission');
const groupMemberModel = require('../models/groupMember');
const submissionHistoryModel = require('../models/submissionHistory');
const rubricModel = require('../models/rubric');
const { toIsoUtc } = require('../utils/dates');

function csvEsc(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function exportAssignmentGrades(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }

    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFound', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    const submissions = await submissionModel.findByAssignment(assignmentId);
    const criteria = await rubricModel.findByAssignment(assignmentId);

    const groupIds = submissions.map(s => s.id);
    const grouped = await groupMemberModel.findBySubmissions(groupIds);

    const rows = [];
    const header = [
      'Student',
      'Group members',
      'Submitted at',
      'Late',
      'Status',
      'Score',
      'Feedback',
      'Revisions',
      ...criteria.map(c => `${c.name} (${c.weight == null ? '100' : c.weight}%)`),
    ];
    rows.push(header.map(csvEsc).join(','));

    for (const sub of submissions) {
      const members = (grouped[sub.id] || []).map(m => m.user_name || m.email || m.user_id);
      const history = await submissionHistoryModel.findBySubmission(sub.id);
      const revisionCount = history.length + 1;
      const grade = await rubricModel.findByGrade(sub.grade_id);

      const base = [
        sub.student_name || `student_${sub.student_id}`,
        members.join(' | '),
        sub.submitted_at ? toIsoUtc(sub.submitted_at) : '',
        sub.is_late ? 'Yes' : 'No',
        sub.score != null ? 'Graded' : 'Pending',
        sub.score != null ? sub.score : '',
        sub.feedback || '',
        revisionCount,
      ];

      const criteriaVals = criteria.map(c => {
        const g = grade.find(gc => gc.criteria_id === c.id);
        return g ? `${g.score}/${c.max_score}` : '';
      });
      rows.push([...base, ...criteriaVals].map(csvEsc).join(','));
    }

    const filename = `${assignment.title.replace(/[^a-zA-Z0-9]+/g, '_')}_grades.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + rows.join('\r\n'));
  } catch (err) {
    next(err);
  }
}

module.exports = { exportAssignmentGrades };