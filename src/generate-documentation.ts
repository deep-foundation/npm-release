import { execa } from 'execa';
import fsExtra from 'fs-extra';
import {
  generateHelpOfCliAppsInMarkdownFormat,
  GenerateHelpOfCliAppsInMarkdownFormatOptions,
} from '@freephoenix888/generate-help-of-cli-apps-in-markdown-format/dist/main.js';
import {
  generateUsageWaysOfNpmCliAppsInMarkdownFormat,
  GenerateUsageWaysOfNpmCliAppsInMarkdownFormatOptions,
} from '@freephoenix888/generate-usage-ways-of-npm-cli-apps-in-markdown-format/dist/main.js';
import {
  generateTableOfContentsForMarkdown,
  GenerateTableOfContentsForMarkdownOptions,
} from '@freephoenix888/generate-table-of-contents-for-markdown/dist/main.js';
import debug from 'debug'
import { ensureGitIsConfigured } from './ensure-git-is-configured.js';
import { glob } from 'glob';

export async function generateDocumentation(
  options: GenerateDocumentationOptions
) {
  await ensureGitIsConfigured();
  await updateReadmeIfNeeded({ options });
  await generateTypescriptDocumentation();
}

async function updateReadmeIfNeeded({
  options,
}: {
  options: GenerateDocumentationOptions;
}) {
  const log = debug(`npm-automation:generateDocumentation:${updateReadmeIfNeeded.name}`)
  log({options})
  const readmeFilePath = options.readmeFilePath ?? './README.md';
  if (options.generateCliAppsHelpInReadmeOptions !== null) {
    const {generateCliAppsHelpInReadmeOptions = {
      cliAppFilePaths: await glob(`./dist/cli/*.js`, {absolute: true}),
      output: {
        writeMode: 'replace-placeholder',
        placeholder: {
          start: `<!-- CLI_HELP_START -->`,
          end: `<!-- CLI_HELP_END -->`,
        },
        filePath: readmeFilePath
      }
    }} = options;
    const helpOfCliAppsInMarkdownFormat = await generateHelpOfCliAppsInMarkdownFormat(generateCliAppsHelpInReadmeOptions);
    log({helpOfCliAppsInMarkdownFormat})
  }
  if (options.generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions !== null) {
    const {generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions = {
      cliUtilityNames: await glob(`./dist/cli/*.js`, {absolute: true}).then(cliAppFilePaths => cliAppFilePaths.map(cliAppFilePath => cliAppFilePath.replace(/\.js$/, ''))),
      output: {
        writeMode: 'replace-placeholder',
        placeholder: {
          start: `<!-- CLI_USAGE_WAYS_START -->`,
          end: `<!-- CLI_USAGE_WAYS_END -->`,
        },
        filePath: readmeFilePath
      }
    }} = options;
    const usageWaysOfNpmCliAppsInMarkdownFormat = await generateUsageWaysOfNpmCliAppsInMarkdownFormat(generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions);
    log({usageWaysOfNpmCliAppsInMarkdownFormat})
  }
  if (options.generateTableOfContentsForMarkdownOptions!==null) {
    const {generateTableOfContentsForMarkdownOptions = {
      markdownFilePath: readmeFilePath,
      output: {
        writeMode: 'replace-placeholder',
        placeholder: {
          start: `<!-- TABLE_OF_CONTENTS_START -->`,
          end: `<!-- TABLE_OF_CONTENTS_END -->`,
        },
        filePath: readmeFilePath
      }
    }} = options;
    const tableOfContents = await generateTableOfContentsForMarkdown(generateTableOfContentsForMarkdownOptions);
    log({tableOfContents})
  }
  const gitAddExecResult = await execa(`git`, ['add', readmeFilePath]);
  log({gitAddExecResult})
  const execResultAfterReadmeUpdate = await execa(
    'git',
    ['diff', '--staged', '--quiet'],
    { reject: false,   } 
  );
  log({execResultAfterReadmeUpdate})
  if (execResultAfterReadmeUpdate.exitCode === 0) {
    console.log('No changes to commit');
  } else {
    await execa('git', ['commit', '-m', 'Update README.md']);
    await execa('git', ['push', 'origin', 'main']);
  }
}

async function generateTypescriptDocumentation() {
  const log = debug(`npm-automation:generateDocumentation:${generateTypescriptDocumentation.name}`)
  await execa('npx', ['typedoc', './src/main.ts'], {stdio: 'inherit', verbose: true});
  await execa(`git`, [`fetch`, `origin`, `gh-pages`], {stdio: 'inherit', verbose: true});
  await execa('git', ['checkout', '--orphan', 'gh-pages'], {stdio: 'inherit', verbose: true});
  await execa('git', ['add', 'docs'], {stdio: 'inherit', verbose: true});
  await execa('git', ['commit', '-m', 'Update documentation'], {stdio: 'inherit', verbose: true});
  await execa('git', ['push', 'origin', 'gh-pages'], {stdio: 'inherit', verbose: true});
  await execa('git', ['checkout', 'main'], {stdio: 'inherit', verbose: true});
}

export type GenerateDocumentationOptions = {
  generateCliAppsHelpInReadmeOptions?: undefined|null|(GenerateHelpOfCliAppsInMarkdownFormatOptions & {
    placeholder?: string;
  });
  generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions?: undefined|null|(GenerateUsageWaysOfNpmCliAppsInMarkdownFormatOptions & {
    placeholder?: string;
  });
  generateTableOfContentsForMarkdownOptions?: undefined|null|(GenerateTableOfContentsForMarkdownOptions & {
    placeholder?: string;
  });
  readmeFilePath?: string;
};
