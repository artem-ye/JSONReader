const assert = require('node:assert');
const { describe, it, mock, beforeEach } = require('node:test');

const { TagReader } = require('../src/reader/TagReader.js');

describe('Parser tests', () => {
  const openBracket = '{';
  const closeBracket = '}';
  const p = new TagReader({ openBracket, closeBracket });

  const results = [];
  let error = null;
  const onData = (err, data) => {
    onDataCounter();
    error = err;
    results.push(data);
  };
  const onDataCounter = mock.fn(() => {});
  const onDone = mock.fn(() => {});

  beforeEach(() => {
    error = null;
    results.length = 0;
    onDataCounter.mock.resetCalls();
    onDone.mock.resetCalls();
  });

  it('Single object', () => {
    p.feed('[{"a": 1},', onData, onDone);
    assert.equal(results[0], '{"a": 1}');
    assert.equal(results.length, 1);

    assert.equal(onDone.mock.callCount(), 1);
    assert.equal(onDataCounter.mock.callCount(), 1);
    assert.strictEqual(error, null);
  });
  it('Two object', () => {
    p.feed('{"b": 21}, {"c": 22}', onData, onDone);
    assert.equal(results[0], '{"b": 21}');
    assert.equal(results[1], '{"c": 22}');
    assert.equal(results.length, 2);

    assert.equal(onDone.mock.callCount(), 1);
    assert.equal(onDataCounter.mock.callCount(), 2);
    assert.strictEqual(error, null);
  });
  it('Should ignore escaped characters', () => {
    p.feed('"f": [\\{"x": 0\\}], {"d": 31}', onData, onDone);
    assert.equal(results[0], '{"d": 31}');
    assert.equal(results.length, 1);

    assert.equal(onDone.mock.callCount(), 1);
    assert.equal(onDataCounter.mock.callCount(), 1);
    assert.strictEqual(error, null);
  });
  it('Chunked', () => {
    p.feed(', {"e" ', onData, onDone);
    assert.equal(onDataCounter.mock.callCount(), 0);
    p.feed(': 31},  {', onData, onDone);
    assert.equal(onDataCounter.mock.callCount(), 1);
    p.feed('"f": 41},  {"g": 51} ', onData, onDone);
    assert.equal(onDataCounter.mock.callCount(), 3);

    assert.equal(results[0], '{"e" : 31}');
    assert.equal(results[1], '{"f": 41}');
    assert.equal(results[2], '{"g": 51}');
    assert.equal(results.length, 3);

    assert.equal(onDone.mock.callCount(), 3);
    assert.strictEqual(error, null);
  });
});
