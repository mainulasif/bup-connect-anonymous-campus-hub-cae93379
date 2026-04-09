// 20 anonymous avatar options
export const AVATARS = [
  { id: 1, emoji: '🦊', label: 'Fox' },
  { id: 2, emoji: '🐺', label: 'Wolf' },
  { id: 3, emoji: '🦉', label: 'Owl' },
  { id: 4, emoji: '🐱', label: 'Cat' },
  { id: 5, emoji: '🐻', label: 'Bear' },
  { id: 6, emoji: '🦁', label: 'Lion' },
  { id: 7, emoji: '🐯', label: 'Tiger' },
  { id: 8, emoji: '🐰', label: 'Bunny' },
  { id: 9, emoji: '🦄', label: 'Unicorn' },
  { id: 10, emoji: '🐲', label: 'Dragon' },
  { id: 11, emoji: '🦅', label: 'Eagle' },
  { id: 12, emoji: '🐧', label: 'Penguin' },
  { id: 13, emoji: '🦋', label: 'Butterfly' },
  { id: 14, emoji: '🐬', label: 'Dolphin' },
  { id: 15, emoji: '🦝', label: 'Raccoon' },
  { id: 16, emoji: '🐼', label: 'Panda' },
  { id: 17, emoji: '🦇', label: 'Bat' },
  { id: 18, emoji: '🐸', label: 'Frog' },
  { id: 19, emoji: '🦎', label: 'Lizard' },
  { id: 20, emoji: '🐙', label: 'Octopus' },
] as const;

export const getAvatar = (id: number) => AVATARS.find(a => a.id === id) || AVATARS[0];
