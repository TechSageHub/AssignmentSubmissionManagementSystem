const { query } = require('../config/db');
const { matchesLevel } = require('../utils/academic');

function buildAssignmentCreateQuery(includeCourseFields = true, includeTargetLevel = true, includeCourseLink = true, includeLatePolicy = true, includePublishDate = true) {
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

  if (includeLatePolicy) {
    columns.push('accept_late_submissions', 'late_cutoff');
    values.push('@acceptLateSubmissions', '@lateCutoff');
  }

  if (includePublishDate) {
    columns.push('publish_date');
    values.push('@publishDate');
  }

  return `INSERT INTO Assignments (${columns.join(', ')})\n     OUTPUT INSERTED.*\n     VALUES (${values.join(', ')})`;
}

function buildAssignmentUpdateQuery(includeCourseFields = true, includeTargetLevel = true, includeCourseLink = true, includeLatePolicy = true, includePublishDate = true) {
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

  if (includeLatePolicy) {
    setParts.push('accept_late_submissions = @acceptLateSubmissions', 'late_cutoff = @lateCutoff');
  }

  if (includePublishDate) {
    setParts.push('publish_date = @publishDate');
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

async function create({ lecturerId, title, description, dueDate, courseCode, courseTitle, targetLevel = null, courseId = null, semester = null, acceptLateSubmissions = 1, lateCutoff = null, publishDate = null }) {
  const attempts = [
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true, includeLatePolicy: true, includePublishDate: true },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true, includeLatePolicy: true, includePublishDate: false },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true, includeLatePolicy: false, includePublishDate: false },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: false, includeLatePolicy: false, includePublishDate: false },
    { includeCourseFields: true, includeTargetLevel: false, includeCourseLink: false, includeLatePolicy: false, includePublishDate: false },
    { includeCourseFields: false, includeTargetLevel: false, includeCourseLink: false, includeLatePolicy: false, includePublishDate: false },
  ];
  let lastError;

  for (const { includeCourseFields, includeTargetLevel, includeCourseLink, includeLatePolicy, includePublishDate } of attempts) {
    try {
      const result = await query(
        buildAssignmentCreateQuery(includeCourseFields, includeTargetLevel, includeCourseLink, includeLatePolicy, includePublishDate),
        { lecturerId, title, description, dueDate, courseCode, courseTitle, targetLevel, courseId, semester, acceptLateSubmissions, lateCutoff, publishDate }
      );
      return result.recordset[0];
    } catch (err) {
      if (includePublishDate && isMissingColumnError(err, 'publish_date')) {
        lastError = err;
        continue;
      }
      if (includeLatePolicy && (isMissingColumnError(err, 'accept_late_submissions') || isMissingColumnError(err, 'late_cutoff'))) {
        lastError = err;
        continue;
      }
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
  const paginated = await findAllPaginated(lecturerId, role, user, {});
  return paginated.items;
}

async function findAllPaginated(lecturerId, role, user = null, { limit, offset, search } = {}) {
  const hasPagination = Number.isInteger(limit) || Number.isInteger(offset) || (typeof search === 'string' && search.length > 0);
  const limitVal = hasPagination ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : null;
  const offsetVal = hasPagination ? Math.max(parseInt(offset, 10) || 0, 0) : null;
  const searchTerm = typeof search === 'string' ? search.trim() : '';

  if (role === 'lecturer') {
    const params = { lecturerId };
    let whereSearch = '';
    if (searchTerm) {
      whereSearch = 'AND (title LIKE @search OR description LIKE @search)';
      params.search = `%${searchTerm}%`;
    }
    if (!hasPagination) {
      const result = await query(
        `SELECT * FROM Assignments WHERE lecturer_id = @lecturerId ${whereSearch} ORDER BY created_at DESC, id DESC`,
        params
      );
      return { items: result.recordset, total: result.recordset.length, limit: result.recordset.length, offset: 0 };
    }
    const countResult = await query(`SELECT COUNT(*) AS count FROM Assignments WHERE lecturer_id = @lecturerId ${whereSearch}`, params);
    params.limit = limitVal;
    params.offset = offsetVal;
    const result = await query(
      `SELECT * FROM Assignments WHERE lecturer_id = @lecturerId ${whereSearch} ORDER BY created_at DESC, id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );
    return { items: result.recordset, total: Number(countResult.recordset[0].count), limit: limitVal, offset: offsetVal };
  }

  if (role === 'student' && user && user.department) {
    const params = { lecturerId, userDept: user.department };
    let whereSearch = '';
    if (searchTerm) {
      whereSearch = 'AND (a.title LIKE @search OR a.description LIKE @search)';
      params.search = `%${searchTerm}%`;
    }
    const baseQuery = `FROM Assignments a
        JOIN Users l ON l.id = a.lecturer_id
        LEFT JOIN Submissions s ON s.assignment_id = a.id AND s.student_id = @lecturerId
        WHERE (l.department IS NULL OR LOWER(LTRIM(RTRIM(l.department))) = LOWER(LTRIM(RTRIM(@userDept))))
          AND (a.publish_date IS NULL OR a.publish_date <= SYSUTCDATETIME()) ${whereSearch}`;
    if (!hasPagination) {
      const result = await query(
        `SELECT a.*,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS has_submitted,
        CASE WHEN s.is_late = 1 THEN 1 ELSE 0 END AS is_late_submission
       ${baseQuery}
        ORDER BY a.created_at DESC, a.id DESC`,
        params
      );
      let items = result.recordset;
      if (user.level) {
        items = items.filter(a => matchesLevel(user.level, a.target_level));
      }
      return { items, total: items.length, limit: items.length, offset: 0 };
    }
    // For paginated student view, fetch total then page, then filter in-memory for level
    const countResult = await query(`SELECT COUNT(*) AS count ${baseQuery}`, params);
    params.limit = limitVal;
    params.offset = offsetVal;
    const result = await query(
      `SELECT a.*,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS has_submitted,
        CASE WHEN s.is_late = 1 THEN 1 ELSE 0 END AS is_late_submission
       ${baseQuery}
        ORDER BY a.created_at DESC, a.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );
    let items = result.recordset;
    if (user.level) {
      items = items.filter(a => matchesLevel(user.level, a.target_level));
    }
    return { items, total: Number(countResult.recordset[0].count), limit: limitVal, offset: offsetVal };
  }

  const params = { lecturerId };
  let whereSearch = '';
  if (searchTerm) {
    whereSearch = 'AND (a.title LIKE @search OR a.description LIKE @search)';
    params.search = `%${searchTerm}%`;
  }
  const baseQueryAll = `FROM Assignments a
      LEFT JOIN Submissions s ON s.assignment_id = a.id AND s.student_id = @lecturerId
      WHERE (a.publish_date IS NULL OR a.publish_date <= SYSUTCDATETIME()) ${whereSearch}`;
  if (!hasPagination) {
    const result = await query(
      `SELECT a.*,
      CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS has_submitted,
      CASE WHEN s.is_late = 1 THEN 1 ELSE 0 END AS is_late_submission
     ${baseQueryAll}
      ORDER BY a.created_at DESC, a.id DESC`,
      params
    );
    return { items: result.recordset, total: result.recordset.length, limit: result.recordset.length, offset: 0 };
  }
  const countResult = await query(`SELECT COUNT(*) AS count ${baseQueryAll}`, params);
  params.limit = limitVal;
  params.offset = offsetVal;
  const result = await query(
    `SELECT a.*,
      CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END AS has_submitted,
      CASE WHEN s.is_late = 1 THEN 1 ELSE 0 END AS is_late_submission
     ${baseQueryAll}
      ORDER BY a.created_at DESC, a.id DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
    params
  );
  return { items: result.recordset, total: Number(countResult.recordset[0].count), limit: limitVal, offset: offsetVal };
}

async function findById(id) {
  const result = await query('SELECT * FROM Assignments WHERE id = @id', { id });
  return result.recordset[0] || null;
}

async function update(id, { title, description, dueDate, courseCode, courseTitle, targetLevel = null, courseId = null, semester = null, acceptLateSubmissions = 1, lateCutoff = null, publishDate = null }) {
  const attempts = [
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true, includeLatePolicy: true, includePublishDate: true },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true, includeLatePolicy: true, includePublishDate: false },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: true, includeLatePolicy: false, includePublishDate: false },
    { includeCourseFields: true, includeTargetLevel: true, includeCourseLink: false, includeLatePolicy: false, includePublishDate: false },
    { includeCourseFields: true, includeTargetLevel: false, includeCourseLink: false, includeLatePolicy: false, includePublishDate: false },
    { includeCourseFields: false, includeTargetLevel: false, includeCourseLink: false, includeLatePolicy: false, includePublishDate: false },
  ];
  let lastError;

  for (const { includeCourseFields, includeTargetLevel, includeCourseLink, includeLatePolicy, includePublishDate } of attempts) {
    try {
      const result = await query(
        buildAssignmentUpdateQuery(includeCourseFields, includeTargetLevel, includeCourseLink, includeLatePolicy, includePublishDate),
        { id, title, description, dueDate, courseCode, courseTitle, targetLevel, courseId, semester, acceptLateSubmissions, lateCutoff, publishDate }
      );
      return result.recordset[0] || null;
    } catch (err) {
      if (includePublishDate && isMissingColumnError(err, 'publish_date')) {
        lastError = err;
        continue;
      }
      if (includeLatePolicy && (isMissingColumnError(err, 'accept_late_submissions') || isMissingColumnError(err, 'late_cutoff'))) {
        lastError = err;
        continue;
      }
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

module.exports = { buildAssignmentCreateQuery, buildAssignmentUpdateQuery, isMissingColumnError, create, findAll, findAllPaginated, findById, update, remove };
