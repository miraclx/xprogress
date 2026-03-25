/**
 * $ node parallel.js rawfile.txt 4
 *   # Copy a file into N outputs simultaneously
 */

import fs from 'fs';
import ProgressBar from '../index.js';

const [file, n = '3'] = process.argv.slice(2);
const count = parseInt(n, 10);
const {size} = fs.statSync(file);
const outputs = [...Array(count)].map((_, i) => `output${i + 1}`);

const BarGen = ProgressBar.stream(size * count, ProgressBar.slotsByCount(count), {
  label: 'Copying',
  template: '  :{color(cyan)}◈ :{label}:{color:close}  :{bar}  :{color(cyan)}:3{percentage}%  [:{size}/:{size:total}]:{color:close}',
  bar: {separator: '|'},
}).on('complete', bar => bar.end('  :{color(green)}✔ All copies complete!:{color:close}\n'));

const copy = output =>
  new Promise((resolve, reject) =>
    fs
      .createReadStream(file)
      .pipe(
        BarGen.next()
          .on('error', reject)
          .on('finish', resolve),
      )
      .pipe(fs.createWriteStream(output)),
  );

Promise.all(outputs.map(copy));
