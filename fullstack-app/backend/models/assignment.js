const { query } = require('../config/db');
const { matchesLevel } = require('../utils/academic');

function buildAssignmentCreateQuery(includeCourseFields = true, includeTargetLevel = true, includeCourseLink = true) {
  const columns = ['lecturer_id', 'title', 'description', 'due_date'];
  const values = ['@lecturerId', '@title', '@description', '@dueDate'];

  if (includeCourseFields) {
    columns.push('course_code', 'course_title');
    values.push('@courseCode', '@courseTitle');
  }

  if (includeCourseLink) {
    columns.push('course_id', 'semester');
    values.push('@courseId', '@semester');
  }

  if (includeTargetLevel) {
    columns.push('target_level');
    values.push('@targetLevel');
  }

  return `INSERT INTO Assignments (${columns.join(', ')})\n     OUTPUT INSERTED.*\n     VALUES (${values.join(', ')})`;
}

function buildAssignmentUpdateQuery(includeCourseFields = true, includeTargetLevel = true, includeCourseLink = true) {
  const setParts = ['title = @title', 'description = @description', 'due_date = @dueDate'];

  if (includeCourseFields) {
    setParts.push('course_code = @courseCode', 'course_title = @courseTitle');
  }

  if (includeCourseLink) {
    setParts.push('course_id = @courseId', 'semester = @semester');
  }

  if (includeTargetLevel) {
    setParts.push('target_level = @targetLevel');
  }

  setParts.push('updated_at = GETDATE()');

  return `UPDATE Assignments\n     SET ${setParts.join(', ')}\n     OUTPUT INSERTED.*\n     WHERE id = @id`;
}

function isMissingColumnError(err, columnName) {
  const message = (err && (err.message || err.details || ''))?.toString() || '';
  if (!message) return false;

  const escapedColumnName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escapedColumnName}\\b`, 'i').test(message)
    && /(invalid column name|column .* does not exist|does not exist|undefined column)/i.test(message);
}

async function create({ lecturerId, title, description, dueDate, courseCode, courseTitle, targetLevel = null, courseId = null, semester = null }) {
  const attempts = [
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: false },
    { includeCourseFields: true, includeTargetLevel: false, includeCourseLink: false },
    { includeCourseFields: false, includeTargetLevel: false, includeCourseLink: false },
  ];
  let lastError;

  for (const { includeCourseFields, includeTargetLevel, includeCourseLink } of attempts) {
    try {
      const result = await query(
        buildAssignmentCreateQuery(includeCourseFields, includeTargetLevel, includeCourseLink),
        { lecturerId, title, description, dueDate, courseCode, courseTitle, targetLevel, courseId, semester }
      );
      return result.recordset[0];
    } catch (err) {
      if (includeTargetLevel && isMissingColumnError(err, 'target_level')) {
        lastError = err;
        continue;
      }
      if (includeCourseLink && (isMissingColumnError(err, 'course_id') || isMissingColumnError(err, 'semester'))) {
        lastError = err;
        continue;
      }
      if (includeCourseFields && (isMissingColumnError(err, 'course_code') || isMissingColumnError(err, 'course_title'))) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function findAll(lecturerId, role, user = null) {
  if (role === 'lecturer') {
    const result = await query(
      'SELECT * FROM Assignments WHERE lecturer_id = @lecturerId ORDER BY created_at DESC',
      { lecturerId }
    );
    return result.recordset;
  }

  if (role === 'student' && user && user.department) {
    const result = await query(
      `SELECT a.*,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS has_submitted,
        CASE WHEN s.is_late = 1 THEN 1 ELSE 0 END AS is_late_submission
       FROM Assignments a
       JOIN Users l ON l.id = a.lecturer_id
       LEFT JOIN Submissions s ON s.assignment_id = a.id AND s.student_id = @lecturerId
       WHERE (l.department IS NULL OR LOWER(LTRIM(RTRIM(l.department))) = LOWER(LTRIM(RTRIM(@userDept))))
       ORDER BY a.created_at DESC`,
      { lecturerId, userDept: user.department }
    );
    if (user.level) {
      return result.recordset.filter(a => matchesLevel(user.level, a.target_level));
    }
    return result.recordset;
  }

  const result = await query(
    `SELECT a.*,
      CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS has_submitted,
      CASE WHEN s.is_late = 1 THEN 1 ELSE 0 END AS is_late_submission
     FROM Assignments a
     LEFT JOIN Submissions s ON s.assignment_id = a.id AND s.student_id = @lecturerId
     ORDER BY a.created_at DESC`,
    { lecturerId }
  );
  return result.recordset;
}

async function findById(id) {
  const result = await query('SELECT * FROM Assignments WHERE id = @id', { id });
  return result.recordset[0] || null;
}

async function update(id, { title, description, dueDate, courseCode, courseTitle, targetLevel = null, courseId = null, semester = null }) {
  const attempts = [
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: false },
    { includeCourseFields: true, includeTargetLevel: false, includeCourseLink: false },
    { includeCourseFields: false, includeTargetLevel: false, includeCourseLink: false },
  ];
  let lastError;

  for (const { includeCourseFields, includeTargetLevel, includeCourseLink } of attempts) {
    try {
      const result = await query(
        buildAssignmentUpdateQuery(includeCourseFields, includeTargetLevel, includeCourseLink),
        { id, title, description, dueDate, courseCode, courseTitle, targetLevel, courseId, semester }
      );
      return result.recordset[0] || null;
    } catch (err) {
      if (includeTargetLevel && isMissingColumnError(err, 'target_level')) {
        lastError = err;
        continue;
      }
      if (includeCourseLink && (isMissingColumnError(err, 'course_id') || isMissingColumnError(err, 'semester'))) {
        lastError = err;
        continue;
      }
      if (includeCourseFields && (isMissingColumnError(err, 'course_code') || isMissingColumnError(err, 'course_title'))) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function remove(id) {
  const result = await query(
    `DELETE FROM Assignments OUTPUT DELETED.id WHERE id = @id`,
    { id }
  );
  return result.rowsAffected[0] > 0;
}

module.exports = { buildAssignmentCreateQuery, buildAssignmentUpdateQuery, isMissingColumnError, create, findAll, findById, update, remove };
