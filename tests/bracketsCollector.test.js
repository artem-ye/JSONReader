const assert = require('node:assert');
const { it, describe } = require('node:test');
const { BracketsCollector } = require('../src/reader/BracketsCollector.js');

describe('Brackets collector common tests', () => {
  const collector = BracketsCollector({
    openBracket: '{',
    closeBracket: '}',
  });
  const doneState = () => collector.done;
  const countState = () => collector.state().count;

  it('interface', () => {
    assert.strictEqual(typeof BracketsCollector === 'function', true);
    assert.strictEqual(typeof collector === 'object', true);
    assert.ok(collector.collect);
    assert.ok(collector.state);
  });

  it('common use case', () => {
    assert.equal(doneState(), false);
    assert.strictEqual(countState(), 0);

    collector.collect('{');
    assert.equal(doneState(), false);
    assert.strictEqual(countState(), 1);

    collector.collect('{');
    assert.equal(doneState(), false);
    assert.strictEqual(countState(), 2);

    collector.collect('}');
    assert.equal(doneState(), false);
    assert.strictEqual(countState(), 1);

    collector.collect('}');
    assert.equal(doneState(), true);
    assert.strictEqual(countState(), 0);
  });

  it('should automatically reset "done" state', () => {
    collector.collect('{');
    assert.equal(doneState(), false);
    assert.strictEqual(countState(), 1);
  });

  it('reset', () => {
    collector.reset();
    assert.equal(doneState(), false);
    assert.strictEqual(countState(), 0);
  });

  it('error', () => {
    collector.reset();
    collector.collect('{');
    assert.strictEqual(collector.done, false);
    assert.strictEqual(collector.errored, false);

    collector.collect('}');
    assert.strictEqual(collector.done, true);
    assert.strictEqual(collector.errored, false);

    collector.collect('}');
    assert.strictEqual(collector.done, true);
    assert.strictEqual(collector.errored, true);
  });
});
