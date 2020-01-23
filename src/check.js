// This file has been heavily adapted from https://github.com/npm/cli/blob/latest/lib/ls.js.
// Any relevant licensing applies.

import path from 'path';
import readPackageTree from 'read-package-tree';
import semver from 'semver';
import npm from 'npm/lib/npm.js';
import mutateIntoLogicalTree from 'npm/lib/install/mutate-into-logical-tree.js';
import { computeMetadata } from 'npm/lib/install/deps.js';
import readShrinkwrap from 'npm/lib/install/read-shrinkwrap.js';
import packageId from 'npm/lib/utils/package-id.js';

export const states = {
  scanTree: 0,
  readLockfile: 1,
  verify: 2,
};

function noop() {}

export async function check(
  dir,
  options = { development: false, production: false, ignorePeer: false }
) {
  const progress = options.progress || noop;
  return new Promise((resolve, reject) => {
    progress(states.scanTree);
    readPackageTree(dir, function(err, physicalTree) {
      if (err) {
        reject(err);
        return;
      }

      if (!physicalTree) physicalTree = { package: {}, path: dir };
      physicalTree.isTop = true;
      progress(states.readLockfile);
      // Inflation is necessary to catch errors like extraneous packages and some
      // kinds of missing dependencies.
      readShrinkwrap.andInflate(physicalTree, function(err) {
        if (!err) {
          try {
            progress(states.verify);
            resolve(checkDependencies(dir, computeMetadata(physicalTree), options));
            return;
          } catch (e) {
            err = e;
          }
        }
        reject(err);
      });
    });
  });
}

function inList(list, value) {
  return list.indexOf(value) !== -1;
}

function checkDependencies(dir, physicalTree, options) {
  const data = mutateIntoLogicalTree.asReadInstalled(physicalTree);

  pruneNestedExtraneous(data);
  filterByEnv(data, options);

  const unlooped = filterFound(unloop(data));
  const lite = getLite(unlooped, undefined, { ignorePeer: options.ignorePeer });

  return lite.problems || [];
}

function pruneNestedExtraneous(data, visited) {
  visited = visited || [];
  visited.push(data);
  for (const i in data.dependencies) {
    if (data.dependencies[i].extraneous) {
      data.dependencies[i].dependencies = {};
    } else if (visited.indexOf(data.dependencies[i]) === -1) {
      pruneNestedExtraneous(data.dependencies[i], visited);
    }
  }
}

function filterByEnv(data, { development, production }) {
  const dependencies = {};
  const devKeys = Object.keys(data.devDependencies || []);
  const prodKeys = Object.keys(data._dependencies || []);
  Object.keys(data.dependencies).forEach(function(name) {
    if (
      !development &&
      inList(devKeys, name) &&
      !inList(prodKeys, name) &&
      data.dependencies[name].missing
    ) {
      return;
    }

    if (
      // only --dev
      (development && inList(devKeys, name)) ||
      // only --production
      (production && inList(prodKeys, name)) ||
      // no --production|--dev|--only=xxx
      (!development && !production)
    ) {
      dependencies[name] = data.dependencies[name];
    }
  });
  data.dependencies = dependencies;
}

function isCruft(data) {
  return data.extraneous && data.error && data.error.code === 'ENOTDIR';
}

function getLite(data, noname, { ignorePeer = false } = {}) {
  const lite = {};

  if (isCruft(data)) return lite;

  if (!noname && data.name) lite.name = data.name;
  if (data.version) lite.version = data.version;
  if (data.extraneous) {
    lite.extraneous = true;
    lite.problems = lite.problems || [];
    lite.problems.push('extraneous: ' + packageId(data) + ' ' + (data.path || ''));
  }

  if (
    data.error &&
    data.path !== path.resolve(npm.globalDir, '..') &&
    (data.error.code !== 'ENOENT' || noname)
  ) {
    lite.invalid = true;
    lite.problems = lite.problems || [];
    const message = data.error.message;
    lite.problems.push('error in ' + data.path + ': ' + message);
  }

  if (data._from) {
    lite.from = data._from;
  }

  if (data._resolved) {
    lite.resolved = data._resolved;
  }

  if (data.invalid) {
    lite.invalid = true;
    lite.problems = lite.problems || [];
    lite.problems.push('invalid: ' + packageId(data) + ' ' + (data.path || ''));
  }

  if (data.peerInvalid) {
    lite.peerInvalid = true;
    if (!ignorePeer) {
      lite.problems = lite.problems || [];
      lite.problems.push('peer dep not met: ' + packageId(data) + ' ' + (data.path || ''));
    }
  }

  const deps = (data.dependencies && Object.keys(data.dependencies)) || [];
  if (deps.length) {
    lite.dependencies = deps
      .map(function(d) {
        const dep = data.dependencies[d];
        if (dep.missing && !dep.optional) {
          lite.problems = lite.problems || [];
          let p = 'missing: ';
          p += d + '@' + dep.requiredBy + ', required by ' + packageId(data);
          lite.problems.push(p);
          if (dep.dependencies) {
            return [d, getLite(dep, true, { ignorePeer })];
          } else {
            return [d, { required: dep.requiredBy, missing: true }];
          }
        } else if (dep.peerMissing) {
          if (!ignorePeer) {
            lite.problems = lite.problems || [];
            dep.peerMissing.forEach(function(missing) {
              const pdm =
                'peer dep missing: ' + missing.requires + ', required by ' + missing.requiredBy;
              lite.problems.push(pdm);
            });
          }
          return [d, { required: dep, peerMissing: true }];
        }
        return [d, getLite(dep, true, { ignorePeer })];
      })
      .reduce(function(deps, d) {
        if (d[1].problems) {
          lite.problems = lite.problems || [];
          lite.problems.push.apply(lite.problems, d[1].problems);
        }
        deps[d[0]] = d[1];
        return deps;
      }, {});
  }
  return lite;
}

function unloop(root) {
  const queue = [root];
  const seen = new Set();
  seen.add(root);

  while (queue.length) {
    const current = queue.shift();
    const deps = (current.dependencies = current.dependencies || {});
    Object.keys(deps).forEach(function(d) {
      let dep = deps[d];
      if (dep.missing && !dep.dependencies) return;
      if (dep.path && seen.has(dep)) {
        dep = deps[d] = Object.assign({}, dep);
        dep.dependencies = {};
        dep._deduped = path.relative(root.path, dep.path).replace(/node_modules\//g, '');
        return;
      }
      seen.add(dep);
      queue.push(dep);
    });
  }

  return root;
}

function filterFound(root) {
  const args = [];
  if (!args.length) return root;
  if (!root.dependencies) return root;

  // Mark all deps
  const toMark = [root];
  while (toMark.length) {
    const markPkg = toMark.shift();
    const markDeps = markPkg.dependencies;
    if (!markDeps) continue;
    Object.keys(markDeps).forEach(function(depName) {
      const dep = markDeps[depName];
      if (dep.peerMissing) return;
      dep._parent = markPkg;
      for (let ii = 0; ii < args.length; ii++) {
        const argName = args[ii][0];
        const argVersion = args[ii][1];
        const argRaw = args[ii][2];
        let found;
        if (typeof argRaw === 'object') {
          if (dep.path === argRaw.path) {
            found = true;
          }
        } else if (depName === argName && argVersion) {
          found = semver.satisfies(dep.version, argVersion, true);
        } else if (depName === argName) {
          // If version is missing from arg, just do a name match.
          found = true;
        }
        if (found) {
          dep._found = 'explicit';
          let parent = dep._parent;
          while (parent && !parent._found && !parent._deduped) {
            parent._found = 'implicit';
            parent = parent._parent;
          }
          break;
        }
      }
      toMark.push(dep);
    });
  }
  const toTrim = [root];
  while (toTrim.length) {
    const trimPkg = toTrim.shift();
    const trimDeps = trimPkg.dependencies;
    if (!trimDeps) continue;
    trimPkg.dependencies = {};
    Object.keys(trimDeps).forEach(function(name) {
      const dep = trimDeps[name];
      if (!dep._found) return;
      if (dep._found === 'implicit' && dep._deduped) return;
      trimPkg.dependencies[name] = dep;
      toTrim.push(dep);
    });
  }
  return root;
}
