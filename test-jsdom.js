import { JSDOM } from 'jsdom';

const dom = await JSDOM.fromURL('http://localhost:3000/', {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true
});

dom.window.console.error = (...args) => {
  console.log("JSDOM ERROR:", ...args);
};

dom.window.console.warn = (...args) => {
  console.log("JSDOM WARN:", ...args);
};

dom.window.console.log = (...args) => {
  console.log("JSDOM LOG:", ...args);
};

setTimeout(() => {
  console.log("Done waiting");
  process.exit(0);
}, 3000);
