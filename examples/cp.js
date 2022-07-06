/**
 * $ node cp.js rawfile.txt clone.txt
 *   # Copy a file by bytes
 * $ node cp.js rawfile.txt 5
 *   # Make 5 copies of the file in the format output<N> i.e output1, output2
 */

import fs from 'fs';
import ProgressBar from '../index.js';

let args = process.argv.slice(2);
const file = args.shift();
const {size} = fs.statSync(file);

let count;
const files =
  (args = args.length ? args : ['2']).length === 1 && (count = parseInt(args[0], 10))
    ? [...Array(count)].map((...[, index]) => `output${index}`)
    : args;

const BarGen = ProgressBar.stream(size * files.length, ProgressBar.slotsByCount(files.length), {
  label: 'Copying.',
  bar: {
    separator: '|',
  },
  variables: {
    label: () => ':{label}: :{tag}',
  },
  forceFirst: files.length > 20,
}).on('complete', bar => bar.end(`Bar ended\n`));

const fn = (output, {resolve, reject}) => {
  fs.createReadStream(file)
    .pipe(
      BarGen.next({
        variables: {
          tag: `[${file} -> ${output}]`,
        },
      })
        .on('error', reject)
        .on('finish', resolve),
    )
    .pipe(fs.createWriteStream(output));
};

const fileGen = (function* getFiles(arr) {
  for (const i in arr) if ({}.hasOwnProperty.call(arr, i)) yield arr[i];
})(files);

const init = output =>
  output
    ? new Promise((resolve, reject) => fn(output, {resolve, reject})).finally(() => init(fileGen.next().value))
    : BarGen.bar.end('Process complete\n');

init(fileGen.next().value);
