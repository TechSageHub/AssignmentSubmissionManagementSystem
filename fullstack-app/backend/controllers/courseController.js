const courseModel = require('../models/course');
const auditLog = require('../utils/auditLogger');

// GET /courses — full catalog for assignment forms (any authenticated user).
async function getCourseLookup(req, res, next) {
  try {
    const courses = await courseModel.findAllForLookup();
    res.json(courses);
  } catch (err) {
    next(err);
  }
}

// GET /admin/courses — paginated + searchable management list.
async function getCourses(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const result = await courseModel.findAll({ search, limit, offset });
    res.json({ ...result, limit, offset });
  } catch (err) {
    next(err);
  }
}

async function createCourse(req, res, next) {
  try {
    const { code, title, department } = req.body;
    if (!code || !title) {
      return res.status(400).json({ error: 'ValidationError', details: 'Course code and title are required' });
    }
    const codeValue = String(code).trim().toUpperCase();
    const titleValue = String(title).trim();
    if (codeValue.length > 20) {
      return res.status(400).json({ error: 'ValidationError', details: 'Course code must be 20 characters or fewer' });
    }
    const course = await courseModel.create({ code: codeValue, title: titleValue, department: department || null });
    auditLog.log(req, 'create_course', 'course', course.id, { code: course.code });
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
}

async function updateCourse(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid course ID' });
    }
    const existing = await courseModel.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'NotFound', details: 'Course not found' });
    }
    const { code, title, department } = req.body;
    if (!code || !title) {
      return res.status(400).json({ error: 'ValidationError', details: 'Course code and title are required' });
    }
    const course = await courseModel.update(id, {
      code: String(code).trim().toUpperCase(),
      title: String(title).trim(),
      department: department || null,
    });
    auditLog.log(req, 'update_course', 'course', id, { code: course.code });
    res.json(course);
  } catch (err) {
    next(err);
  }
}

async function deleteCourse(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid course ID' });
    }
    const deleted = await courseModel.remove(id);
    if (!deleted) {
      return res.status(404).json({ error: 'NotFound', details: 'Course not found' });
    }
    auditLog.log(req, 'delete_course', 'course', id);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCourseLookup, getCourses, createCourse, updateCourse, deleteCourse };