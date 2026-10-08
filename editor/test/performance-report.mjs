import { mkdir, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
export function metrics(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return { samples: sorted.length, p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] ?? Infinity, maxMs: sorted.at(-1) ?? Infinity };
}
export async function writePerformanceReport(name, value) {
  const directory = new URL('../../.editor-validation/performance/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL(name + '.json', directory), JSON.stringify({ environment: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version, viewport: '1440x900', cpuThrottle: 'none', input: 'trusted CDP text insertion, not native IME' }, ...value }, null, 2) + '\n');
}
