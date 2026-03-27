import chalk from 'chalk';

// FeedbackBasket brand colors
// Primary: green (#22c55e) — used for accents, commands, success
// Foreground: white/gray — standard text
// Error: red — errors, bugs, high severity
// Warning: amber/yellow — notices, medium severity
// Muted: gray — secondary text, dividers

export const brand = {
  // Primary accent — use instead of cyan
  primary: chalk.hex('#22c55e'),
  primaryBold: chalk.hex('#22c55e').bold,

  // Text
  bold: chalk.bold,
  muted: chalk.gray,
  dim: chalk.dim,

  // Status
  success: chalk.hex('#22c55e'),
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,

  // Semantic
  label: chalk.bold,
  value: chalk.white,
  hint: chalk.gray.italic,
  divider: chalk.gray,
  command: chalk.hex('#22c55e'),

  // Category badges
  bug: chalk.red,
  feature: chalk.hex('#22c55e'),
  improvement: chalk.hex('#06b6d4'),
  question: chalk.yellow,

  // Severity
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.hex('#22c55e'),
};

// Box drawing
export function divider(width = 50): string {
  return brand.muted('─'.repeat(width));
}

export function logo(): string {
  return `${brand.primaryBold('Feedback')}${brand.bold('Basket')}`;
}
