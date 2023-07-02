
import { writeFile } from 'fs/promises';
import { DeepJson, DeepJsonDependency } from './deep-json.js';
import semver from 'semver'
import { type PackageJson } from 'types-package-json';
import createDebugMessages from 'debug';

export interface SyncDependenciesParam {
  /**
   * Path to deep.json
   */
  deepJsonFilePath: string;
  /**
   * Path to package.json
   */
  packageJsonFilePath: string;
}

/**
 * Syncronizes dependencies between {@link SyncDependenciesParam.deepJsonFilePath} and {@link SyncDependenciesParam.packageJsonFilePath}
 * 
 */
export async function syncDependencies(param: SyncDependenciesParam) {
  const debug = createDebugMessages(
    '@deep-foundation/npm-automation:npm-pull'
  );
  debug({param})
  const {
    deepJsonFilePath,
    packageJsonFilePath: packageJsonPath,
  } = param;
  const {default: deepJson}: {default: DeepJson} = await import(deepJsonFilePath, {assert: {type: 'json'}}) ;
  debug({deepJson})
  const {default: packageJson}: {default: Partial<PackageJson>} = await import(packageJsonPath, {assert: {type: 'json'}});
  debug({packageJson})

  if(!packageJson.dependencies) {
    packageJson.dependencies = {};
  }

  const missingDependenciesFromDeepJson: Array<DeepJsonDependency> = deepJson.dependencies.filter((dependency: DeepJsonDependency) => !!packageJson.dependencies![dependency.name]);
  debug({missingDependenciesFromDeepJson})
  missingDependenciesFromDeepJson.forEach((dependency: DeepJsonDependency) => {
    packageJson.dependencies = {...packageJson.dependencies, [dependency.name]: `~${dependency.version}`};
  })

  if (missingDependenciesFromDeepJson.length > 0) {
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`${missingDependenciesFromDeepJson.map((dependency: DeepJsonDependency) => dependency.name).join(', ')} are added to package.json because they exist in deep.json`);
  }

  deepJson.dependencies.forEach((dependency: DeepJsonDependency) => {
    const dependencyVersionWithoutRange = semver.minVersion(dependency.version)?.version;
    debug({dependencyVersionWithoutRange})
    if(!dependencyVersionWithoutRange) {
      return
    };
    const isDeepJsonVersionGreater = semver.gt(dependencyVersionWithoutRange, packageJson.dependencies![dependency.name]);
    if(isDeepJsonVersionGreater) {
      packageJson.dependencies![dependency.name] = `~${dependencyVersionWithoutRange}`;
    } else {
      deepJson.dependencies = {...deepJson.dependencies, [dependency.name]: `${dependencyVersionWithoutRange}`};
    }
  })

  Object.entries(packageJson.dependencies).forEach(([dependencyName, dependencyVersion]) => { 
    const dependencyVersionWithoutRange = semver.minVersion(dependencyVersion)?.version;
    debug({dependencyVersionWithoutRange})
    if(!dependencyVersionWithoutRange) {
      return
    };
    const deepJsonDependency = deepJson.dependencies.find(dependency => dependency.name === dependency.name);
    if(!deepJsonDependency) return;
    const deepJsonDependencyVersionWithoutRange = semver.minVersion(deepJsonDependency.version)?.version;
    debug({deepJsonDependencyVersionWithoutRange})
    if(!deepJsonDependencyVersionWithoutRange) {
      return
    };
    const isPackageJsonVersionGreater = semver.gt(dependencyVersionWithoutRange, deepJson.dependencies.find(dependency => dependency.name === dependency.name)!.version);
    if(isPackageJsonVersionGreater) {
      deepJson.dependencies = {...deepJson.dependencies, [dependencyName]: `${dependencyVersionWithoutRange}`};
    } else {
      packageJson.dependencies![dependencyName] = `~${deepJsonDependencyVersionWithoutRange}`;
    }
  })
}
