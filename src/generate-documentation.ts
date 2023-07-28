import { execa } from 'execa';
import fsExtra from 'fs-extra';
import {
  generateHelpOfCliAppsInMarkdownFormat,
  GenerateHelpOfCliAppsInMarkdownFormatOptions,
} from '@freephoenix888/generate-help-of-cli-apps-in-markdown-format';
import {
  generateUsageWaysOfNpmCliAppsInMarkdownFormat,
  GenerateUsageWaysOfNpmCliAppsInMarkdownFormatOptions,
} from '@freephoenix888/generate-usage-ways-of-npm-cli-apps-in-markdown-format';
import {
  generateTableOfContentsForMarkdown,
  GenerateTableOfContentsForMarkdownOptions,
} from '@freephoenix888/generate-table-of-contents-for-markdown';
import createDebugMessages from 'debug'

export async function generateDocumentation(
  options: GenerateDocumentationOptions
) {
  await ensureGitIsConfigured();
  await updateReadme({ options });
  await generateTypescriptDocumentation();
}

async function ensureGitIsConfigured() {
  const debug = createDebugMessages('npm-automation:generateDocumentation:ensureGitIsConfigured')
  const { stdout: username } = await execa(
    'git',
    ['config', '--global', 'user.name'],
    { reject: false,  verbose: true }
  );
  debug({username})
  if (!username) {
    throw new Error(
      `Please set your git username using the command: git config --global user.name "Your Name"`
    );
  }
  const { stdout: email } = await execa(
    'git',
    ['config', '--global', 'user.email'],
    { reject: false,  verbose: true }
  );
  debug({email})
  if (!email) {
    throw new Error(
      `Please set your git email using the command: git config --global user.email "Your email"`
    );
  }
}

async function updateReadme({
  options,
}: {
  options: GenerateDocumentationOptions;
}) {
  const debug = createDebugMessages('npm-automation:generateDocumentation:updateReadme')
  debug({options})
  if (
    options.generateCliAppsHelpInReadmeOptions ||
    options.generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions ||
    options.generateTableOfContentsForMarkdownOptions
  ) {
    const readmeFilePath = 'README.md';
    debug({readmeFilePath})
    let readmeContents = await fsExtra.readFile(readmeFilePath, 'utf8');
    debug({readmeContents})
    if (options.generateCliAppsHelpInReadmeOptions) {
      const helpOfCliAppsInMarkdownFormat =
        await generateHelpOfCliAppsInMarkdownFormat(
          options.generateCliAppsHelpInReadmeOptions
        );
      debug({helpOfCliAppsInMarkdownFormat})
      const readmeContentWithHelpOfCliAppsInMarkdownFormat = await replacePlaceholder({
        content: readmeContents,
        placeholder: 'CLI_HELP',
        replacement: helpOfCliAppsInMarkdownFormat
      })
      debug({readmeContentWithHelpOfCliAppsInMarkdownFormat})
      readmeContents = readmeContentWithHelpOfCliAppsInMarkdownFormat;
    }
    if (options.generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions) {
      const usageWaysOfNpmCliAppsInMarkdownFormat =
        await generateUsageWaysOfNpmCliAppsInMarkdownFormat(
          options.generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions
        );
      debug({usageWaysOfNpmCliAppsInMarkdownFormat})
      const redmiContentWithUsageWaysOfNpmCliAppsInMarkdownFormat = await replacePlaceholder({
        content: readmeContents,
        placeholder: 'CLI_USAGE_WAYS',
        replacement: usageWaysOfNpmCliAppsInMarkdownFormat
      });
      debug({redmiContentWithUsageWaysOfNpmCliAppsInMarkdownFormat})
      readmeContents = redmiContentWithUsageWaysOfNpmCliAppsInMarkdownFormat;
    }
    if (options.generateTableOfContentsForMarkdownOptions) {
      const tableOfContents = await generateTableOfContentsForMarkdown(
        options.generateTableOfContentsForMarkdownOptions
      );
      debug({tableOfContents})
      const readmeContentWithTableOfContents = await replacePlaceholder({
        content: readmeContents,
        placeholder: 'TABLE_OF_CONTENTS',
        replacement: tableOfContents
      });
      debug({readmeContentWithTableOfContents})
      readmeContents = readmeContentWithTableOfContents;
    }
    await fsExtra.writeFile(readmeFilePath, readmeContents);
    await execa(`git`, ['add', readmeFilePath], {
      verbose: true,
    });
    const execResultAfterReadmeUpdate = await execa(
      'git',
      ['diff', '--staged', '--quiet'],
      { reject: false,  verbose: true }
    );
    debug({execResultAfterReadmeUpdate})
    if (execResultAfterReadmeUpdate.exitCode === 0) {
      console.log('No changes to commit');
    } else {
      await execa('git', ['commit', '-m', 'Update README.md'], {
        verbose: true,
      });
      await execa('git', ['push', 'origin', 'main'], {
        verbose: true,
      });
    }
  }
}

async function generateTypescriptDocumentation() {
  const debug = createDebugMessages('npm-automation:generateDocumentation:generateTypescriptDocumentation')
  // Generate the docs first
  await execa('npx', ['typedoc', './src/main.ts'], {
    verbose: true,
  });

  // Stage and commit the docs in the main branch
  await execa('git', ['add', 'docs'], {  verbose: true });
  await execa('git', ['commit', '-m', 'Update documentation'], {
    verbose: true,
  });

  // Check if the gh-pages branch exists
  const { stdout: ghPagesBranchExists } = await execa(
    'git',
    ['branch', '-r', '--list', 'origin/gh-pages'],
    { reject: false,  verbose: true }
  );
  debug({ghPagesBranchExists})

  if (!ghPagesBranchExists) {
    // If it doesn't exist, create it as an orphan branch
    await execa('git', ['checkout', '--orphan', 'gh-pages'], {
      verbose: true,
    });
  } else {
    // If it does exist, just checkout to it
    await execa('git', ['checkout', 'gh-pages'], {
      verbose: true,
    });
  }

  // Checkout the docs from the main branch to the gh-pages branch
  await execa('git', ['checkout', 'main', '--', 'docs'], {
    verbose: true,
  });

  // Commit and push the changes
  await execa('git', ['commit', '-m', 'Update documentation'], {
    verbose: true,
  });
  await execa('git', ['push', 'origin', 'gh-pages'], {
    verbose: true,
  });

  // Switch back to the main branch
  await execa('git', ['checkout', 'main'], {  verbose: true });
}

async function replacePlaceholder({content, placeholder, replacement}: {content: string, placeholder: string, replacement: string}) {
  const placeholderStart = `<!-- ${placeholder}_START -->`;
  const placeholderEnd = `<!-- ${placeholder}_END -->`;
  const pattern = new RegExp(`(?<start>${placeholderStart})[\\S\\s]*(?<end>${placeholderEnd})`, 'g');
  content.replace(
    pattern,
    `$<start>\n${replacement}\n$<end>`
  )
  return content
}

export type GenerateDocumentationOptions = {
  generateCliAppsHelpInReadmeOptions?: GenerateHelpOfCliAppsInMarkdownFormatOptions & {
    placeholder?: string;
  };
  generateUsageWaysOfNpmCliAppsInMarkdownFormatOptions?: GenerateUsageWaysOfNpmCliAppsInMarkdownFormatOptions & {
    placeholder?: string;
  };
  generateTableOfContentsForMarkdownOptions?: GenerateTableOfContentsForMarkdownOptions & {
    placeholder?: string;
  };
};
