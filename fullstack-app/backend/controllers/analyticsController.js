const { query } = require('../config/db');

async function getAssignmentAnalytics(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }

    const grades = await query(
      `SELECT g.score, s.student_id
       FROM Grades g
       JOIN Submissions s ON s.id = g.submission_id
       WHERE s.assignment_id = @assignmentId`,
      { assignmentId }
    );

    const submissionCount = await query(
      'SELECT COUNT(*) as count FROM Submissions WHERE assignment_id = @assignmentId',
      { assignmentId }
    );

    const scores = grades.recordset.map(r => r.score);

    const distribution = {
      '0-49': 0, '50-59': 0, '60-69': 0,
      '70-79': 0, '80-89': 0, '90-100': 0,
    };
    for (const s of scores) {
      if (s < 50) distribution['0-49']++;
      else if (s < 60) distribution['50-59']++;
      else if (s < 70) distribution['60-69']++;
      else if (s < 80) distribution['70-79']++;
      else if (s < 90) distribution['80-89']++;
      else distribution['90-100']++;
    }

    const totalGraded = scores.length;
    const totalSubmissions = submissionCount.recordset[0].count;
    const sorted = [...scores].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    res.json({
      totalSubmissions,
      totalGraded,
      totalUngraded: totalSubmissions - totalGraded,
      average: totalGraded > 0 ? Math.round((sum / totalGraded) * 100) / 100 : null,
      median: totalGraded > 0
        ? sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        : null,
      min: totalGraded > 0 ? sorted[0] : null,
      max: totalGraded > 0 ? sorted[sorted.length - 1] : null,
      distribution: Object.entries(distribution).map(([range, count]) => ({ range, count })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAssignmentAnalytics };
