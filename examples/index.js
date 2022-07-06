/**
 * $ node index.js
 *   # Start a simple bar
 */

import ProgressBar from '../index.js';

const bar = new ProgressBar(1024);

bar.print('Constructing a simple bar...');

const interval = setInterval(() => {
  bar.tick(Math.random() * 20).draw();
  if (bar.isComplete()) {
    bar.end(`The bar completed\n`);
    clearInterval(interval);
  }
}, 800);
