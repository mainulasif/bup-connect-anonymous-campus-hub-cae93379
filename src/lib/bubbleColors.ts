/** Maps CSS class names from bubble_colors table to actual CSS color values */
export const BUBBLE_COLOR_MAP: Record<string, string> = {
  'bg-primary': 'hsl(var(--primary))',
  'bg-blue-600': '#2563eb',
  'bg-orange-500': '#f97316',
  'bg-emerald-500': '#10b981',
  'bg-purple-600': '#9333ea',
  'bg-pink-400': '#f472b6',
  'bg-cyan-400': '#22d3ee',
  // New colors
  'bg-red-500': '#ef4444',
  'bg-amber-500': '#f59e0b',
  'bg-lime-500': '#84cc16',
  'bg-teal-500': '#14b8a6',
  'bg-indigo-600': '#4f46e5',
  'bg-fuchsia-500': '#d946ef',
  'bg-sky-400': '#38bdf8',
  'bg-slate-500': '#64748b',
  'bg-violet-500': '#8b5cf6',
  'bg-rose-500': '#f43f5e',
  'bg-blue-900': '#1e3a5f',
  'bg-green-700': '#15803d',
  'bg-pink-300': '#f9a8d4',
  'bg-blue-400': '#60a5fa',
  'bg-red-700': '#b91c1c',
  'bg-purple-300': '#d8b4fe',
  'bg-emerald-300': '#6ee7b7',
  'bg-gray-900': '#111827',
};

export const GRADIENT_MAP: Record<string, string> = {
  'bg-gradient-sunset': 'linear-gradient(135deg, #f97316, #ef4444, #ec4899)',
  'bg-gradient-neon': 'linear-gradient(135deg, #22d3ee, #8b5cf6, #ec4899)',
};

export function getBubbleBackground(cssClass: string | undefined): string | undefined {
  if (!cssClass) return undefined;
  if (GRADIENT_MAP[cssClass]) return GRADIENT_MAP[cssClass];
  return BUBBLE_COLOR_MAP[cssClass];
}
