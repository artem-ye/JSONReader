const assert = require('node:assert');
const { it, describe } = require('node:test');
const { JSONReader } = require('../src/JSONReader.js');

describe('Accumulative test', () => {
  it('Call backs', async () => {
    const reader = new JSONReader({ objectMode: true });
    const obj = {
      x: { a: 1 },
      y: 2,
    };
    const json = JSON.stringify(obj);

    let results = [];
    reader.on('data', (data) => results.push(data));

    const promise = new Promise((resolve, reject) => {
      reader.on('end', resolve);
      reader.on('error', reject);

      const index = json.indexOf(',');
      reader.write(json.slice(0, index));
      reader.write(json.slice(index));
      reader.end();
    });

    await promise.catch((err) => assert.fail(err));
    assert.equal(results.length, 1);
    assert.deepEqual(results[0], obj);
  });

  it('Error handling', async () => {
    const reader = new JSONReader({ objectMode: true });
    const obj = {
      x: { a: 1 },
      y: 2,
    };
    const json = JSON.stringify(obj);

    const errors = [];
    reader.on('data', () => assert.fail('Unexpected data'));

    const promise = new Promise((resolve) => {
      reader.on('end', resolve);
      reader.on('error', (err) => resolve(errors.push(err)));
      reader.write(json);
      reader.write('inconsistent data');
      reader.end();
    });

    await promise;
    assert.equal(errors.length, 1);
  });
});

describe('Chunked', () => {
  it('For await', async () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };

    const reader = new JSONReader({ objectMode: true });
    reader.write('[' + JSON.stringify(obj1) + ',');
    reader.write(JSON.stringify(obj2));
    reader.write(']');
    reader.end();

    const results = [];
    for await (const data of reader) {
      results.push(data);
    }

    assert.strictEqual(results.length, 2);
    assert.deepEqual(results[0], obj1);
    assert.deepEqual(results[1], obj2);
  });
});
