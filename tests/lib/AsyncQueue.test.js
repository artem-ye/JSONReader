'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const { setTimeout } = require('node:timers/promises');
const { AsyncQueue } = require('../../src/lib/AsyncQueue.js');

describe('async queue', () => {
  it('concurrency', async () => {
    const results = [];

    const executor = async (payload) => {
      await setTimeout(300);
      results.push(payload);
    };

    const concurrency = 3;
    const queue = new AsyncQueue({ concurrency, executor });

    let lastPromise = null;
    for (let i = 1; i < 8; i++) {
      lastPromise = queue.push(i).then(() => {
        assert.strictEqual(results.length, i);
        assert.strictEqual(results.at(-1), i);
      });

      const state = queue._state();
      assert.equal(state.running, i < concurrency ? i : concurrency);
      assert.equal(state.queue.length, i < concurrency ? 0 : i - concurrency);
    }

    await lastPromise;
    assert.equal(results.length, 7);
    for (let i = 0; i < 7; i++) assert.equal(results[i], i + 1);
  });

  it('drain: should be called when whole queue have no more activities', async () => {
    const results = [];
    let drainCalls = 0;

    const executor = async (payload) => {
      await setTimeout(300);
      results.push(payload);
    };

    const concurrency = 3;
    const queue = new AsyncQueue({ concurrency, executor });
    queue.on('drain', () => {
      assert.equal(++drainCalls, 1);
      assert.equal(results.length, 7);
    });

    let lastPromise = null;
    for (let i = 0; i < 7; i++) {
      lastPromise = queue.push(i);
    }

    await lastPromise;
  });

  it('cancel: queued promises can be canceled', { skip: false }, async () => {
    const results = [];

    const executor = async (payload) => {
      await setTimeout(10);
      results.push(payload);
    };

    const concurrency = 3;
    const queue = new AsyncQueue({ concurrency, executor });

    let lastPromise = null;
    for (let i = 0; i < 7; i++) {
      lastPromise = queue.push(i);
    }
    queue.cancel();
    await lastPromise;
    assert.equal(results.length, concurrency);
  });

  it('errors should be handled', async () => {
    const results = [];
    let onErrorCalls = 0;

    const executor = async (fn) => {
      await setTimeout(10);
      results.push(fn());
    };

    const concurrency = 3;
    const queue = new AsyncQueue({ concurrency, executor });
    queue.on('error', () => onErrorCalls++);

    const expectedResultsCount = 6;
    let lastPromise = null;
    for (let i = 0; i < expectedResultsCount + 1; i++) {
      let fn = null;
      if (i === 3) {
        fn = () => {
          throw new Error('Error');
        };
      } else {
        fn = () => i;
      }
      lastPromise = queue.push(fn);
    }

    await lastPromise;
    assert.equal(results.length, 6);
    assert.strictEqual(onErrorCalls, 1);
  });
});
