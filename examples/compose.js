/**
 * $ node compose.js
 *   # Composed progress bars with custom styles
 */

import ProgressBar from '../index.js';

const tasks = [
  {label: 'Compile', size: 400, color: 'cyan'},
  {label: 'Test   ', size: 250, color: 'magenta'},
  {label: 'Bundle ', size: 600, color: 'yellow'},
];

const overall = new ProgressBar(
  tasks.reduce((sum, t) => sum + t.size, 0),
  {
    label: 'Build',
    template: '  :{color(gray)}◈ :{label}  :{bar}  :3{percentage}%:{color:close}  :{flipper}',
    bar: {
      filler: '█',
      blank: '░',
      header: '▌',
      colorize: true,
    },
    variables: {
      'color:bar:filled': ':{color(gray)}',
      'color:bar:header': ':{color(gray)}',
      'color:bar:empty': ':{color(white)}',
    },
    flipper: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  },
);

const children = tasks.map(({label, size, color}) => {
  const child = new ProgressBar(size, {
    label,
    template: `    :{color(${color})}▸ :{label}  :{bar}  :3{percentage}%`,
    bar: {
      filler: '▰',
      blank: '▱',
      header: '▱',
      colorize: true,
    },
    variables: {
      'color:bar:filled': `:{color(${color})}`,
      'color:bar:header': `:{color(${color})}`,
      'color:bar:empty': `:{color(white)}`,
    },
  });
  overall.append(child);
  return child;
});

overall.draw();

const intervals = children.map((child, i) => {
  const rate = 15 * (i + 1);
  return setInterval(() => {
    if (child.isComplete()) return;
    child.tickValue(Math.min((Math.random() * rate + 1) | 0, child.average().remaining));
    const pct = children.reduce((sum, c) => sum + c.average().percentage, 0) / children.length;
    overall.percentage(pct);
    overall.draw();
    if (overall.isComplete()) {
      intervals.forEach(clearInterval);
      overall.end('  :{color(green)}✔ All tasks complete!:{color:close}\n');
    }
  }, 300);
});
