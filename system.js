const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');
const path = require('path');

const eol = os.EOL;

const toPromise = function(f) {
  return (...args) => new Promise((resolve, reject) => {
    f(...args, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const stat = toPromise(fs.stat);

// This code is evaluated when this script is imported, so that all log files created by a run
// can be put under a common folder.
const runTime = new Date();

/**
 * Creates a logging sink that stores all logged information in a file.
 * @param {String} folderName - path to the log storage folder
 * @param {String} fileName - name of the log file
 */
const createLogAppender = function(folderName, fileName) {
  // Create the log folder if it doesn't exist yet.
  let currentPromise = ensureDirectoryExists(folderName);
  const filePath = `${folderName}/${fileName}`;
  return {
    append(str) {
      currentPromise = currentPromise.then(() => appendFile(filePath, str))
    },
    close() {
      return currentPromise;
    }
  }
};

// const createNoopAppender = function() {
//   return {
//     append() {},
//     close: () => Promise.resolve()
//   };
// };
const createNoopAppender = function() {
  return {
    append(msg) { console.log(msg) },
    close: () => Promise.resolve()
  };
};

const createLogAppenders = function(spawnOptions) {
  if (spawnOptions.logName === undefined) {
    return { stdout: createNoopAppender(), stderr: createNoopAppender(), errorResolutionHelp: undefined};
  }
  const logFolderName = `${os.tmpdir()}/release-${runTime.toISOString().replace(/:/g, '-')}`;
  return {
    stdout: createLogAppender(logFolderName, `${spawnOptions.logName}-stdout`),
    stderr: createLogAppender(logFolderName, `${spawnOptions.logName}-stderr`),
    errorResolutionHelp: `See details in files ${path.resolve(logFolderName, spawnOptions.logName)}-stdout and ${path.resolve(logFolderName, spawnOptions.logName)}-stderr`
  };
};

class UnknownExecutableError extends Error {}

/**
 * Replace platform dependent EOL by a standard one so that line level processing is the same on all platforms.
 */
const normalizeEols = lines => os.EOL !== eol ? lines.replace(new RegExp(os.EOL, 'g'), eol) : lines;

/**
 * Creates a manual child execution.
 *
 * This reports ungoing process, with a dedicated progress reporter and handle logs
 * automatically.
 *
 * @param {String} cmd - command to execute
 * @param {String[]} [args] - arguments to provide to a command
 * @param {Object} [options] - options for a command.
 * @return {Promise<{stdout: String, stderr: String, cmd: String, args: String[], code: Number, logAppenderResolutionHelp: String}>} result of the execution
 */
const spawnRaw = function(cmd, args, options = {}) {
  if (options.cwd === undefined) {
    // Catch here callers that forgot to give a cwd, this is usually a carelessness that might work only when the
    // developer wrote it but not in a release on another computer started from another folder.
    // If someone really wants to spawn a command in the directory where the script was started {cwd: '.'} can be used.
    throw new Error(`No working directory given to execute ${cmd} ${args.join(' ')}, this is dangerous, stopping build.`);
  }

  const checkCwd = stat(options.cwd)
    .then(cwdStat => {
      if (!cwdStat.isDirectory()) {
        throw new Error(`Chosen working directory ${options.cwd} is not a directory`);
      }
    });

  return checkCwd.then(() => {
    const logAppenders = createLogAppenders(options);
    return new Promise((resolve, reject) => {
      const stdout = [];
      const stderr = [];
      const spawned = childProcess.spawn(cmd, args, options);
      spawned.stdout.on('data', data => {
        const str = data.toString('utf8');
        const normalizedStr = normalizeEols(str);
        stdout.push(normalizedStr);
        logAppenders.stdout.append(str); // Don't normalize for log appenders, the produced file will be open by a platform dependent text editor.
      });
      spawned.stderr.on('data', data => {
        const str = data.toString('utf8');
        const normalizedStr = normalizeEols(str);
        stderr.push(normalizedStr);
        logAppenders.stderr.append(str);
      });
      spawned.on('error', e => {
        // Could not execute, the most likely reason is that the cmd corresponds
        // to an unexisting progrom
        if (e.code === 'ENOENT') {
          reject(new UnknownExecutableError(cmd))
        } else {
          reject(e);
        }
      });
      spawned.on('close', code => {
        Promise.all([
          logAppenders.stdout.close(),
          logAppenders.stderr.close()
        ]).then(() => {
          const end = code === 0 ? resolve : reject;
          end({stdout: stdout.join(''), stderr: stderr.join(''), cmd, args, code, logAppenderResolutionHelp: logAppenders.errorResolutionHelp});
        });
      });
    });
  });
};

const spawn = function(cmd, joinedArgs = '', options = {}) {
  const args = joinedArgs.split(' ').filter(s => s.trim().length > 0);
  return spawnRaw(cmd, args, options);
};

// Spawn and return all non empty stdout lines in an array.
const spawnLines = (...args) => spawn(...args).then(r => r.stdout.split(eol).map(l => l.trim()).filter(l => l.length > 0));

// Spawn and return directly the first line of the output as a string.
const spawnSingleLine = (...args) => spawnLines(...args).then(lines => lines[0]);

module.exports = {
  // Functions
  spawnRaw,
  spawn,
  spawnLines,
  spawnSingleLine,
};
