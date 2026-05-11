import { readFile } from 'node:fs/promises';

export async function readInput(source: string | null): Promise<unknown> {
  if (source === null) return null;

  let data: string;
  if (source === '-') {
    process.stdin.setEncoding('utf8');
    const chunks: string[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    data = chunks.join('');
    if (data.trim() === '') return null;
  } else {
    try {
      data = await readFile(source, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${source}`);
      }
      throw error;
    }
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Invalid JSON in input: ${(error as Error).message}`);
  }
}
