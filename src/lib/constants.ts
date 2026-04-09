export const BAN_DURATIONS = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '12 hours', minutes: 720 },
  { label: '24 hours', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
  { label: '7 days', minutes: 10080 },
  { label: '15 days', minutes: 21600 },
  { label: '30 days', minutes: 43200 },
  { label: 'Permanent', minutes: 0 },
] as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', icon: '🧔' },
  { value: 'female', label: 'Female', icon: '💁‍♀️' },
  { value: 'unspecified', label: 'Prefer not to say', icon: '🤫' },
] as const;

export const JAIL_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

// Rate limits
export const RATE_LIMITS = {
  post: { window: 5, max: 3 },      // 3 posts per 5 min
  comment: { window: 1, max: 5 },    // 5 comments per min
  message: { window: 1, max: 20 },   // 20 msgs per min
  report: { window: 60, max: 5 },    // 5 reports per hour
} as const;

// Delete-for-everyone time limit (5 minutes)
export const DELETE_FOR_EVERYONE_LIMIT_MS = 5 * 60 * 1000;

export const ROLE_HIERARCHY = ['founder', 'admin', 'creator', 'moderator', 'member'] as const;
