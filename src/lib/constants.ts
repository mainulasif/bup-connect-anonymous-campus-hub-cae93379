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
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'unspecified', label: 'Prefer not to say' },
] as const;

export const JAIL_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';

export const RATE_LIMITS = {
  post: { window: 5, max: 3 },
  comment: { window: 1, max: 5 },
  message: { window: 1, max: 20 },
  report: { window: 60, max: 5 },
} as const;

export const DELETE_FOR_EVERYONE_LIMIT_MS = 5 * 60 * 1000;

export const ROLE_HIERARCHY = ['founder', 'admin', 'creator', 'moderator', 'member'] as const;
