const assert = require('node:assert');
const { it, describe } = require('node:test');
const { BracketsCollector } = require('../src/reader/BracketsCollector.js');

describe('Brackets collector', () => {
  const collector = new BracketsCollector({
    openBracket: '{',
    closeBracket: '}',
  });

  const done = () => collector.done;
  const error = () => collector.error;
  const collectedCount = () => collector.count;

  it('counter', () => {
    assert.equal(done(), false);
    assert.strictEqual(collectedCount(), 0);

    collector.collect('{');
    assert.equal(done(), false);
    assert.strictEqual(collectedCount(), 1);

    collector.collect('{');
    assert.equal(done(), false);
    assert.strictEqual(collectedCount(), 2);

    collector.collect('}');
    assert.equal(done(), false);
    assert.strictEqual(collectedCount(), 1);

    collector.collect('}');
    assert.equal(done(), true);
    assert.strictEqual(collectedCount(), 0);
  });

  it('counter reset', () => {
    collector.reset();
    assert.equal(done(), false);
    assert.strictEqual(collectedCount(), 0);
  });

  it('error', () => {
    collector.reset();
    collector.collect('{');
    assert.strictEqual(done(), false);
    assert.strictEqual(error(), null);

    collector.collect('}');
    assert.strictEqual(done(), true);
    assert.strictEqual(error(), null);

    collector.collect('}');
    assert.strictEqual(done(), true);
    assert.strictEqual(error() instanceof Error, true);
  });

  it('error reset', () => {
    collector.reset();
    assert.strictEqual(error(), null);
  });
});
