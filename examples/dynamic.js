/**
 * $ node dynamic.js
 *   # Bar whose total grows mid-run — simulating a paginated fetch
 *     where the full count isn't known until pages arrive
 */

import ProgressBar from '../index.js';

// Each page arrives with its record count and a surprise: sometimes
// a `more` field reveals that more records exist than we thought
// total records: 23+31+18+28+40+28+40 = 208
// `more` is the revised running total revealed by the server mid-flight
const pages = [
  {records: 23, delay: 400},
  {records: 31, delay: 600, more: 140},
  {records: 18, delay: 300},
  {records: 28, delay: 500, more: 208},
  {records: 40, delay: 700},
  {records: 28, delay: 400},
  {records: 40, delay: 500},
];

const initialTotal = pages.slice(0, 2).reduce((s, p) => s + p.records, 0);

const bar = new ProgressBar(initialTotal, {
  label: 'Fetching',
  template: '  :{color(cyan)}◈ :{label}:{color:close}  :{bar}  :{color(cyan)}:{completed}/:{total}:{color:close}',
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

bar.draw();

const run = async () => {
  let fetched = 0;

  for (const {records, delay, more} of pages) {
    await new Promise(resolve => setTimeout(resolve, delay));

    if (more && more > bar.total()) {
      bar.print(`  :{color(yellow)}↑ Expanding total: ${bar.total()} → ${more}:{color:close}`);
      bar.total(more);
    }

    fetched += records;
    bar.value(fetched).draw();
    bar.print(`  :{color(green)}✔:{color:close} Page fetched — ${records} records`);
  }

  bar.end('\n  :{color(green)}✔ All pages fetched!:{color:close}\n');
};

run();
