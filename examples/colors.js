import ProgressBar from '../index.js';

const bar = new ProgressBar(100, [50, 50], {
  bar: {
    header: '\ue0b0',
    separator: '|',
  },
  variables: {
    'color:bar:empty': ':{color:yellow}',
    'color:bar:filled': ':{color:bgWhite}:{color:red}',
    'color:bar:header': ':{color:green}',
    'color:bar:separator': ':{color:red}',
  },
  forceFirst: false,
});

bar.print('Constructing a bar with two slots, a separator, and a header...');
const interval = setInterval(() => {
  const update = (Math.random() * 20) | 0;
  bar.tick(update, {tag: `Updating with ${update}`});
  if (bar.isComplete()) {
    bar.end(`The bar completed\n`);
    clearInterval(interval);
  }
}, 800);
