const git = require('./git.js');
const chalk = require('chalk');

async function to(promise) {
    return promise.catch(err => {
        console.error(chalk.red(err.stderr));
        process.exit(1);
    });
}

async function main() {
    const branch = await to(git.getCurrentBranch());
    const regex = /[a-z]\/([0-9]\.[0-9])\/.*/gi
    const array = regex.exec(branch);
    if(array == null) {
        throw Error(`Cannot extract parent branch from ${branch}`);
    }
    const parent = array[1];
    console.log(chalk.green(`Updating the branch '${branch}' toward the branch '${parent}'`));
    
    await to(git.checkout(parent));
    await to(git.pull());
    await to(git.checkout(branch));
    await to(git.merge(parent));
    console.log(chalk.green(`'${branch}' is now up-to-date`));
    console.log(chalk.yellow('Do not forget to change the commit message (to add a JIRA ticket)'));
}

main();