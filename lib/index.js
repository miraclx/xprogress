/**
 * @copyright (c) 2020 Miraculous Owonubi
 * @author Miraculous Owonubi
 * @license Apache-2.0
 * @module progress2
 */

import {format} from 'util';
import {merge} from 'lodash';
import {openSync} from 'fs';
import tty from 'tty';
import EventEmitter from 'events';

import xbytes from 'xbytes';
import stringd from 'stringd';
import prettyMs from 'pretty-ms';
import padRatio from 'pad-ratio';
import cStringd from 'stringd-colors';
import speedometer from 'speedometer';
import progressStream from 'progress-stream';

const globOpts = {
  bar: {
    blank: '-',
    filler: '#',
    header: '',
    colorize: !0,
    separator: '',
    pulsateSkip: 15,
    pulsateLength: 15,
  },
  label: 'Loading',
  clean: !1,
  // eslint-disable-next-line no-use-before-define
  length: 40,
  flipper: ['|', '/', '-', '\\'],
  pulsate: !1,
  template: '',
  variables: {
    tag: ({tag}) => (tag && typeof tag !== 'function' ? `${tag}\n` : ''),
    ...cStringd.raw,
    'color:bar:empty': ':{color:close}',
    'color:bar:header': ':{color(green)}',
    'color:bar:filled': ':{bgcolor(green)}:{color(black)}',
    'color:bar:separator': '',
  },
  forceFirst: !1,
};

const defaultOptions = {
  ...globOpts,
  template: ':{tag}[:{bar}] :{flipper} :{label} :3{percentage}% [:{completed}/:{total}]',
};

const streamOpts = {
  ...globOpts,
  pulsate: false,
  progress: {time: 100, pulsate: false, infinite: !1, pulsateSkip: 15, pulsateLength: 15},
  template: [
    ':{label}',
    ' |:{slot:bar}| [:3{slot:percentage}%] (:{slot:eta}) [:{speed}] [:{slot:size}/:{slot:size:total}]',
    ' [:{bar}] [:3{percentage}%] (:{eta}) [:{size}/:{size:total}]',
  ],
  variables: {
    ...globOpts.variables,
    eta: null,
    size: null,
    speed: null,
    progress: null,
    'eta:raw': null,
    'slot:bar': null,
    'slot:blank': null,
    'slot:eta': null,
    'slot:eta:raw': null,
    'slot:filler': null,
    'slot:header': null,
    'slot:size': null,
    'slot:total': null,
    'slot:runtime': null,
    'slot:runtime:raw': null,
    'slot:percentage': null,
    'slot:size:total': null,
  },
  stageOpts: {},
};

/**
 * Get a persistent tty output stream
 * @returns {tty.WriteStream} The writable stream instance similar to `process.stdout`
 */
function getPersistentStdout() {
  const self = getPersistentStdout;
  self.stdout =
    self.stdout && self.stdout.isTTY
      ? self.stdout
      : process.stdout.isTTY
      ? process.stdout
      : process.stderr.isTTY
      ? process.stderr
      : new tty.WriteStream(openSync('/dev/tty', 'w'));
  return self.stdout;
}

/**
 * Parse a bar, returning a styled bar with a given percentage filled
 * @param {_defaultOptions} opts The options for the bar being parsed
 * @param {Number} fillable Maximum fillable slots
 * @param {Number} percentage Percentage filled
 * @param {Boolean} headers Whether or not to add headers to the bar
 */
function parseBar(opts, fillable, percentage, headers = !opts.pulsate) {
  fillable = Math.round(fillable);
  let filled = Math.round((Math.min(100, percentage) / 100) * fillable);
  let empty = fillable - filled;
  // eslint-disable-next-line prefer-const
  let {filler, blank, header} = opts.bar;
  [filled, empty] = [filled, empty].map(Math.floor);
  [filler, blank] = [filler, blank].map(content => (Array.isArray(content) || typeof content === 'string' ? content : ''));
  return stringd(
    [
      `:{color:bar:filled}${filler.repeat(filled)}`,
      `:{color:bar:header}${headers ? header : ''}`,
      `:{color:bar:empty}${blank.repeat(empty)}`,
      '',
    ].join(':{color:close}:{bgcolor:close}'),
    opts.variables,
  );
}

const xprettyMs = (_ => sec => (Number.isFinite(sec) ? _(sec) : '\u221e'))(prettyMs);

/**
 * Create a pulsate bar
 * @param {ProgressBar} bar The bar to be pulsated
 * @param {Array} slots Pulsate slots to be used
 * @param {number} skip Valuation for by how much to skip the bar
 * @param {string} sep The separator to be used on the bar
 */
function pulsateBar(bar, slots, skip, sep = '') {
  if (slots[0].level + slots[1].level >= 100) slots[0].level = 100 - slots[1].level;
  const total = bar.length() - sep.length * 2;
  const stack = [...slots, {level: 100 - (slots[0].level + slots[1].level), value: 0}].map(({level, value}) => ({
    fillable: Math.round((level / 100) * total),
    percentage: value,
  }));
  if (slots[0].level + slots[1].level === 100) slots[0].level = 0;
  else slots[0].level += skip;
  stack[stack.length - 1].fillable +=
    total -
    Math.min(
      total,
      stack.reduce((max, {fillable}) => max + fillable, 0),
    );
  return stack.map(({fillable, percentage}) => parseBar(bar.opts, fillable, percentage, false));
}

class ProgressGen extends EventEmitter {}

class ProgressBar {
  /**
   * Build a progress bar
   * @param {Number} total Max attainable value by the progressBar
   * @param {((size) => Number|Number[])|Number|Number[]} arr Allocation of slots by value
   * @param {_defaultOptions} opts Attachable options
   */
  constructor(total, arr = [total], opts = {}) {
    if (!(total && typeof total === 'number')) throw Error('<ProgressBar> must have a max integer value');
    if (typeof arr === 'function') arr = arr(total);
    if (typeof arr === 'object' && !Array.isArray(arr)) [arr, opts] = [[total], arr];
    this.opts = {
      ...defaultOptions,
      ...opts,
      bar: {...defaultOptions.bar, ...opts.bar},
      variables: {...defaultOptions.variables, ...opts.variables},
    };
    this.cores = {
      total,
      label: this.opts.label,
      append: [],
      length: this.opts.length,
      stdout: getPersistentStdout(),
      pulsateSlots: [
        [0, 0],
        [this.opts.bar.pulsateLength, 100],
      ].map(([level, value]) => ({
        level,
        value,
      })),
    };
    const self = this;
    this.slots = padRatio(arr, total, false).map(max => ({
      max,
      done: 0,
      get level() {
        return (this.max / self.total()) * 100;
      },
      get percentage() {
        return (this.done / this.max) * 100;
      },
    }));
    delete this.opts.blot;
    delete this.opts.label;
    delete this.opts.append;
    delete this.opts.length;
  }

  /**
   * Label the progressbar while returning itself
   * @param {String} label The string label
   */
  label(label) {
    return label ? ((this.cores.label = label), this) : this.cores.label;
  }

  /**
   * Return or set the max length of the progressbar
   * @param {number} [value] The value to set the progressBar length to
   */
  length(value) {
    const len = getPersistentStdout().columns;
    const core = this.cores.length;
    if (value && ['function', 'number'].includes(typeof value)) {
      this.cores.length = value;
      return this;
    }
    let ret;
    if (typeof core === 'function') ret = core(len);
    if (!ret && typeof core === 'number') ret = core < 0 ? len + core : (Math.min(core, 100) / 100) * len;
    if (typeof ret !== 'number') throw new Error('length of the bar must be a valid number');
    return Math.floor(ret);
  }

  /**
   * Return or update the total level of the progressbar
   * @param {number} [value] The number to be added to the total level
   * @param {{}} [template] Template variable values to be included into core options
   */
  total(value, template) {
    if (value && Number.isFinite(value)) {
      if (value < this.average().completed) throw new Error(`<value> must not be lower than already completed value`);
      this.slots.map((v, r) => ((v.max = ((r = v.max), (v.max * value) / this.total())), (v.done = (v.done * v.max) / r)));
      this.cores.total = Math.floor(value) ? value : 0;
      Object.assign(this.opts.template, template);
      return this;
    }
    return this.cores.total;
  }

  /**
   * Update the progressbar slots with certain percentages
   * - This will top up the current slots with the inputed values as opposed to `this.progress(levels)`
   * - The progressbar would be automatically drawn if [template] is provided
   * @param {Number|Number[]} levels Level(s) to update the slots with
   * @param {{}} [template] Template variable values to use on the drawn progress bar
   */
  tick(levels, template) {
    levels =
      typeof levels === 'number'
        ? Array(this.slots.length).fill(levels)
        : Array.isArray(levels)
        ? levels
        : Array(this.slots.length).fill(0);
    let res;
    return this.percentage(
      this.slots.map((slot, index) => ((res = slot.percentage + Math.floor(levels[index])), res > 100 ? 100 : res)),
      template,
    );
  }

  /**
   * Update the progressbar slots with certain values
   * - This will top up the current slots with the inputed values as opposed to `this.progress(levels)`
   * - The progressbar would be automatically drawn if [template] is provided
   * @param {Number|Number[]} levels Level(s) to update the slots with
   * @param {{}} [template] Template variable values to use on the drawn progress bar
   */
  tickValue(levels, template) {
    levels =
      typeof levels === 'number'
        ? Array(this.slots.length).fill(levels)
        : Array.isArray(levels)
        ? levels
        : Array(this.slots.length).fill(0);
    return this.value(
      this.slots.map((slot, index) => slot.done + Math.floor(levels[index])),
      template,
    );
  }

  /**
   * Update the progressbar to a percentage
   * - The progressbar would be automatically drawn if [template] is provided
   * @param {number|number[]} index The index at which to replace percentage or an array of slot percentages
   * @param {number} [value] if (index::number) the percentage for the specified index
   * @param {{}} [template] Template variable values to use on the drawn progress bar
   * @example
   *  > this.percentage(50, {}) // Update the entire bar to 50%
   *  > this.percentage(1, 20, {}) // Set the percentage of the first slot to 20%
   *  > this.percentage([40,20,70], {}) // Set the percentage of the slots according to array specification
   */
  percentage(index, value, template) {
    if (this.isEnded) throw Error('This bar has been ended and is now immutable');
    const [parseType, inferParse] = [
      (input, msg) => {
        if (!(Array.isArray(input) ? input : [input]).every(v => typeof v === 'number')) throw new Error(msg);
        else return input;
      },
      (slots, val, i) => {
        slots[i].done =
          (parseType(
            val <= 0 || Math.floor(val) > 100 || val > 100 ? Math.floor(val) : val,
            `Percentage [${val}] must be in the range [0 < X < 100]`,
          ) /
            100) *
            slots[i].max || slots[i].done;
      },
    ];
    const bars = [this, ...this.cores.append.reduce((a, v) => (v.inherit && a.push(v.bar), a), [])];
    if (arguments.length > 1 && value && typeof value !== 'object')
      parseType(
        [index, value <= 0 || Math.floor(value) > 100 || value > 100 ? Math.floor(value) : value],
        `<index> and <value> must be of type \`number\`, <number> must be in the range [0 < X < 100]`,
      ),
        bars.map(({slots}) => (slots[index].done = (value / slots[index].max) * 100 || slots[index].value));
    else
      (template = value),
        bars.map(({slots}) =>
          Array.isArray(index)
            ? index.map((val, i) => inferParse(slots, val, i))
            : slots.map((_slot, i) => inferParse(slots, index, i)),
        );

    return !template ? this : this.draw(template);
  }

  value(index, value, template) {
    function inferParse(slots, val, i) {
      if (val >= 0)
        if (val <= slots[i].max) slots[i].done = val;
        else throw new Error(`Slot index [${i}] is being updated with more than it can hold [${val} > ${slots[i].max}]`);
      else throw new Error(`Slot index [${i}] is being updated with [${val}] which is less than 0`);
    }
    const bars = [this, ...this.cores.append.reduce((a, v) => (v.inherit && a.push(v.bar), a), [])];
    if (arguments.length > 1 && value && typeof value !== 'object')
      bars.map(({slots}) => (slots[index].done = value || slots[index].done));
    else
      (template = value),
        bars.map(({slots}) =>
          Array.isArray(index)
            ? index.map((val, i) => inferParse(slots, val, i))
            : slots.map((_slot, i) => inferParse(slots, index, i)),
        );
    return !template ? this : this.draw(template);
  }

  /**
   * Get an average round up of values in percentage and current progress compatred to the total
   * @param {Number} [fixedPoint] The fixed point at which to approximate average values to
   * @returns {{completed:number, remaining:number, percentage:number}}
   */
  average(fixedPoint) {
    let completed = this.slots.reduce((a, b) => a + b.done, 0);
    let percentage = (completed / this.total()) * 100;
    let remaining = this.total() - completed;
    [percentage, completed, remaining] = [percentage, completed, remaining].map(value =>
      fixedPoint ? parseFloat(value.toFixed(fixedPoint)) : value,
    );
    return {completed, remaining, percentage};
  }

  /**
   * Draw the progressbar, apply template options to the template
   * @param {String|Object} [template] The template to use on the drawn progress bar or an array of predrawn progressbar from `this.constructBar` like `this.oldBar`
   */
  draw(template) {
    const result = Array.isArray(template)
      ? template
      : [
          ...this.constructBar(template).split('\n'),
          ...this.cores.append.map(block => block.bar.constructBar(block.inherit ? template : null)),
        ];
    this.oldBar = result;
    this.print(`bar${result.length ? `+${result.length - 1}` : ''}`, result.join('\n'));
    this.hasBarredOnce = !0;
    return this;
  }

  #flipperCount = 0;

  constructBar(template) {
    const forcedFirst = [
      parseBar(this.opts, this.length() - this.opts.bar.header.length, this.average().percentage, this.opts.bar.header),
    ];
    const bars = !this.opts.pulsate
      ? !this.opts.forceFirst
        ? (() => {
            const total = Math.max(
              0,
              this.length() +
                [
                  [this.opts.bar.header, 0],
                  [this.opts.bar.separator, -1],
                ].reduce((a, [v, e]) => a - (v.length ? v.length * this.slots.length + e : 0), 0),
            );
            const slotting = this.slots.map(({level, percentage}) => ({
              portion: Math.floor((level / 100) * total),
              percentage,
            }));
            const slack = total - slotting.reduce((max, {portion}) => max + portion, 0);
            slotting.slice(-1).pop().portion += slack;
            const result = slotting.map(({portion, percentage}) => parseBar(this.opts, portion, percentage));
            return result;
          })()
        : forcedFirst
      : pulsateBar(this, this.cores.pulsateSlots, this.opts.bar.pulsateSkip, this.opts.bar.separator);
    const templateString = Array.isArray(this.opts.template) ? this.opts.template.join('\n') : this.opts.template;
    const average = this.average();
    return this.parseString(templateString, {
      bar: bars.join(`:{color:bar:separator}${this.opts.bar.separator}:{color:close}:{bgcolor:close}`),
      'bar:complete': forcedFirst.join(''),
      label: this.label(),
      total: this.total(),
      flipper: this.opts.flipper[(this.#flipperCount += 1) % this.opts.flipper.length],
      ...average,
      percentage: average.percentage.toFixed(0),
      ...template,
    });
  }

  parseString(str, template) {
    const variables = {...(template = {...this.opts.variables, ...template})};
    Object.entries(this.opts.variables).forEach(
      ([spec, content]) => typeof content === 'function' && content !== template[spec] && (template[spec] = content(template)),
    );
    return stringd(stringd(str, template), variables);
  }

  /**
   * Print a message after a bar `draw` interrupt
   * @param {'bar'|'end'} type Type of bar print or the first part of the printer
   * @param {any[]} content The contents to be formatted
   */
  print(type, ...content) {
    const self = this;
    type = format(type);
    if (!self.cores.stdout.isTTY) throw Error("Can't draw or print progressBar interrupts with piped output");
    const cleanWrite = function cleanWrite(arr, dontClean, addons = 0, ending = false, normie = false) {
      if (!dontClean) {
        // check https://github.com/freeall/single-line-log/blob/515b3b99b699396c2ad5f937e4b490b6f9fbff0e/index.js#L1-L3
        self.cores.stdout.moveCursor(0, -addons);
        self.cores.stdout.cursorTo(0);
        self.cores.stdout.clearScreenDown();
      }
      (normie ? process.stdout : self.cores.stdout).write(
        `${dontClean && ending && addons ? '\n' : ''}${self
          .parseString(format(...arr))
          .replace(self.opts.bar.colorize ? '' : /\x1b\[\d+m/g, '')}`,
      );
    };
    let addonPack;
    const addons = this.hasBarredOnce && !this.justLogged ? this.oldBar.length - 1 : 0;
    this.justLogged =
      type === 'bar' && content.length === 1
        ? !!cleanWrite(content, this.justLogged, addons)
        : (addonPack = type.match(/^bar\+(\d+)/)) !== null
        ? !!cleanWrite(content, this.justLogged, this.hasBarredOnce ? addonPack[1] : addons)
        : type === 'end'
        ? !!cleanWrite(content, !this.opts.clean, addons, true, true)
        : !cleanWrite([(type.startsWith(':') && `${type.slice(1)}`) || type, ...content, '\n'], this.justLogged, addons, false, true);
    if (this.justLogged && this.hasBarredOnce) this.draw(this.oldBar);
    return this;
  }

  /**
   * End the bar irrespective of progress, optionally with a message.
   * @param {any[]} [message] The message to be printed to `stdout` right before ending the bar
   */
  end(...message) {
    if (!this.isEnded) {
      if (message.length) this.print('end', ...message);
      this.isEnded = !0;
    }
    return this;
  }

  /**
   * Drain all slots in the progressbar to 0
   */
  drain(slotID) {
    if (slotID) this.slots[slotID].done = 0;
    else this.slots.map(slot => ((slot.done = 0), slot));
    return this;
  }

  /**
   * Drop the chain, return void
   */
  // eslint-disable-next-line class-methods-use-this
  drop() {}

  /**
   * Append the specified bar after `this`
   * @param {ProgressBar} bar The bar to be appended
   * @param {Boolean} inherit Whether or not to inherit bar templates from `this`
   */
  append(bar, inherit = !1) {
    if (!ProgressBar.isBar(bar) && !bar.opts.template) throw Error('The Parameter <bar> is not a progressbar or a hanger');
    this.cores.append.push({bar, inherit});
    bar.cores.isKid = !0;
    return this;
  }

  /**
   * Check if the bar or a slot is complete
   * @param {Number} [slot] The slot to be checked for completion
   */
  isComplete(slot) {
    if (slot && !this.slots[slot]) throw Error(`Value in <slot>:${slot} has no slot reference`);
    return slot ? this.slots[slot].max === this.slots[slot].done : this.average().remaining === 0;
  }

  /**
   * Find out the progressbar is appended to another
   */
  get isChild() {
    return !!this.cores.isKid;
  }

  /**
   * Check if the progressbar is active.
   * - Activity is determined when the progressbar is not complete
   */
  get isActive() {
    return !this.isComplete();
  }

  /**
   * Check if the bar is fresh.
   * - Equivalent of `this.isActive && !this.average().value`
   */
  get isFresh() {
    return this.isActive && !this.average().completed;
  }

  /**
   * Check if the provided progressbar is an instance of `this`
   * @param {ProgressBar} bar The progressbar to be checked
   */
  static isBar(bar) {
    return bar instanceof ProgressBar;
  }

  /**
   * Check if the provided progressbar is an stream instance of `this`
   * @param {ProgressBar} bar The progressbar to be checked
   */
  static isBarStream(barStream) {
    return (
      !!barStream &&
      ProgressBar.isBar(barStream.bar) &&
      barStream instanceof EventEmitter &&
      [barStream.read, barStream.write].every(slot => typeof slot === 'function')
    );
  }

  /**
   * Check if the provided object is a stream progressbar generator
   * @param {any} bar The progressbar to be checked
   */
  static isBarGen(barStream) {
    return (
      !!barStream && ProgressBar.isBar(barStream.bar) && barStream instanceof EventEmitter && typeof barStream.next === 'function'
    );
  }

  /**
   * Check if the provided object is related to any instances created by this script
   * @param {any} bar The progressbar to be checked
   */
  static isBarRelated(barStream) {
    return ProgressBar.isBar(barStream) || ProgressBar.isBarStream(barStream) || ProgressBar.isBarGen(barStream);
  }

  /**
   * Calculate slot levels by number of slots
   * @param {number} len Each slot length, inferrable if ratio doesn't make 100 or pop-able if over 100
   */
  static slotsByCount(len) {
    return size => padRatio(Array(len).fill(size / len), size, false);
  }

  /**
   * Calculate slot levels by size
   * @param {number} size Maximum possible total size
   * @param {number[]} percentages Each slot length, inferrable if ratio doesn't make 100 or pop-able if over 100
   */
  static slotsByPercentage(percentages) {
    return size =>
      padRatio(
        percentages.map(_size => (_size / 100) * size),
        size,
      );
  }

  /**
   * Create a streamified bar for use with generators
   * @param {Number} total Total attainable value of bytes in <N>
   * @param {Number|Number[]} slots Number of slots in <%>
   * @param {_streamOpts} [opts] Options for the bar
   * @param {(bar:ProgressBar,slotLevel:Number,template:{}) => void} [actor] The actor for every yield
   */
  static stream(total, slots, opts, actor) {
    // if (typeof slots === 'function') [slots, opts, actor] = [, {}, slots];
    if (typeof opts === 'function') [opts, actor] = [{}, opts];
    if ((typeof slots === 'object') & !Array.isArray(slots)) [slots, opts] = [, slots];
    opts = {
      ...(total === Infinity
        ? {
            pulsate: !0,
            template: ':{tag}[:{bar}] [:{flipper}] :{label} (:{slot:runtime}) :{slot:size}',
          }
        : {}),
      ...opts,
      ...(slots === Infinity ? ((slots = total), {progress: {infinite: !0}}) : {}),
    };
    const progressBar = new ProgressBar(total, slots, opts);
    return ProgressBar.streamify(progressBar, actor, opts);
  }

  /**
   * Streamify a bar for use with generators
   * @param {ProgressBar} bar The bar to be used
   * @param {(bar:ProgressBar, slotLevel:Number, template:() => {completed:number, remaining:number, percentage:number}) => void} [actor] The actor for every yield
   * @param {_streamOpts} [opts] Options for the bar
   * @returns {{next(size: Number, opts: _streamOpts):NodeJS.WritableStream, bar:ProgressBar}} Returned function from `ProgressBar.streamify`
   */
  static streamify(bar, actor, opts) {
    if (typeof actor === 'object') [actor, opts] = [, actor];
    bar.opts = merge({}, bar.opts, streamOpts, opts);
    bar.opts.template = opts.template || streamOpts.template;
    const [pulsateSlots, pulsateSkips] = [
      [
        [0, 0],
        [bar.opts.progress.pulsateLength || bar.opts.bar.pulsateLength, 100],
      ].map(([level, value]) => ({
        level,
        value,
      })),
      bar.opts.progress.pulsateSkip || bar.opts.bar.pulsateSkip,
    ];
    let defaultUnit;
    const progressGen = new ProgressGen();
    const buildBytesWith = (bytes, byteOpts = {}) => (props, data) =>
      xbytes.createRelativeSizer((data && (data.args[0] || data.matched.unit)) || defaultUnit, {
        iec: data && 'iec' in data.matched ? data.matched.iec === 'true' : byteOpts.iec || !1,
        bits: data && 'bits' in data.matched ? data.matched.bits === 'true' : byteOpts.bits || !1,
        fixed: data && 'fixed' in data.matched ? parseInt(data.matched.fixed, 10) : byteOpts.fixed || 2,
        short: data && 'short' in data.matched ? data.matched.short === 'true' : byteOpts.short || !0,
        space: data && 'space' in data.matched ? data.matched.space === 'true' : byteOpts.space || !0,
        sticky: data && 'sticky' in data.matched ? data.matched.sticky === 'true' : byteOpts.sticky || !1,
      })(typeof bytes === 'function' ? bytes(props) : bytes);
    const buildSpeedWith = speed => (_, data) =>
      `${buildBytesWith(speed, {iec: !1, bits: !0, fixed: 2, short: !0, space: !1, sticky: !1})(_, data)}${(data &&
        data.matched.metric) ||
        'ps'}`;
    const totalSpeed = speedometer(5000);
    const streamGenerator = bar.slotStreamify((slotIndex, total, infinite) => {
      const max = !infinite ? Math.round((bar.slots[slotIndex].level / 100) * bar.total()) : Infinity;
      total = typeof total === 'function' ? total(bar) : total || max;
      if (!infinite && total > max)
        throw Error(
          `<size> slot must not be greater than maximum possible size for the slot [${max}], consider using infinite slots`,
        );
      const through = progressStream({length: total, ...bar.opts.progress})
        .on('progress', progress => {
          const speed = totalSpeed(progress.delta);
          if (bar.isEnded) {
            through.emit('error', Error('The <bar> being used has been ended'));
            return;
          }
          (actor || ((_bar, args, template) => _bar.value(...args).draw(template)))(
            bar,
            bar.opts.progress.infinite ? [progress.delta + bar.average().completed] : [slotIndex, progress.transferred],
            {
              eta: () => xprettyMs((1000 * bar.average().remaining) / speed),
              size: buildBytesWith(() => bar.average().completed),
              speed: buildSpeedWith(speed),
              'speed:raw': speed,
              'slot:speed': buildSpeedWith(progress.speed),
              'slot:speed:raw': progress.speed,
              progress,
              'eta:raw': () => Math.round(bar.average().remaining / speed),
              'slot:bar': () =>
                bar.opts.progress.pulsate
                  ? pulsateBar(bar, pulsateSlots, pulsateSkips, bar.opts.bar.separator).join('')
                  : (() => {
                      const header = bar.opts.bar['slot:header'] || bar.opts.bar.header;
                      const filler = bar.opts.bar['slot:filler'] || bar.opts.bar.filler;
                      const blank = bar.opts.bar['slot:blank'] || bar.opts.bar.blank;
                      return parseBar(
                        merge({}, bar.opts, {bar: {header, filler, blank}}),
                        bar.length() - (header || '').length,
                        progress.percentage,
                      );
                    })(),
              'slot:eta': xprettyMs(1000 * progress.eta),
              'slot:eta:raw': progress.eta,
              'slot:size': buildBytesWith(progress.transferred),
              'slot:size:raw': progress.transferred,
              'size:total': buildBytesWith(() => bar.total()),
              'slot:runtime': xprettyMs(1000 * progress.runtime),
              'slot:runtime:raw': progress.runtime,
              'slot:percentage': progress.percentage.toFixed(0),
              'slot:size:total': buildBytesWith(progress.length),
              'slot:size:total:raw': progress.length,
            },
          );
          [through, progressGen].map(emitter => emitter.emit('tick', {progress, bar}));
        })
        .on('end', () => (bar.isComplete() ? progressGen.emit('complete', bar) : null, progressGen.emit('end', bar)))
        .once('error', error => bar.end(`:{color(red)}[Bar Error]:{color:close} An Error occurred\n${error}`));
      // through.emit = (tr => (...args) => (bar.print('tr>', args[0]), tr.call(through, ...args)))(through.emit)
      return (through.bar = bar), through;
    });
    return Object.assign(progressGen, {
      /**
       * Get the next PassThrough instance
       * @param {number} [size] Size for the next chunk (Omittable)
       * @param {_streamOpts} [options] Bar options
       * @returns {NodeJS.WritableStream} Returned function from `ProgressBar.streamify`
       */
      next: (size, options) => streamGenerator.next([...(typeof size === 'number' ? [size, options] : [, size])]).value,
      /**
       * End the bar irrespective of progress, optionally with a message.
       * @param {any[]} [message] The message to be printed to `stdout` right before ending the bar
       * @returns {ProgressBar} The ProgressBar
       */
      end: (...message) => bar.end(...message),
      /**
       * Print a message after a bar `draw` interrupt
       * @param {any[]} message The message to printed
       * @returns {ProgressBar} The ProgressBar
       */
      print: (...message) => bar.print(...message),
      /**
       * Set the default unit
       * @param {xbytes.AllUnitStacks} unit Preferred unit representation
       * @returns {ProgressBar} The ProgressBar
       */
      defaultUnit(unit) {
        if (!xbytes.isUnit(unit)) throw new Error(`Invalid ByteString unit: ${unit}`);
        defaultUnit = unit;
        return this;
      },
      /**
       * The ProgressBar Instance
       * @type {ProgressBar} The ProgresBar
       */
      bar: streamGenerator.next().value,
    });
  }

  /**
   * Prepare a raw generator for use
   * @param {(slots:Number, total?:Number) => String} actor The performing function
   * @returns {Generator} New ProgressBar Generator
   * @yields The through instance or a cache model of the ProgressBar
   */
  *slotStreamify(actor, args) {
    for (let level = -1; (level += 1) <= (this.opts.progress.infinite ? Infinity : this.slots.length); )
      args = yield !level
        ? this
        : (merge(this.opts, args[1]), actor(Math.floor(level - 1), args[0], this.opts.progress.infinite));
  }
}

module.exports = ProgressBar;
