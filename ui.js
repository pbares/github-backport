const chalk = require('chalk');
const readline = require('readline');

const chooseAmong = function (title, choices, inputDefaultShortcut) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const defaultShortcut = inputDefaultShortcut === undefined ? choices[0].shortcut : inputDefaultShortcut;

  console.log(title);
  choices.forEach(choice => {
    const color = choice.shortcut === defaultShortcut ? chalk.yellow : chalk.white;
    console.log(color(`(${choice.shortcut}) ${choice.description}`));
  });
  const shortcuts = choices.map(c => c.shortcut).map(s => s === defaultShortcut ? s.toUpperCase() : s);
  return new Promise((resolve, reject) => {
    rl.question(`[${shortcuts}]? `, rlAnswer => {
      console.log(); // New line after answer
      rl.close();
      const answer = rlAnswer === '' ? defaultShortcut : rlAnswer;
      const choice = choices.find(c => c.shortcut === answer);
      if (choice === undefined) {
        console.log('Invalid choice, asking again.');
        chooseAmong(title, choices, defaultShortcut).then(resolve, reject);
        return;
      }
      resolve(choice.value);
    });
  });
};

const freeTextInput = function (title, prefix) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  if (title) {
    console.log(title);
  }
  return new Promise(resolve => {
    rl.question(prefix, answer => {
      rl.close();
      resolve(answer);
    });
  });
};

async function chooseDefaultOrInputNew(titlePrefix, defaultValue){
  const title = `${titlePrefix} '${chalk.yellow(defaultValue)}'`;
  let value = await chooseAmong(
      title,
      [
          { shortcut: 'y', description: 'default', value: defaultValue },
          { shortcut: 'n', description: 'change' },
      ],
      'y');
  if (value === undefined) {
      value = await freeTextInput("New message", "");
  }
  return value;
}

const trueOrFalse =  [
  { shortcut: 'y', description: 'yes', value: true },
  { shortcut: 'n', description: 'no', value: false },
];

async function areYouDone() {
  let value = await chooseAmong("Are you done", trueOrFalse, 'y');
  return !value ? areYouDone() : Promise.resolve();
}

module.exports = {
  trueOrFalse,
  chooseAmong,
  freeTextInput,
  chooseDefaultOrInputNew,
  areYouDone,
}