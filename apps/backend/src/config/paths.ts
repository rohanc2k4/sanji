import { homedir } from 'node:os';
import { isAbsolute, resolve } from 'node:path';

export interface VaultPaths {
  vault: string;
  sanjiDir: string;
  configFile: string;
  indexDb: string;
  skillsDir: string;
  versionsDir: string;
  modelCacheDir: string;
}

export function resolveVaultPaths(input: string): VaultPaths {
  const expanded = input.startsWith('~/') ? input.replace('~', homedir()) : input;
  const vault = isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
  const sanjiDir = `${vault}/.sanji`;
  return {
    vault,
    sanjiDir,
    configFile: `${sanjiDir}/config.toml`,
    indexDb: `${sanjiDir}/index.db`,
    skillsDir: `${sanjiDir}/skills`,
    versionsDir: `${sanjiDir}/versions`,
    modelCacheDir: `${sanjiDir}/model-cache`,
  };
}
