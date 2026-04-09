export const GIFT_EMOJI: Record<string, string> = {
  'Black Orchid': '🌸',
  Plushie: '🧸',
  Heart: '💜',
  Diamond: '💎',
};

export const PROFILE_GIFT_FIELDS = [
  { key: 'gift_black_orchid', name: 'Black Orchid', emoji: GIFT_EMOJI['Black Orchid'] },
  { key: 'gift_plushie', name: 'Plushie', emoji: GIFT_EMOJI.Plushie },
  { key: 'gift_heart', name: 'Heart', emoji: GIFT_EMOJI.Heart },
  { key: 'gift_diamond', name: 'Diamond', emoji: GIFT_EMOJI.Diamond },
] as const;

export const QUICK_REACTIONS = ['❤️', '😂', '🔥', '👏'] as const;