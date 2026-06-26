const { query } = require('../config/db');

async function findByAssignment(assignmentId) {
  const result = await query(
    'SELECT * FROM RubricCriteria WHERE assignment_id = @assignmentId ORDER BY sort_order',
    { assignmentId }
  );
  return result.recordset;
}

async function saveCriteria(assignmentId, criteria) {
  await query('DELETE FROM RubricCriteria WHERE assignment_id = @assignmentId', { assignmentId });
  for (let i = 0; i < criteria.length; i++) {
    const c = criteria[i];
    await query(
      `INSERT INTO RubricCriteria (assignment_id, name, max_score, sort_order)
       VALUES (@assignmentId, @name, @maxScore, @sortOrder)`,
      { assignmentId, name: c.name, maxScore: c.maxScore, sortOrder: i }
    );
  }
}

async function saveGradeCriteria(gradeId, criteriaScores) {
  for (const cs of criteriaScores) {
    await query(
      `INSERT INTO GradeCriteria (grade_id, criteria_id, score)
       VALUES (@gradeId, @criteriaId, @score)`,
      { gradeId, criteriaId: cs.criteriaId, score: cs.score }
    );
  }
}

async function findByGrade(gradeId) {
  const result = await query(
    `SELECT gc.*, rc.name, rc.max_score
     FROM GradeCriteria gc
     JOIN RubricCriteria rc ON rc.id = gc.criteria_id
     WHERE gc.grade_id = @gradeId
     ORDER BY rc.sort_order`,
    { gradeId }
  );
  return result.recordset;
}

module.exports = { findByAssignment, saveCriteria, saveGradeCriteria, findByGrade };
