import {lstat} from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';
import fsExtra from 'fs-extra';
import createDebugMessages from 'debug';
import {fileURLToPath} from 'url'
import { execa } from 'execa';

/**
 * Pulls the latest version of the npm package and copies it to the root folder
 * 
 * @throws {@link Error} if there are not commited changes 
 * @throws {@link Error} if the exit code of npm install is not 0
 * 
 * @example
```typescript
await npmPull({
  packageName: '@deep-foundation/deep-memo',
})
```
 * 
 */
export async function npmPull(param: NpmPullOptions) {
  const log = createDebugMessages(
    '@deep-foundation/npm-automation:npm-pull'
  );
  log({param})
  const { packageName ,packageVersion = 'latest'} = param;
  const gitDiffExecResult = await execa(`git`, ['diff']);
  log({gitDiffExecResult})
  if (gitDiffExecResult.stdout) {
    throw new Error(
      'You have unstaged changes. Stash (git stash) or commit (git commit) them'
    );
  }

  const npmInstallExecResult = await execa(
    `npm`, [`install`, `${packageName}@${packageVersion}`, `--no-save`]
  );
  log({npmInstallExecResult})
  const currentDir = process.cwd();
  log({currentDir})
  const nodeModuleDirectoryPath = path.join(
    path.resolve(currentDir, `node_modules`),
    packageName
  );
  log({nodeModuleDirectoryPath})
  const nodeModuleFilePaths = await glob(`${nodeModuleDirectoryPath}/**/*`, {
    ignore: [`dist`, `node_modules`],
    withFileTypes: true,
  });
  log({nodeModuleFilePaths})
  await Promise.all(
    nodeModuleFilePaths.map(async (nodeModuleFilePath) => {
      if (!nodeModuleFilePath.isFile()) return;
      const moveSrc = nodeModuleFilePath.fullpath();
      log({moveSrc})
      const moveDestination = path.join(
        currentDir,
        nodeModuleFilePath.fullpath().replace(nodeModuleDirectoryPath, '')
      );
      log({moveDestination})
      return await fsExtra.move(
        moveSrc,
        moveDestination,
        {
          overwrite: true,
        }
      );
    })
  );
}

export interface NpmPullOptions {
  /**
   * Name of the npm package
   */
  packageName: string;
  /**
   * Version of the npm package
   * 
   * @defaultValue `latest`
   */
  packageVersion?: string;
}
