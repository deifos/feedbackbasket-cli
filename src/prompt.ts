import { createInterface } from 'node:readline';

const rl = () => createInterface({ input: process.stdin, output: process.stdout });

export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const iface = rl();
    iface.question(question, (answer) => {
      iface.close();
      resolve(answer.trim());
    });
  });
}

export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await ask(`${question} (${hint}): `);
  if (answer === '') return defaultYes;
  return answer.toLowerCase().startsWith('y');
}

export async function select(question: string, options: string[]): Promise<number | null> {
  for (let i = 0; i < options.length; i++) {
    console.log(`    ${i + 1}. ${options[i]}`);
  }
  console.log();
  const answer = await ask(`  ${question} (1-${options.length}, or skip): `);
  if (answer === '' || answer.toLowerCase() === 'skip' || answer.toLowerCase() === 's') {
    return null;
  }
  const num = parseInt(answer, 10);
  if (isNaN(num) || num < 1 || num > options.length) return null;
  return num - 1;
}
