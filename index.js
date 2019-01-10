const git = require('./git.js');
const system = require('./system.js');
const ui = require('./ui.js');
const chalk = require('chalk');

const branchPrefixes = {
    PIVOT: "feature",
    DS: "feature",
    APS: "support",
    default: "support",
}

const state = {}; // a global state to store object

async function createBranchForPullRequest(message, parentBranch) {
    // Should start with a ticket number
    state.message = commitMessage;
    const trimmed = message.trimStart();
    const ticket = trimmed.substr(0, trimmed.indexOf(' '));
    const type = ticket.substr(0, ticket.indexOf('-'));
    const brPrefix = branchPrefixes[type] === undefined ? branchPrefixes.default : branchPrefixes[type];
    const suggestedBranch = `${brPrefix}/${parentBranch}/${ticket}`;
    return ui.chooseDefaultOrInputNew('Create branch', suggestedBranch);
}

async function cherryPick() {
    try {
        await git.cherryPick(state.sha1);
        return;
    } catch (err) {
        console.error(chalk.red('Errors need to be fixed to proceed'));
        return ui.areYouDone();
    }
}

async function getAndSetCurrentBranch() {
    const currentBranch = await git.getCurrentBranch();
    state.parentBranch = currentBranch;
}

async function createPR() {
    const url = `https://github.com/activeviam/activepivot/compare/${state.parentBranch}...${state.branch}`;
    const value = await ui.chooseAmong("Open Chrome", ui.trueOrFalse, 'y');
    if (value) {
        return system.spawnSingleLine('/opt/google/chrome/chrome', url, { cwd: '.' });
    } else {
        console.log(`Create a PR: ${url}`);
    }
}

async function changeCommitMessage(newMessage, oldMessage) {
    if (newCommitMessage !== oldMessage) {
        // Change the message
        return git.changeCommitMessage(newCommitMessage);
    } 
}

git.fetch('')
    .then(() => getAndSetCurrentBranch())
    .then(() => ui.freeTextInput("Enter the sha1", ""))
    .then(sha1 => {
        if(!sha1 || 0 === sha1.length) {
            console.error(chalk.red("Please enter a sha1"));
            process.exit(1);
        }
        state.sha1 = sha1;
        return git.getCommitMessage(sha1);
    })
    .then(message => {
        state.previousCommitMessage = message;
        return ui.chooseDefaultOrInputNew('Keep this commit message', message);
    })
    .then(newCommitMessage => changeCommitMessage(newCommitMessage))
    .then(message => createBranchForPullRequest(message, state.parentBranch))
    .then(branch => {
        state.branch = branch;
        return git.createBranch(branch)
    })
    .then(() => cherryPick())
    .then(() => git.pushBranch(state.branch))
    .then(() => createPR())
    .then(() => console.log(chalk.green('Done')));