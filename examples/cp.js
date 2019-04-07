const fs = require('fs');
const ProgressBar = require('..');

let args = process.argv.slice(2);
const file = args.shift();
const {size} = fs.statSync(file);

let count = 1;
const files =
  (args = args.length ? args : ['2']).length === 1 && (count = parseInt(args.pop(), 10))
    ? [...Array(count)].map((...[, index]) => `output${index}`)
    : args;

console.log(files);
process.exit();

const BarGen = ProgressBar.stream(size * count, [...Array(count)].fill(100 / count), {
  bar: {
    separator: '|',
  },
  variables: {
    label: () => ':{label}: :{tag}',
  },
  forceFirst: count > 20,
}).on('complete', bar => bar.end(`Bar ended\n`));

const fn = (output, {resolve, reject}) => {
  fs.createReadStream(file)
    .pipe(
      BarGen.next({
        variables: {
          tag: `[${file} -> ${output}]\n`,
        },
      })
        .on('error', reject)
        .on('finish', resolve),
    )
    .pipe(fs.createWriteStream(output));
};

const fileGen = (function* getFiles(arr) {
  // eslint-disable-next-line no-restricted-syntax
  for (const i in arr) if ({}.hasOwnProperty.call(arr, i)) yield arr[i];
})(files);

const init = output =>
  output
    ? new Promise((resolve, reject) => fn(output, {resolve, reject})).finally(() => init(fileGen.next().value))
    : BarGen.bar.end('Process complete\n');

init(fileGen.next().value);
