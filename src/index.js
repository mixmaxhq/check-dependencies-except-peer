import { Command, flags } from '@oclif/command';

import cli from 'cli-ux';
import npm from 'npm';
import once from 'lodash/once';
import { promisify } from 'util';
import { stat } from 'fs';

import { check, states } from './check.js';

const statAsync = promisify(stat);

const loadNPM = once(() => npm.load());

const stateMessages = new Map([
  [states.scanTree, 'scanning tree'],
  [states.readLockfile, 'reading lockfile'],
  [states.verify, 'verifying consistency'],
]);

class CheckDependenciesExceptPeerCommand extends Command {
  async run() {
    const {
      args: { directory: dir = process.cwd() },
      flags,
    } = this.parse(CheckDependenciesExceptPeerCommand);
    cli.action.start('initializing');
    if (!(await statAsync(dir)).isDirectory()) {
      this.error('the provided path is not a directory', { exit: 1 });
    }
    loadNPM();
    const errors = await check(dir, {
      ignorePeer: flags['ignore-peer'],
      progress(state) {
        const message = stateMessages.get(state) || 'looking around for breadcrumbs';
        cli.action.start(message);
      },
    });
    if (errors && errors.length) {
      this.error(errors.join('\n'), { exit: 2 });
    }
  }
}

CheckDependenciesExceptPeerCommand.description = `Verify the lockfile and installed dependencies, and ignore unmatched peer dependencies
Scans the lockfile and installed dependencies for inconsistencies. Ignores peer dependency violations by default.
`;

CheckDependenciesExceptPeerCommand.args = [
  {
    name: 'directory',
    description:
      '[default: PWD] path to the root of the module to check, defaults to the working directory',
    required: false,
  },
];

CheckDependenciesExceptPeerCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({ char: 'v' }),
  // add --help flag to show CLI version
  help: flags.help({ char: 'h' }),
  'ignore-peer': flags.boolean({
    char: 'i',
    description: 'whether to ignore peer dependencies',
    default: true,
  }),
  dev: flags.boolean({
    char: 'D',
    description: 'whether to include development dependencies (default both)',
  }),
  prod: flags.boolean({
    char: 'P',
    description: 'whether to include production dependencies (default both)',
  }),
};

export default CheckDependenciesExceptPeerCommand;
