const fs = require('fs');
const stream = require('stream');
const xbytes = require('xbytes');
const ProgressBar = require('..');

const args = process.argv.slice(2).join(' ');

const size = xbytes.parseSize(xbytes.extractBytes(args).pop()) || 0;
const files = args
  .replace(xbytes.globalByteFilter, '')
  .split(' ')
  .filter(Boolean);

const count = files.length;

const BarGen = ProgressBar.stream(size * count || Infinity, [...Array(count)].fill(100 / count), {
  bar: {
    separator: '|',
  },
  variables: {
    label: () => ':{label}: :{tag}',
  },
  forceFirst: count > 20,
}).on('complete', bar => bar.end(`Bar ended\n`));

const buildStream = content =>
  new stream.Readable({
    read() {
      this.readSize = this.readSize || 0;
      if (this.readSize < size) {
        const markSize = Math.min(size, this.readableHighWaterMark, size - this.readSize);
        this.readSize += markSize;
        this.push(Buffer.alloc(markSize).fill(content));
      } else this.push(null);
    },
  });

const fn = (output, content, {resolve, reject}) => {
  buildStream(content)
    .pipe(
      BarGen.next({
        variables: {
          tag: `[${output}]\n`,
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

const init = (output, content) =>
  output && new Promise((resolve, reject) => fn(output, content, {resolve, reject})).finally(() => init(fileGen.next().value));

init(fileGen.next().value, 'intricate\n');

/*
  Touch a file or files with specified sizes

  $ node ./touch file.txt
    # Create a zero byte file
  $ node ./touch file.txt file1.txt
    # Create two zero byte files
  $ node ./touch 10MB file1.txt
    # Touch a file `file1.txt` with content accumulating to 10 MegaBytes
  $ node ./touch 1 GB file1.txt file2.txt
    # Touch two files, 1 Gigabyte each
*/
