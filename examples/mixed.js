/**
 * $ node mixed.js
 *   # Normal bar (package counter) composed with per-package stream bars (one slot per chunk)
 *   # Each package discovers dependencies mid-download; their bars are inserted inline
 */

import stream from 'stream';
import xbytes from 'xbytes';
import ProgressBar from '../index.js';

const splitChunks = (size, ratios) => {
  const sum = ratios.reduce((s, r) => s + r, 0);
  const chunks = ratios.map(r => Math.round((r / sum) * size));
  chunks[chunks.length - 1] += size - chunks.reduce((s, c) => s + c, 0);
  return chunks;
};

const packages = [
  {
    name: 'lodash',
    size: Math.round(1.2 * 1024 * 1024),
    ratios: [0.2, 0.3, 0.25, 0.15, 0.1],
    deps: [{name: 'lodash-core', size: Math.round(0.9 * 1024 * 1024), ratios: [0.2, 0.3, 0.25, 0.15, 0.1]}],
  },
  {
    name: 'express',
    size: Math.round(0.8 * 1024 * 1024),
    ratios: [0.3, 0.4, 0.3],
    deps: [
      {name: 'qs', size: Math.round(0.6 * 1024 * 1024), ratios: [0.3, 0.4, 0.3]},
      {name: 'methods', size: Math.round(0.45 * 1024 * 1024), ratios: [0.35, 0.4, 0.25]},
    ],
  },
  {
    name: 'react',
    size: Math.round(3.1 * 1024 * 1024),
    ratios: [0.15, 0.35, 0.3, 0.2],
    deps: [
      {name: 'scheduler', size: Math.round(1.2 * 1024 * 1024), ratios: [0.2, 0.3, 0.3, 0.2]},
      {name: 'loose-envify', size: Math.round(0.5 * 1024 * 1024), ratios: [0.4, 0.35, 0.25]},
    ],
  },
  {
    name: 'webpack',
    size: Math.round(5.4 * 1024 * 1024),
    ratios: [0.1, 0.25, 0.3, 0.2, 0.15],
    deps: [
      {name: 'acorn', size: Math.round(1.8 * 1024 * 1024), ratios: [0.25, 0.35, 0.25, 0.15]},
      {name: 'enhanced-resolve', size: Math.round(1.4 * 1024 * 1024), ratios: [0.2, 0.3, 0.3, 0.2]},
    ],
  },
];

const NAME_WIDTH = Math.max(...packages.map(p => p.name.length), ...packages.flatMap(p => p.deps.map(d => d.name.length)));

const makeStreamBar = (size, ratios, label, bullet, color) => {
  const chunks = splitChunks(size, ratios);
  const gen = ProgressBar.stream(
    size,
    chunks,
    {
      label: label.padEnd(NAME_WIDTH),
      template: `    ${bullet} :{label}  :{bar}  :{color(${color})}:{size}:{size:sep}:{size:total}:{color:close}`,
      bar: {filler: '▰', blank: '▱', header: '', separator: '·', colorize: true},
      variables: {
        'color:bar:filled': `:{color(${color})}`,
        'color:bar:empty': ':{color(blue)}',
        'color:bar:separator': ':{color(white)}',
      },
    },
    (_bar, args, template) => {
      _bar.value(...args);
      Object.assign(_bar.opts.variables, template);
    },
  );
  gen.bar.opts.variables.size = () => '';
  gen.bar.opts.variables['size:sep'] = () => (gen.bar.average().completed > 0 ? '/' : '');
  gen.bar.opts.variables['size:total'] = () => xbytes(size);
  return {gen, chunks};
};

// Normal bar: counts top-level packages installed, drives all rendering
const installBar = new ProgressBar(packages.length, {
  label: 'Installing',
  template:
    '  :{color(cyan)}◈ :{label}:{color:close}  :{bar}  :{color(cyan)}:3{percentage}% (:{completed}/:{total} pkgs):{color:close}',
  bar: {filler: '█', blank: '░', header: '▌', colorize: true},
  variables: {
    'color:bar:filled': ':{color(cyan)}',
    'color:bar:header': ':{color(cyan)}',
    'color:bar:empty': ':{color(blue)}',
  },
});

const pkgBars = packages.map(({name, size, ratios}) =>
  makeStreamBar(size, ratios, name, ':{color(yellow)}▸:{color:close}', 'yellow'),
);
pkgBars.forEach(({gen}) => installBar.append(gen.bar));

installBar.draw();
const drawInterval = setInterval(() => installBar.draw(), 100);

const devNull = () =>
  new stream.Writable({
    write(_, __, cb) {
      cb();
    },
  });
const fakeDownload = size =>
  new stream.Readable({
    read() {
      setTimeout(() => {
        const sent = (this._sent = this._sent || 0);
        if (sent >= size) {
          this.push(null);
          return;
        }
        const chunk = Math.min(32 * 1024, size - sent);
        this._sent += chunk;
        this.push(Buffer.alloc(chunk));
      }, 50);
    },
  });

const pipeChunk = (through, size) =>
  new Promise((resolve, reject) => fakeDownload(size).pipe(through.on('error', reject).on('finish', resolve)).pipe(devNull()));

let done = 0;

Promise.all(
  packages.map(async ({name, deps}, i) => {
    const {gen, chunks} = pkgBars[i];

    // Download first chunk, then discover and insert dependency bars inline
    await pipeChunk(gen.next(chunks[0]), chunks[0]);

    const depBars = deps.map(({name: depName, size, ratios}) =>
      makeStreamBar(size, ratios, depName, ':{color(magenta)}·:{color:close}', 'magenta'),
    );

    let anchor = gen.bar;
    for (const {gen: depGen} of depBars) {
      installBar.insertAfter(anchor, depGen.bar);
      anchor = depGen.bar;
    }
    if (deps.length) installBar.total(installBar.total() + deps.length);

    // Remaining package chunks and all dep downloads run concurrently
    await Promise.all([
      (async () => {
        for (let c = 1; c < chunks.length; c++) await pipeChunk(gen.next(chunks[c]), chunks[c]);
      })(),
      ...depBars.map(async ({gen: depGen, chunks: depChunks}, j) => {
        for (const chunkSize of depChunks) await pipeChunk(depGen.next(chunkSize), chunkSize);
        depGen.bar.opts.clean = true;
        installBar.tickValue(1);
        depGen.bar.end(`  :{color(green)}✔:{color:close} ${deps[j].name.padEnd(NAME_WIDTH)}  installed`);
      }),
    ]);

    gen.bar.opts.clean = true;
    installBar.tickValue(1).draw();
    gen.bar.end(`  :{color(green)}✔:{color:close} ${name.padEnd(NAME_WIDTH)}  installed`);

    if (++done === packages.length) {
      clearInterval(drawInterval);
      installBar.end('\n  :{color(green)}✔ All packages installed!:{color:close}\n');
    }
  }),
);
