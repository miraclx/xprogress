// Type definitions for xprogress
// Project: https://github.com/miraclx/xprogress
// Definitions by: Miraculous Owonubi <https://github.com/miraclx>

/// <reference types="node" />

import { EventEmitter } from 'events';
import stream, { Stream } from 'stream';

import { ParsedString } from 'stringd'
import { HybridRatio as HybridInput } from 'pad-ratio'
import { ByteString } from 'xbytes'
import { Colors } from 'stringd-colors'
import { Progress as ProgressStreamSlice, ProgressStream as RawProgressStream, ProgressListener } from 'progress-stream'
import { WriteStream } from 'tty';

export = ProgressBar;

declare namespace ProgressBar {
  namespace CoreOptions {
    interface SharedIgnores {
      bar: any;
      label: any;
      total: any;
      flipper: any;
      completed: any;
      remaining: any;
      percentage: any;
    }
    interface SharedVariableOpts extends Colors, SharedIgnores {
      tag: any;
      'color:bar:empty': string;
      'color:bar:filled': string;
      'color:bar:header': string;
    }
    interface SpecOpts {
      blot: boolean;
      label: string;
      append: boolean;
      length: (() => number) | number;
    }
    interface GlobOpts {
      bar: {
        blank: string;
        filler: string;
        header: string;
        colorize: boolean;
        separator: string;
        pulsateSkip: number;
        pulsateLength: number;
      };
      clean: boolean;
      flipper: string | string[];
      pulsate: boolean;
      template: string | string[];
      variables: VariableOpts;
      forceFirst: boolean;
    }
  }
  interface VariableOpts extends CoreOptions.SharedVariableOpts { }
  interface StreamVariables extends CoreOptions.SharedVariableOpts {
    eta: string;
    size: ByteString;
    progress: ProgressStreamSlice;
    ['eta:raw']: number;
    ['slot:bar']: any;
    ['slot:eta']: string;
    ['slot:eta:raw']: number;
    ['slot:size']: ByteString;
    ['slot:total']: ByteString;
    ['slot:runtime']: string;
    ['slot:runtime:raw']: number;
    ['slot:percentage']: string;
    ['slot:size:total']: ByteString;
  }
  interface SpecBarOpts extends CoreOptions.GlobOpts, CoreOptions.SpecOpts {}
  interface SpecBarStreamOpts extends CoreOptions.GlobOpts, CoreOptions.SpecOpts {
    progress: {
      time: number;
      pulsate: boolean;
      infinite: boolean;
      pulsateSkip: number;
      pulsateLength: number;
    };
    variables: StreamVariables;
    stageOpts?: CoreOptions.GlobOpts;
  }
  interface Slot {
    level: number;
    value: number;
    readonly max: number;
    readonly done: number;
  }
  interface BarOptions extends CoreOptions.GlobOpts { }
  
  interface StreamProgress extends ProgressStreamSlice {}

  type EventData<T> = {
    bar: T,
    progress: ProgressBar.StreamProgress
  }
}

/**
 * @copyright (c) 2017 Miraculous Owonubi
 * @author Miraculous Owonubi
 * @license Apache-2.0
 * @module progress2
 */
declare class ProgressBar {
  opts: ProgressBar.BarOptions;
  
  cores: {
    label: string;
    total: number;
    append: ProgressBar[];
    length: number;
    stdout: WriteStream;
    pulsateSlots: { level: number, value: number }[];
  }
  
  slots: Array<ProgressBar.Slot>;

  /**
   * Build a basic progress bar with a single slot
   * @param total Max attainable value by the progressBar
   */
  constructor(total: number);
  /**
   * Build a progress bar
   * @param total Max attainable value by the progressBar
   * @param opts Attachable options
   */
  constructor(total: number, opts?: ProgressBar.SpecBarOpts);
  /**
   * Build a progress bar
   * @param total Max attainable value by the progressBar
   * @param slots Allocation of slots in <%>
   * @param opts Attachable options
   * `slots` is a [`HybridInput`](http://github.com/miraclx/xprogress#hybridinput)
   */
  constructor(total: number, slots?: HybridInput, opts?: ProgressBar.SpecBarOpts);

  /**
   * Get the progressbar label
   */
  label(): string;
  /**
   * Set the progressbar label
   * @param label The string label
   */
  label(label: string): this;

  /**
   * Get the total level of the progressbar
   */
  total(): number;
  /**
   * Update the total level of the progressbar
   * @param value The number to be added to the total level
   * @param template Template variable values to be included into core options
   */
  total(value: number, template?: ProgressBar.VariableOpts): this;

  /**
   * Get the max length of the progressbar
   */
  length(): number;
  /**
   * Set the max length of the progressbar
   * @param value The value to set the progressBar length to
   */
  length(value: number): this;

  /**
   * Update the progressbar with `percentage`
   * - This will top up all slots specified percentage
   * - The progressbar would be automatically drawn if `template` is provided
   * @param percentage Percentage to update the slots with
   * @param template Template variable values to use on the drawn progress bar
   */
  tick(percentage: number, template?: ProgressBar.VariableOpts): this;
  /**
   * Update the progressbar slots with certain percentages
   * - This will top up the current slots with percentage values within the array
   * - The progressbar would be automatically drawn if `template` is provided
   * @param perrcentages Percentages to update the slots with
   * @param template Template variable values to use on the drawn progress bar
   */
  tick(perrcentages: number[], template?: ProgressBar.VariableOpts): this;

  /**
   * Update the progressbar to a specific value, balancing all slots
   * - The progressbar would be automatically drawn if [template] is provided
   * @param value The index at which to replace value or an array of all possible values
   * @param template Template variable values to use on the drawn progress bar
   * @example
   *  > this.value(250, {}) // Share 250 across all slots
   */
  value(value: number, template?: ProgressBar.VariableOpts): this;
  /**
   * Update the progressbar slot values in accordance to the array
   * - The progressbar would be automatically drawn if [template] is provided
   * @param values An array of slot values
   * @param template Template variable values to use on the drawn progress bar
   * @example
   *  > this.value([400, 500], {}) // Set the value of the slots according to array specification
   */
  value(values: number[], template?: ProgressBar.VariableOpts): this;
  /**
   * Update the value at specified index
   * - The progressbar would be automatically drawn if [template] is provided
   * @param index The index at which to replace value
   * @param value The value for the index
   * @param template Template variable values to use on the drawn progress bar
   * @example
   *  > this.value(1, 500, {}) // Set the value of the slot at index 1 to 50
   */
  value(index: number, value: number, template?: ProgressBar.VariableOpts): this;

  /**
   * Update the percentage at specified index aggregating multiple slots if any
   * - The progressbar would be automatically drawn if [template] is provided
   * @param value Percentage for the entire bar
   * @param template Template variable values to use on the drawn progress bar
   * @example
   *  > this.value(70, {}) // Set the bar to 70%
   */
  progress(value: number, template?: ProgressBar.VariableOpts): this;
  /**
   * Update the progressbar slot percentages in accordance to the array
   * - The progressbar would be automatically drawn if [template] is provided
   * @param percentages An array of slot percentages
   * @param template Template variable values to use on the drawn progress bar
   * @example
   *  > this.value([42, 60], {}) // Set the percentages of the slots
 */
  progress(percentages: number[], template?: ProgressBar.VariableOpts): this;
  /**
   * Update the percentage at specified index
   * - The progressbar would be automatically drawn if [template] is provided
   * @param index The index at which to replace percentage
   * @param value The percentage for the index
   * @param template Template variable values to use on the drawn progress bar
   * @example
   *  > this.value(1, 30, {}) // Set the percentage of the slot at index 1 to 30%
 */
  progress(index: number, value: number, template?: ProgressBar.VariableOpts): this;

  /**
   * Get an average round up of values in percentage and current progress compatred to the total
   */
  average(): { completed: number, remaining: number, percentage: number };
  /**
   * Get an average round up of values in percentage and current progress compatred to the total
   * @param fixedPoint The fixed point at which to reduce fraction digits
   */
  average(fixedPoint: number): { completed: number, remaining: number, percentage: number };

  /**
   * Draw the progressbar
   */
  draw(): this;
  /**
   * Draw the progressbar, apply template options to the template
   * @param template The template to use on the drawn progress bar or an array of predrawn progressbar from `this.constructBar` like `this.oldBar`
   */
  draw(template: ProgressBar.VariableOpts): this;

  /**
   * Construct the progressBar
   */
  constructBar(): ParsedString<{}>;
  /**
   * Construct the progressBar, apply template options to the template
   * @param template Template variable values to use on the drawn progress bar
   */
  constructBar<T = ProgressBar.VariableOpts>(template: T): ParsedString<T>;

  /**
   * Interrupt the bar to write a message
   * @param msgs Interrupt messages to be printed, formattable with %
   */
  print(...msgs): this;
  /**
   * Print a message after a bar `draw` interrupt
   * @param type Type of bar print
   * @param content The contents of the bar printout
   */
  print(type: 'bar' | 'end', ...content: any[]): this;

  /**
   * Parse a string with bar options.. useful for constructing the bar
   * @param string The string to be parsed with bar options
   */
  parseString(string: string): ParsedString<{}>;
  /**
   * Parse a string with bar options.. useful for constructing the bar
   * @param str The string to be parsed with bar options
   * @param template Template variable values to use on the drawn progress bar
   */
  parseString<T = ProgressBar.VariableOpts>(string: string, template: T): ParsedString<T>;

  /**
   * End the bar irrespective of progress
   */
  end(): this;
  /**
   * End the bar irrespective of progress
   * @param message The content to be written to `stdout` after to ending the bar
   */
  end(message: string): this;

  /**
   * Drop the chain, return void
   */
  drop(): void;
  
  /**
   * Drain all slot percentages in the progressbar to 0
   */
  drain(): this;

  /**
   * Append the specified bar after `this`
   * @param bar The bar to be appended
   */
  append(bar: ProgressBar): this;
  /**
   * Append the specified bar after `this`
   * @param bar The bar to be appended
   * @param inherit Whether or not to inherit bar template variable values from `this`
   */
  append(bar: ProgressBar, inherit: boolean): this;

  /**
   * Check if the bar is complete
   */
  isComplete(): boolean;

  /**
   * Check if the bar slot is complete
   * @param slotIndex The slot to be checked for completion
   */
  isComplete(slotIndex: number): boolean;

  /**
   * Find out the progressbar is appended to another
   */
  readonly isChild: boolean;

  /**
   * Check if the progressbar is active.
   * - Activity is determined when the progressbar is not complete
   */
  readonly isActive: boolean;

  /**
   * Check if the bar is fresh.
   * - Equivalent of `this.isActive && !this.average().value`
   */
  readonly isFresh: boolean;

  /**
   * Prepare a raw stream generator from the bar for use
   * @param actor The performing function
   * @yields The through instance or a cache model of the ProgressBar
   */
  slotStreamify(actor: (bar: ProgressBar, levels: number | number[], variables?: ProgressBar.StreamVariables) => void): ProgressBar.ProgressStreamCoreGenerator<this>;

  /**
   * Check if the provided object is a ProgressBar
   * @param bar The progressbar to be checked
   */
  static isBar(bar: ProgressBar): boolean;

  /**
   * Check if the provided object is a bar stream
   * @param bar The progressbar to be checked
   */
  static isBarStream(barStream: ProgressBar.ProgressStream<ProgressBar>): boolean;
  /**
   * Check if the provided object is a bar stream generator
   * @param bar The progressbar to be checked
   */
  static isBarGen(barGen: ProgressBar.ProgressStreamGenerator<ProgressBar>): boolean;

  /**
   * Check if the provided object is in any way related to any of the instances defined within this module.
   * i.e Check whether the object is either a progressbar, a barstream or a bar stream generator
   * @param bar The progressbar to be checked
   */
  static isBarRelated(barObject: ProgressBar | ProgressBar.ProgressStream<ProgressBar> | ProgressBar.ProgressStreamGenerator<ProgressBar>): boolean;

  /**
   * Calculate slot levels by number of slots
   * @param len Each slot length, inferrable if ratio doesn't make 100 or pop-able if over 100
   */
  static slotsByCount(len: number): number[];

  /**
   * Calculate slot levels by size
   * @param size Maximum possible total size
   * @param slots Each slot length, inferrable if ratio doesn't make 100 or pop-able if over 100
   */
  static slotsBySize(size: number, slots: number | number[]): number[];

    /**
   * Create a streamified bar for use with generators
   * @param total Total attainable value of bytes in <N>
   * @param opts Options for the bar
   */
  static stream(total: number, opts?: ProgressBar.SpecBarStreamOpts): ProgressStreamGenerator<ProgressBar>;
  /**
   * Create a streamified bar for use with generators
   * @param total Total attainable value of bytes in <N>
   * @param slots Number of slots in <%>
   */
  static stream(total: number, slots?: HybridInput): ProgressStreamGenerator<ProgressBar>;
  /**
   * Create a streamified bar for use with generators
   * @param total Total attainable value of bytes in <N>
   * @param actor The actor for every yield
   */
  static stream<T = ProgressBar>(total: number, actor?: (bar: T, levels: number | number[], variables?: ProgressBar.StreamVariables) => void): ProgressStreamGenerator<T>;
  /**
   * Create a streamified bar for use with generators
   * @param total Total attainable value of bytes in <N>
   * @param slots Number of slots in <%>
   * @param opts Options for the bar
   */
  static stream(total: number, slots: HybridInput, opts?: ProgressBar.SpecBarStreamOpts): ProgressStreamGenerator<ProgressBar>;
  /**
   * Create a streamified bar for use with generators
   * @param total Total attainable value of bytes in <N>
   * @param slots Number of slots in <%>
   * @param actor The actor for every yield
   */
  static stream<T = ProgressBar>(total: number, slots: HybridInput, actor?: (bar: T, levels: number | number[], variables?: ProgressBar.StreamVariables) => void): ProgressStreamGenerator<T>;
  /**
   * Create a streamified bar for use with generators
   * @param total Total attainable value of bytes in <N>
   * @param slots Number of slots in <%>
   * @param opts Options for the bar
   * @param actor The actor for every yield
   */
  static stream<T = ProgressBar>(total: number, slots: HybridInput, opts: ProgressBar.SpecBarStreamOpts, actor?: (bar: T, levels: number | number[], variables?: ProgressBar.StreamVariables) => void): ProgressStreamGenerator<T>;

  /**
   * Streamify a bar for use with generators
   * @param bar The bar to be used
   */
  static streamify<T = ProgressBar>(bar: T): ProgressStreamGenerator<T>;
  /**
   * Streamify a bar for use with generators
   * @param bar The bar to be used
   * @param opts Options for the bar
   */
  static streamify<T = ProgressBar>(bar: T, opts: ProgressBar.SpecBarStreamOpts): ProgressStreamGenerator<T>;
  /**
   * Streamify a bar for use with generators
   * @param bar The bar to be used
   * @param actor The actor for every yield
   * @param opts Options for the bar
   */
  static streamify<T = ProgressBar>(bar: T, actor: (bar: T, levels: number | number[], variables?: ProgressBar.CoreOptions.StreamVariables) => void, opts?: ProgressBar.SpecBarStreamOpts): ProgressStreamGenerator<T>;
}

  declare namespace ProgressBar {
  export interface ProgressStream<T> extends RawProgressStream {
    bar: T;

    on(event: 'tick', listener: (data: EventData<T>) => void): this;
    emit(event: 'tick', data: EventData<T>): boolean;
    once(event: 'tick', listener: (data: cEventData<T>) => void): this;
    addListener(event: 'tick', listener: (data: ProgressBar.EventData<T>) => void): this;
    removeListener(event: 'tick', listener: (data: ProgressBar.EventData<T>) => void): this;
    prependListener(event: 'tick', listener: (data: ProgressBar.EventData<T>) => void): this;
    prependOnceListener(event: 'tick', listener: (data: ProgressBar.EventData<T>) => void): this;

    on(event: "progress", listener: ProgressListener): this;
    on(event: "length", listener: (length: number) => void): this;
    once(event: "progress", listener: ProgressListener): this;
    once(event: "length", listener: (length: number) => void): this;
    setLength(length: number): void;
    progress(): StreamProgress;

    // We have to redeclare all on/once overloads from stream.Transform in
    // order for this ProgressStream interface to extend stream.Transform
    // correctly. Using an intersection type instead may be an option once
    // https://github.com/Microsoft/TypeScript/issues/30031 is resolved.

    // stream.Readable events

    /* tslint:disable-next-line adjacent-overload-signatures */
    on(event: "close", listener: () => void): this;
    on(event: "data", listener: (chunk: any) => void): this;
    /* tslint:disable-next-line unified-signatures */
    on(event: "end", listener: () => void): this;
    /* tslint:disable-next-line unified-signatures */
    on(event: "readable", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    /* tslint:disable-next-line adjacent-overload-signatures */
    once(event: "close", listener: () => void): this;
    once(event: "data", listener: (chunk: any) => void): this;
    /* tslint:disable-next-line unified-signatures */
    once(event: "end", listener: () => void): this;
    /* tslint:disable-next-line unified-signatures */
    once(event: "readable", listener: () => void): this;
    once(event: "error", listener: (err: Error) => void): this;

    // stream.Writable events

    /* tslint:disable-next-line adjacent-overload-signatures unified-signatures */
    on(event: "drain", listener: () => void): this;
    /* tslint:disable-next-line unified-signatures */
    on(event: "finish", listener: () => void): this;
    on(event: "pipe", listener: (src: stream.Readable) => void): this;
    /* tslint:disable-next-line unified-signatures */
    on(event: "unpipe", listener: (src: stream.Readable) => void): this;
    /* tslint:disable-next-line adjacent-overload-signatures unified-signatures */
    once(event: "drain", listener: () => void): this;
    /* tslint:disable-next-line unified-signatures */
    once(event: "finish", listener: () => void): this;
    once(event: "pipe", listener: (src: stream.Readable) => void): this;
    /* tslint:disable-next-line unified-signatures */
    once(event: "unpipe", listener: (src: stream.Readable) => void): this;

    // events shared by stream.Readable and stream.Writable

    /* tslint:disable-next-line adjacent-overload-signatures */
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    /* tslint:disable-next-line adjacent-overload-signatures */
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    /* tslint:enable adjacent-overload-signatures unified-signatures */
  }

  export interface ProgressStreamCoreGenerator<T> extends IterableIterator<any> {
    next(value: [number, ProgressBar.SpecBarStreamOpts]): IteratorResult<ProgressStream<T>>;
  }

  export interface ProgressStreamGenerator<T> extends EventEmitter {
    bar: T;
    /**
     * Return a Transform stream for updating the bar
     */
    next(): ProgressStream<T>;
    /**
     * Return a Transform stream for updatingProgressStreamGenerator the bar
     * @param opts Options to be used on the progressBar
     */
    next(opts: ProgressBar.SpecBarStreamOpts): ProgressStream<T>;
    /**
     * Return a Transform stream for updatingProgressStreamGenerator the bar
     * @param size Maximum size for the current stream
     */
    next(size: number): ProgressStream<T>;
    /**
     * Return a Transform stream for updating the bar
     * @param size Maximum size for the current stream
     * @param opts Options to be used on the progressBar
     */
    next(size: number, opts?: ProgressBar.SpecBarStreamOpts): ProgressStream<T>;

    on(event: 'tick', listener: (data: ProgressBar.EventData<T>) => void): this;
    on(event: 'complete', listener: (bar: T) => void): this;
    
    emit(event: 'tick', data: ProgressBar.EventData<T>): boolean;
    emit(event: 'complete', bar: T): boolean;

    once(event: 'tick', listener: (data: ProgressBar.EventData<T>) => void): this;
    once(event: 'complete', listener: (bar: T) => void): this;

    addListener(event: 'tick', listener: (data: EventData<T>) => void): this;
    addListener(event: 'complete', listener: (bar: T) => void): this;

    removeListener(event: 'tick', listener: (data: EventData<T>) => void): this;
    removeListener(event: 'complete', listener: (bar: T) => void): this;

    prependListener(event: 'tick', listener: (data: EventData<T>) => void): this;
    prependListener(event: 'complete', listener: (bar: T) => void): this;

    prependOnceListener(event: 'tick', listener: (data: EventData<T>) => void): this;
    prependOnceListener(event: 'complete', listener: (bar: T) => void): this;
  }
}
