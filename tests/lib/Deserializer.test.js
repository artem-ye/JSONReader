'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');

const { Deserializer } = require('../../src/lib/Deserializer.js');

describe('Deserializer', () => {
  it('should works', async () => {
    const parser = new Deserializer({ concurrency: 3 });
    assert.ok(parser);

    const donePromise = Promise.withResolvers();
    const results = [];
    let error = null;

    parser.on('data', (data) => results.push(data));
    parser.on('done', (err) => {
      error = err;
      donePromise.resolve(err);
    });

    parser.push(JSON.stringify({ a: 12 }));

    await donePromise.promise;
    assert.equal(results.length, 1);
    assert.equal(error, null);
  });

  it('errors handling', async () => {
    const parser = new Deserializer({ concurrency: 4 });
    assert.ok(parser);

    const donePromise = Promise.withResolvers();
    const results = [];
    let errorCount = null;

    parser.on('data', (data) => results.push(data));
    parser.on('done', (err) => {
      errorCount++;
      donePromise.resolve(err);
    });

    const expectedResults = [{ a: 1 }, { b: 2 }];

    parser.push(JSON.stringify(expectedResults[0]));
    parser.push(JSON.stringify(expectedResults[1]));
    parser.push('error 1');
    parser.push(JSON.stringify({ unexpected: 'result' }));
    parser.push('error 2');
    await donePromise.promise;

    assert.equal(results.length, expectedResults.length);
    assert.equal(errorCount, 1);
    assert.deepEqual(expectedResults, results);
  });

  it('errors handling (queued)', async () => {
    // concurrency = 2
    const parser = new Deserializer({ concurrency: 2 });
    assert.ok(parser);

    const donePromise = Promise.withResolvers();
    const results = [];
    let errorCount = null;

    parser.on('data', (data) => results.push(data));
    parser.on('done', (err) => {
      errorCount++;
      donePromise.resolve(err);
    });

    const expectedResults = [{ a: 1 }, { b: 2 }];

    parser.push(JSON.stringify(expectedResults[0]));
    parser.push(JSON.stringify(expectedResults[1]));
    parser.push('error 1');
    parser.push(JSON.stringify({ unexpected: 'result' }));
    parser.push('error 2');
    await donePromise.promise;

    assert.equal(results.length, expectedResults.length);
    assert.equal(errorCount, 1);
    assert.deepEqual(expectedResults, results);
  });
});
