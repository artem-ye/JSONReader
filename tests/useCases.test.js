const assert = require('node:assert');
const { it, describe } = require('node:test');
const { JSONReader } = require('../src/JSONReader.js');
const { Buffer } = require('node:buffer');

describe('Accumulative test', { skip: false }, () => {
  it('Buffer', async () => {
    const reader = new JSONReader();
    const obj = { foo: 'bar' };
    const buf = Buffer.from(JSON.stringify(obj));
    reader.write(buf);
    reader.end();

    let i = 0;
    for await (const res of reader) {
      assert.deepEqual(res, obj);
      i++;
    }
    assert.equal(i, 1);
  });

  it('Call backs', { skip: false }, async () => {
    const reader = new JSONReader();
    const obj = {
      x: { a: 1 },
      y: 2,
    };
    const json = JSON.stringify(obj);

    let results = [];
    reader.on('data', (data) => results.push(data));

    const promise = new Promise((resolve, reject) => {
      reader.on('error', reject);
      reader.on('end', resolve);

      const index = json.indexOf(',');
      reader.write(Buffer.from(json.slice(0, index)));
      reader.write(Buffer.from(json.slice(index)));
      reader.end();
    });

    await promise.catch((err) => assert.fail(err));
    assert.equal(results.length, 1);
    assert.deepEqual(results[0], obj);
  });

  it('Error handling', { skip: false }, async () => {
    const reader = new JSONReader();
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

describe('Chunked', { skip: false }, () => {
  it('Strings, For await', async () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };

    const reader = new JSONReader();
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

  it('Buffers, For await', async () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };

    const write = (s) => reader.write(Buffer.from(s));

    const reader = new JSONReader();
    write('[' + JSON.stringify(obj1) + ',');
    write(JSON.stringify(obj2));
    write(']');
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
