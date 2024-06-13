import fs from 'fs-extra';
import mockFs from 'mock-fs';
import {
  syncDependencies,
  SyncDependenciesParam,
} from '../src/sync-dependencies';

afterEach(() => {
  jest.clearAllMocks();
  mockFs.restore();
});

describe('syncDependencies', () => {
  const params: SyncDependenciesParam = {
    deepJsonFilePath: 'path/to/deepJson.json',
    packageJsonFilePath: 'path/to/package.json',
  };

  beforeEach(() => {
    mockFs({
      'path/to': {
        'deepJson.json': '{}',
        'package.json': '{}',
      },
    });
  });

  it('should not modify anything when both deepJson and packageJson have the same dependencies and versions', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );
    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({ test: '~1.0.0' });
    expect(packageJson.dependencies).toEqual({ test: '~1.0.0' });
  });

  it('should update the version in packageJson when deepJson has a higher version', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.1.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
    });

    await syncDependencies(params);

    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(packageJson.dependencies).toEqual({ test: '~1.1.0' });
  });

  it('should update the version in deepJson when packageJson has a higher version', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: '~1.1.0' },
      }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({ test: '~1.1.0' });
  });

  it('should add the missing dependency to packageJson', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({ dependencies: {} }),
    });

    await syncDependencies(params);

    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(packageJson.dependencies).toEqual({ test: '~1.0.0' });
  });

  it('should add the missing dependency to deepJson', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({ dependencies: {} }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({ test: '~1.0.0' });
  });

  it('should not add a dependency to package.json when the dependency is present in deep.json but has no version', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: undefined },
      }),
      'path/to/package.json': JSON.stringify({ dependencies: {} }),
    });

    await syncDependencies(params);

    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(packageJson.dependencies).toEqual({});
  });

  it('should not add a dependency to deep.json when the dependency is present in package.json but has no version', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({ dependencies: {} }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: undefined },
      }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({});
  });

  it('should update the version in deep.json if package.json has a greater version', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: '~1.0.1' },
      }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({ test: '~1.0.1' });
  });

  it('should update the version in package.json if deep.json has a greater version', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.0.1' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
    });

    await syncDependencies(params);

    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(packageJson.dependencies).toEqual({ test: '~1.0.1' });
  });

  it('should not change the version if the versions in deep.json and package.json are the same', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );
    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({ test: '~1.0.0' });
    expect(packageJson.dependencies).toEqual({ test: '~1.0.0' });
  });

  it('should not update deep.json or package.json if the versions are non-semver', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: 'git+https://github.com/user/repo.git#v1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test: 'git+https://github.com/user/repo.git#v1.0.1' },
      }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );
    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({
      test: 'git+https://github.com/user/repo.git#v1.0.0',
    });
    expect(packageJson.dependencies).toEqual({
      test: 'git+https://github.com/user/repo.git#v1.0.1',
    });
  });

  it(`should not update deep.json or package.json if one of them doesn't have the version`, async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test: '~1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({ dependencies: { test: null } }),
    });

    await syncDependencies(params);

    const deepJson = JSON.parse(
      await fs.readFile(params.deepJsonFilePath, 'utf-8')
    );
    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(deepJson.dependencies).toEqual({ test: '~1.0.0' });
    expect(packageJson.dependencies).toEqual({ test: null });
  });

  it('should remove dependencies not present in deep.json from package.json', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test1: '~1.0.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test1: '~1.0.0', test2: '~2.0.0' },
      }),
    });

    await syncDependencies(params);

    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(packageJson.dependencies).toEqual({ test1: '~1.0.0' });
  });

  it('should add missing dependencies in package.json from deep.json', async () => {
    mockFs({
      'path/to/deepJson.json': JSON.stringify({
        dependencies: { test1: '~1.0.0', test2: '~2.0.0' },
      }),
      'path/to/package.json': JSON.stringify({
        dependencies: { test1: '~1.0.0' },
      }),
    });

    await syncDependencies(params);

    const packageJson = JSON.parse(
      await fs.readFile(params.packageJsonFilePath, 'utf-8')
    );

    expect(packageJson.dependencies).toEqual({
      test1: '~1.0.0',
      test2: '~2.0.0',
    });
  });
});
