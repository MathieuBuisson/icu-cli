import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import envPaths from 'env-paths';

export interface Config {
  athleteId?: string;
  defaultFormat?: 'json' | 'table' | 'plain';
}

let cachedPaths: ReturnType<typeof envPaths> | null = null;

export function _resetConfigCache(): void {
  cachedPaths = null;
}

function getPaths(): ReturnType<typeof envPaths> {
  if (!cachedPaths) {
    cachedPaths = envPaths('icu-cli');
  }
  return cachedPaths;
}

export function getConfigDir(): string {
  return getPaths().config;
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export async function readConfig(): Promise<Config> {
  const configPath = getConfigPath();
  try {
    const content = await readFile(configPath, 'utf8');
    return JSON.parse(content) as Config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Config file is corrupted at ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

export async function writeConfig(config: Config): Promise<void> {
  const configDir = getConfigDir();
  await mkdir(configDir, { recursive: true });
  const configPath = getConfigPath();
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export async function resolveAthleteId(cliId?: string | null): Promise<string | null> {
  if (cliId) return cliId;
  const envId = process.env.ICU_ATHLETE_ID;
  if (envId) return envId;
  const config = await readConfig();
  return config.athleteId ?? null;
}
