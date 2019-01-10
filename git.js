const path = require('path');
const os = require('os');
const chalk = require('chalk');

const {spawnRaw, spawn, spawnLines, spawnSingleLine} = require('./system.js');

const pull = () => spawn('git', 'pull', {cwd: '.'});
const fetchTags = () => spawn('git', 'fetch --tags', {cwd: '.'});
const listTags = () => spawnLines('git', 'tag', {cwd: '.'});
const cherryPick = (sha1) => spawnLines('git', `cherry-pick ${sha1}`, {cwd: '.'});
const getCurrentBranch = () => spawnSingleLine('git', 'rev-parse --abbrev-ref HEAD', {cwd: '.'});
const checkout = branchName => spawn('git', `checkout ${branchName}`, {cwd: '.'});
const createBranch = branchName => spawn('git', `checkout -b ${branchName}`, {cwd: '.'});
// [Improvement] Annotate the tag to play nice with git-describe
const tag = tagName => spawn('git', `tag ${tagName}`, {cwd: '.'});
const push = (localRef, remoteRef = localRef, remote = 'origin') => spawn('git', `push ${remote} ${localRef}:${remoteRef}`, {cwd: '.'});
const pushTag = tagName => push(tagName);
const pushBranch = branch => push(branch);
const getHeadSha1 = cwd => spawnSingleLine('git', 'rev-parse HEAD', {cwd});
const fetch = (remote) => spawnSingleLine('git', `fetch ${remote}`, {cwd : '.'});
const getRefSha1 = (ref, cwd) => spawnSingleLine('git', `rev-parse ${ref}`, {cwd});
const getUserName = () => spawnSingleLine('git', 'config --global user.name', {cwd: '.'});
const getCommitMessage = (sha1) => spawnSingleLine('git', `log --format=%B -n 1 ${sha1}`, {cwd: '.'});
const changeCommitMessage = (message) => spawnSingleLine('git', `commit --amend -m  ${message}`, {cwd: '.'});

module.exports = {
  fetch,
  getCurrentBranch,
  getCommitMessage,
  checkout,
  cherryPick,
  createBranch,
  pushBranch,
};
