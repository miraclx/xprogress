/**
 * $ node print.js
 *   # Log messages while a bar is active without clobbering it
 */

import ProgressBar from '../index.js';

const steps = [
  'Resolving dependencies',
  'Downloading packages',
  'Verifying checksums',
  'Extracting archives',
  'Running post-install scripts',
  'Linking binaries',
  'Cleaning up',
];

const bar = new ProgressBar(steps.length, {
  label: 'Installing',
  template: '  :{color(cyan)}◈ :{label}:{color:close}  :{bar}  :{color(cyan)}:3{percentage}%:{color:close}',
  bar: {
    filler: '█',
    blank: '░',
    header: '▌',
    colorize: true,
  },
  variables: {
    'color:bar:filled': ':{color(cyan)}',
    'color:bar:header': ':{color(cyan)}',
    'color:bar:empty': ':{color(blue)}',
  },
});

let i = 0;

const interval = setInterval(() => {
  const step = steps[i];
  bar.tickValue(1).draw();
  bar.print(`  :{color(green)}✔:{color:close} ${step}`);
  if (++i >= steps.length) {
    clearInterval(interval);
    bar.end('\n  :{color(green)}✔ Installation complete!:{color:close}\n');
  }
}, 600);
