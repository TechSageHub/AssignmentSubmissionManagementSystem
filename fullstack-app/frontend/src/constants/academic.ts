export const DEPARTMENTS = [
  'Accountancy',
  'Agricultural & Bio-Environmental Engineering',
  'Architectural Technology',
  'Banking & Finance',
  'Building Technology',
  'Business Administration & Management',
  'Civil Engineering',
  'Computer Engineering',
  'Computer Science',
  'Estate Management & Valuation',
  'Electrical/Electronic Engineering',
  'Food Technology',
  'Hospitality Management',
  'Leisure & Tourism Management',
  'Library & Information Science',
  'Marketing',
  'Mass Communication',
  'Mathematics & Statistics',
  'Mechanical Engineering',
  'Office Technology & Management',
  'Public Administration',
  'Quantity Surveying',
  'Science Laboratory Technology',
  'Statistics',
  'Surveying & Geo-informatics',
  'Taxation',
  'Urban & Regional Planning',
] as const

export const STUDENT_LEVELS = ['ND I', 'ND II', 'HND I', 'HND II'] as const

export const LECTURER_LEVEL_SCOPES = [
  { value: 'both', label: 'Both ND & HND (All Levels)' },
  { value: 'nd', label: 'ND Only (ND I & ND II)' },
  { value: 'hnd', label: 'HND Only (HND I & HND II)' },
] as const

export function getTargetLevels(scope?: string | null): string[] {
  const s = (scope || '').toLowerCase().trim()
  if (s === 'nd' || s === 'nd only') {
    return ['ND (All)', 'ND I', 'ND II']
  }
  if (s === 'hnd' || s === 'hnd only') {
    return ['HND (All)', 'HND I', 'HND II']
  }
  return [
    'All Levels',
    'ND (All)',
    'ND I',
    'ND II',
    'HND (All)',
    'HND I',
    'HND II',
  ]
}
