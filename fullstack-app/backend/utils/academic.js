// Academic utility functions for department and level filtering

function normalizeDept(dept) {
  if (!dept || typeof dept !== 'string') return '';
  return dept.trim().toLowerCase();
}

function isSameDepartment(dept1, dept2) {
  const d1 = normalizeDept(dept1);
  const d2 = normalizeDept(dept2);
  if (!d1 || !d2) return true; // If one has no department set, don't strictly block
  return d1 === d2;
}

function normalizeLevel(level) {
  if (!level || typeof level !== 'string') return '';
  return level.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Checks whether a student's level matches an assignment's target level.
 * @param {string|null} studentLevel e.g. 'ND I', 'ND II', 'HND I', 'HND II'
 * @param {string|null} targetLevel e.g. 'ND I', 'ND II', 'ND (All)', 'HND I', 'HND II', 'HND (All)', 'All Levels'
 */
function matchesLevel(studentLevel, targetLevel) {
  if (!targetLevel || targetLevel === 'All Levels' || targetLevel.toLowerCase() === 'all') {
    return true;
  }
  if (!studentLevel) {
    // If student has no level assigned, fallback to true so they aren't completely locked out
    return true;
  }

  const sNorm = normalizeLevel(studentLevel);
  const tNorm = normalizeLevel(targetLevel);

  if (tNorm === 'ALL LEVELS' || tNorm === 'ALL') {
    return true;
  }

  if (tNorm === 'ND (ALL)' || tNorm === 'ND') {
    return sNorm.startsWith('ND');
  }

  if (tNorm === 'HND (ALL)' || tNorm === 'HND') {
    return sNorm.startsWith('HND');
  }

  return sNorm === tNorm;
}

/**
 * Checks if a target level is permitted given a lecturer's teaching scope.
 * @param {string|null} lecturerScope 'nd', 'hnd', 'both', or 'ND Only', 'HND Only', 'Both ND & HND'
 * @param {string|null} targetLevel
 */
function isTargetLevelAllowed(lecturerScope, targetLevel) {
  if (!lecturerScope || !targetLevel) return true;

  const scope = lecturerScope.toLowerCase().trim();
  const target = targetLevel.toLowerCase().trim();

  if (scope === 'both' || scope === 'both nd & hnd' || scope === 'all') {
    return true;
  }

  if (scope === 'nd' || scope === 'nd only') {
    if (target.includes('hnd') || target === 'all levels') {
      return false;
    }
    return true;
  }

  if (scope === 'hnd' || scope === 'hnd only') {
    if ((target.includes('nd') && !target.includes('hnd')) || target === 'all levels') {
      return false;
    }
    return true;
  }

  return true;
}

module.exports = {
  normalizeDept,
  isSameDepartment,
  normalizeLevel,
  matchesLevel,
  isTargetLevelAllowed,
};
