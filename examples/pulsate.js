/**
 * $ node pulsate.js
 *   # Indeterminate bar for work with no known total
 */

import ProgressBar from '../index.js';

const bar = new ProgressBar(1, {
  label: 'Connecting',
  pulsate: true,
  template: '  :{color(cyan)}◈ :{label}:{color:close}  :{bar}  :{flipper}',
  bar: {
    filler: '█',
    blank: '░',
    pulsateLength: 10,
    pulsateSkip: 3,
    colorize: true,
  },
  variables: {
    'color:bar:filled': ':{color(cyan)}',
    'color:bar:empty': ':{color(blue)}',
  },
  flipper: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  length: 30,
});

const stages = [
  [1200, 'Connecting'],
  [1000, 'Authenticating'],
  [1500, 'Fetching data'],
  [800,  'Processing'],
];

const labelWidth = Math.max(...stages.map(([, l]) => l.length));

bar.draw();

const run = async () => {
  for (const [duration, label] of stages) {
    bar.label(label.padEnd(labelWidth));
    await new Promise(resolve => setTimeout(resolve, duration));
  }
  bar.end('  :{color(green)}✔ Done!:{color:close}\n');
};

const interval = setInterval(() => bar.draw(), 80);

run().then(() => clearInterval(interval));
