const assert = require('node:assert');
const { it, describe } = require('node:test');
const { SearchEngine } = require('../src/reader/SearchEngine.js');

describe('Search engine: Use cases', () => {
  it('Object {}', () => {
    const engine = SearchEngine({ openBracket: '{', closeBracket: '}' });
    engine.reset();
    const jsonStr = '[{"a": {"skip this": "\\}"}, "b": [1,2,3] }';
    let res = engine.findOpenTag(jsonStr, 0);
    assert.strictEqual(res.lastIndex, 2);

    const { lastIndex } = engine.findCloseTag(jsonStr, 2);
    assert.strictEqual(lastIndex, jsonStr.length);
  });

  it('Array []', () => {
    const engine = SearchEngine({
      openBracket: '[',
      closeBracket: ']',
    });
    engine.reset();
    const jsonStr = '[ [{"a": "\\]"}] ]';
    const offset = jsonStr.indexOf('[');
    let res = engine.findOpenTag(jsonStr, offset);
    assert.strictEqual(res.lastIndex, offset + 1);

    const startIndex = res.lastIndex - 1;
    const { lastIndex } = engine.findCloseTag(jsonStr, res.lastIndex);
    assert.strictEqual(lastIndex > startIndex + 1, true);
  });
});

it('Typing checks', () => {
  assert.strictEqual(typeof SearchEngine === 'function', true);
});

describe('Search engine: Unit test', () => {
  const engine = SearchEngine({ openBracket: '{', closeBracket: '}' });

  it('regExp tests', () => {
    let res = engine.findOpenTag('[}', 0);
    assert.strictEqual(res.match, undefined);
    assert.strictEqual(res.lastIndex, undefined);

    res = engine.findOpenTag('[\\{', 0);
    assert.strictEqual(res.match, undefined);
    assert.strictEqual(res.lastIndex, undefined);

    res = engine.findOpenTag('[{', 2);
    assert.strictEqual(res.match, undefined);
    assert.strictEqual(res.lastIndex, undefined);

    res = engine.findOpenTag('[{', 0);
    assert.strictEqual(res.match, '{');
    assert.strictEqual(res.lastIndex, 2);

    res = engine.findCloseTag('"a": "\\}"', 0);
    assert.strictEqual(res.lastIndex, undefined);

    const s = '"a": 12}';
    const { lastIndex } = engine.findCloseTag(s, 2);
    assert.strictEqual(lastIndex, s.length);
  });
});
describe('Search engine use cases', () => {});
