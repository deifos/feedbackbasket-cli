import type { Breadcrumb, ResponseOptions } from './envelope.js';
import type { CLIError } from './errors.js';
import { brand, divider } from './theme.js';

export function renderStyledResponse(data: unknown, opts: ResponseOptions): void {
  if (opts.summary) {
    console.log(brand.primaryBold(opts.summary));
    console.log();
  }

  if (Array.isArray(data)) {
    renderArray(data);
  } else if (data && typeof data === 'object') {
    renderObject(data as Record<string, unknown>);
  } else {
    console.log(String(data));
  }

  if (opts.notice) {
    console.log();
    console.log(brand.warning(opts.notice));
  }

  if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
    renderBreadcrumbs(opts.breadcrumbs);
  }
}

export function renderStyledError(error: CLIError): void {
  console.error(brand.error.bold(`Error: ${error.message}`));
  if (error.hint) {
    console.error(brand.muted(`  Hint: ${error.hint}`));
  }
}

function renderBreadcrumbs(breadcrumbs: Breadcrumb[]): void {
  console.log();
  console.log(divider());
  console.log(brand.bold('Hints:'));
  for (const bc of breadcrumbs) {
    const desc = bc.description ? brand.muted(` — ${bc.description}`) : '';
    console.log(`  ${brand.command(bc.cmd)}${desc}`);
  }
}

function renderArray(items: unknown[]): void {
  if (items.length === 0) {
    console.log(brand.muted('  No results'));
    return;
  }

  for (const item of items) {
    if (item && typeof item === 'object') {
      renderObject(item as Record<string, unknown>);
      console.log();
    } else {
      console.log(`  ${String(item)}`);
    }
  }
}

function renderObject(obj: Record<string, unknown>): void {
  const maxKeyLen = Math.max(...Object.keys(obj).map(k => k.length));

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    const label = brand.label(key.padEnd(maxKeyLen));

    if (Array.isArray(value)) {
      if (value.length === 0) {
        console.log(`  ${label}  ${brand.muted('(none)')}`);
      } else if (typeof value[0] === 'object') {
        console.log(`  ${label}  ${brand.muted(`(${value.length} items)`)}`);
      } else {
        console.log(`  ${label}  ${value.join(', ')}`);
      }
    } else if (typeof value === 'object') {
      console.log(`  ${label}  ${JSON.stringify(value)}`);
    } else {
      console.log(`  ${label}  ${String(value)}`);
    }
  }
}
