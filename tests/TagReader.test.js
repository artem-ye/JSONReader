//const assert = require('node:assert');
const { todo } = require('node:test');

const { TagReader } = require('../src/reader/TagReader.js');

todo('Parser tests', { skip: true }, () => {
  const openBracket = '{';
  const closeBracket = '}';
  const p = TagReader({ openBracket, closeBracket });
  const onData = (err, data) => console.log('onData', { err, data });
  const onDone = () => console.log('onDone', 'end of chunk');

  p.feed('[{"a": 1},', onData, onDone);
  p.feed('{"b": 21}, {"c": 22}', onData, onDone);
  p.feed('"f": [\\{"x": 0\\}], {"d": 31}', onData, onDone);
  p.feed(', {"e" ', onData, onDone);
  p.feed(': 41},  {', onData, onDone);
  p.feed('"f": 41},  {"g": 51} ', onData, onDone);
});
