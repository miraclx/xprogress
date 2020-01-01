# xprogress

> Construct Dynamic, Flexible, extensible progressive CLI bar for the terminal built with NodeJS

## DOCUMENTATION INCOMPLETE

## Features

- Stream management functionality

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]

[![NPM][npm-image-url]][npm-url]

## Installing

Via [NPM][npm]:

``` bash
npm install xprogress
```

## Usage

``` javascript
// Node CommonJS
const ProgressBar = require('xprogress');
// Or ES6
import ProgressBar from 'xprogress';
```

## Example

Create a basic progress bar that updates itself with 10% twice every second until it's at maximum

``` javascript
const ProgressBar = require('xprogress');

const bar = new ProgressBar(100);

const interval = setInterval(() => {
  bar.tick(10).draw();
  if (bar.isComplete()) {
    bar.end(`The bar completed\n`);
    clearInterval(interval);
  }
}, 500);
```

![XProgress Example Result][xprogress-result]

## How It Works

ProgressBar uses [stringd][] to parse content within [`ProgressBar::template`](#progressbar:template) with variables in [`ProgressBar::variables`](#progressbar:variables) and then displays them on the terminal.
This sequence occurs for every time [`ProgressBar::draw()`](#progressbar:draw) is called.

## API

### <a id="progressbar"></a> new `ProgressBar`(total[, slots][, opts])

- `total`: &lt;[number][]&gt;
- `slots`: &lt;[HybridInput](#hybridinput)[]&gt;
- `opts`: &lt;[BarOpts][]&gt;

Create and return an xprogress instance
`slots` define the percentage to each part of the progressbar. This is parsed by [pad-ratio][] to a max of 100.

``` javascript
const bar = new ProgressBar(100, [20, 44]);
```

### <a id="globopts"></a> `GlobOpts`: [Object][object]

- `bar`: [Object][object]
  - `blank`: &lt;[string][]&gt; Content to use for the blank portion of the progressbar. **Default**: `'-'`.
  - `filler`: &lt;[string][]&gt; Content to use for the filled portion of the progressbar. **Default**: `'#'`.
  - `header`: &lt;[string][]&gt; Content to use for the header(s) of progressbars. **Default**: `''`.
  - `colorize`: &lt;[boolean][]&gt; Whether or not to allow colors in the bar. **Default**: `true`.
  - `separator`: &lt;[string][]&gt; Content to use when separating bars. **Default**: `''`.
  - `pulsateSkip`: &lt;[number][]&gt; Distance away at which to skip a pulsating bar. **Default**: `15`.
  - `pulsateLength`: &lt;[number][]&gt; The length of a pulsating progressbar. **Default**: `15`.
- `clean`: &lt;[boolean][]&gt; Whether or not to clear the progressbar buffer on the terminal after [`ProgressBar::end()`](#progress:end) has been called. **Default**: `false`.
- `flipper`: &lt;[string][]|[string][][]&gt; Content(s) to use for the progressbar flipper. This would cycle through all indexes in this property for everywhere :{flipper} is speified. **Default**: `['|', '/', '-', '\']`.
- `pulsate`: &lt;[boolean][]&gt; Whether or not to use a pulsate view for the progressbar. **Default**: `false`.
- <a id="globopts:template"></a> `template`: &lt;[string][]|[string][][]&gt; The template to use for the progressbar view. This is parsed by [stringd][]. with [`this.variables`](#globopts:variables) **Default**: `''`.
- <a id="globopts:variables"></a> `variables`: &lt;[VariableOpts](#variableopts)&gt; Variables with which to parse [`this.template`](#globopts:template), extended with [`cStringd.raw`][cstringd:raw].
- `forceFirst`: &lt;[boolean][]&gt; Whether or not to force a multi-bar progressbar to a single bar (useful either when terminal width is too small or when filled with excess addons). **Default**: `false`.

The global options shared by both [ProgressBar](#progressbar) and [ProgressStream](#progressstream).

### <a id="variableopts"></a> `VariableOpts` <sub>extends [`cStringd.raw`][cStringd:raw]</sub>: [`Object`][object]

- `tag`: &lt;any&gt; Floating mutable tag to be attached to the bar
- *`bar`: &lt;[string]&gt; The progress bar itself
- *`label`: &lt;any&gt; The label to be attached to the bar
- *`total`: &lt;any&gt; The maximum value for the entire duration of the bar
- `flipper`: &lt;any&gt; The flipper as defined in the definition for the progressbar. **Default**: `['|', '/', '-', '\']`.
- *`completed`: &lt;any&gt; The value for the completion level of the entire bar activity. Generated from [`ProgressBar::average()`](#progressbar:average).`completed`
- *`remaining`: &lt;any&gt;
- *`percentage`: &lt;any&gt;

Variables with which to parse [`this.template`](#globopts:template), extended with [`cStringd.raw`][cstringd:raw]. variables prepended with `*` will be ignored anywhere else besides wherever's explicitly requesting a drawn bar.

### <a id="streamvariables"></a> `StreamVariables` <sub>extends [`VariableOpts`](#variableopts)</sub>: [`Object`][object]

- `eta`: &lt;[string]&gt; Duration for the entire progress to end. Parsed by [prettyMs]
- `size`: &lt;[ByteString]&gt; Human readable size for the number of total transferred bytes. Parsed by [xbytes]
- `speed`: &lt;[string]&gt; Human readable speed for the number of bits transferred per second. Parsed by [xbytes]
- `progress`: &lt;[ProgressStreamSlice]&gt; The Progress Object
- `eta:raw`: &lt;[number][&gt; Duration estimate of how long it would take for the stream to end based on the number of bytes being steadily transmitted per second.
- `slot:bar`: &lt;[string]&gt; The bar for the active chunk of the progressbar.
- `slot:blank`: &lt;[string]&gt; The character with which to be used as the slot's blank character.
- `slot:eta`: &lt;[string][&gt; Duration estimate for the active chunk to be completed. Parsed by [prettyMs]
- `slot:eta:raw`: &lt;[number]&gt; Duration estimate for the active chunk to be completed.
- `slot:filler`: &lt;[string]|[string][][]&gt; The character(s) with which to be used as the slot's filler character.
- `slot:header`: &lt;[string]&gt; The character with which to be used as the slot's header character.
- `slot:size`: &lt;[ByteString]&gt; Human readable size for the number of transferred bytes specific for the active chunk. Parsed by [xbytes]
- `slot:total`: &lt;[ByteString]&gt; Human readable size for the total number of bytes that can be processed by the active chunk. Parsed by [xbytes]
- `slot:runtime`: &lt;[string]&gt; Runtime for the active chunk. Parsed by [prettyMs]
- `slot:runtime:raw`: &lt;[number]&gt; Runtime for the active chunk.
- `slot:percentage`: &lt;[string]&gt; Integer defining the active slot completion percentage
- `slot:size:total`: &lt;[ByteString]&gt; Human readable size for the total number of bytes transferred in a single instance

### <a id='hybridinput'></a> `HybridInput`: [string][]|[number][]|[number][][]

This content here is parsed by [pad-ratio][] in the construct of an [HybridInput][hybridinput].

## Development

### Building

Feel free to clone, use in adherance to the [license](#license) and perhaps send pull requests

``` bash
git clone https://github.com/miraclx/xprogress.git
cd xprogress
npm install
# hack on code
npm run build
```

## License

[Apache 2.0][license] © **Miraculous Owonubi** ([@miraclx][author-url]) &lt;omiraculous@gmail.com&gt;

[BarOpts]: #globopts

[npm]:  https://github.com/npm/cli "The Node Package Manager"
[license]:  LICENSE "Apache 2.0 License"

[stringd]:  https://github.com/miraclx/stringd "NodeJS String Variable Parser"
[xbytes]:  https://github.com/miraclx/xbytes "NodeJS ByteParser"
[prettyMs]:  https://github.com/sindresorhus/pretty-ms "Convert milliseconds to a human readable string: `1337000000` → `15d 11h 23m 20s`"
[cstringd]:  https://github.com/miraclx/stringd-colors "ANSI colors for stringd formatting"
[pad-ratio]:  https://github.com/miraclx/pad-ratio "Pad or trim an array to sum up to a maximum value"
[hybridinput]:  https://github.com/miraclx/pad-ratio#hybridinput
[ProgressStreamSlice]: https://github.com/freeall/progress-stream#progress
[ByteString]: https://github.com/miraclx/xbytes#bytestring
[cstringd:raw]:  https://github.com/miraclx/stringd-colors#cstringdraw "Raw ANSI codes for stringd-colors"

[author-url]: https://github.com/miraclx
[ansi-styles]:  https://github.com/chalk/ansi-styles "ANSI escape codes for styling strings in the terminal"
[xprogress-result]: screenshots/example.gif "StringD Colors Example"

[npm-url]: https://npmjs.org/package/xprogress
[npm-image]: https://badgen.net/npm/node/xprogress
[npm-image-url]: https://nodei.co/npm/xprogress.png?stars&downloads
[downloads-url]: https://npmjs.org/package/xprogress
[downloads-image]: https://badgen.net/npm/dm/xprogress

[object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[regexp]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
