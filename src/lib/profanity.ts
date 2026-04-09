// Client-side profanity filter (basic, supplemented by server-side check)
const BASIC_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'damn', 'bastard',
  'cunt', 'whore', 'slut', 'nigger', 'faggot', 'retard'
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BASIC_WORDS.some(w => lower.includes(w));
}

export function censorText(text: string): string {
  let result = text;
  BASIC_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    result = result.replace(regex, '*'.repeat(word.length));
  });
  return result;
}
