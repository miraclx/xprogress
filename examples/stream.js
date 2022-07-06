import stream from 'stream';
import ProgressBar from '../index.js';

const waterMark = 2 ** 16 - 1;
const count = 10e3;

const BarGen = ProgressBar.stream(waterMark * count).on('complete', bar => bar.end(`Bar ended\n`));

const r = new stream.Readable({
  read() {
    (this.count = (this.count || 0) + 1) <= count ? this.push(Buffer.alloc(waterMark).fill('\x1b[')) : this.push(null);
  },
});

const w = new stream.Writable({
  write(v, e, c) {
    c(null);
  },
});

r.pipe(BarGen.next()).pipe(w);
