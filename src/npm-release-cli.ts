import path from 'path';
import exec from '@simplyhexagonal/exec';
import { program } from 'commander';
import { execAndLogStdoutOrThrowError } from './exec-and-log-stdout-or-throw-error.js';
import { npmRelease } from './npm-release.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

main();

async function main() {
  program
    .name('npm-release')
    .description('Release a package to npm')
    .addHelpText(
      'after',
      `
   
   Before releaseing deep.json version syncronizes with package.json version. Package will not be releaseed if there are newer version in npm`
    );

  program
    .option('--new-version <new_version>', 'New version to release')
    .option(
      '--package-json-file-path <package_json_file_path>',
      'package.json file path'
    )
    .option(
      '--deep-json-file-path <deep_json_file_path>',
      'deep.json file path'
    );

  program.parse(process.argv);

  const {
    newVersion = 'patch',
    packageJsonPath = require.resolve('package.json'),
    deepJsonFilePath = require.resolve('deep.json'),
  } = program.opts();

  await npmRelease({
    deepJsonFilePath,
    newVersion,
    packageJsonFilePath: packageJsonPath,
  });
}