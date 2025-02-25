'use strict';

const { Buffer } = require('node:buffer');
const { Transform } = require('node:stream');
const { TagReader } = require('../reader/TagReader.js');
const { deserialize, NaiveQueue } = require('./utils.js');

class Accumulative extends Transform {
  #buffer = [];

  constructor(opts) {
    super({ ...opts, objectMode: true });
  }

  _transform(chunk, encoding, cb) {
    this.#buffer.push(chunk);
    cb(null);
  }

  _flush(cb) {
    const data = Buffer.concat(this.#buffer);
    const success = (res) => cb(null, res);
    const end = () => this.reset();
    deserialize(data).then(success, cb).finally(end);
  }

  reset() {
    this.#buffer = [];
  }
}

class Chunked extends Transform {
  #reader = null;
  #parseQueue = null;

  constructor(opts) {
    super({ ...opts, objectMode: true });
    const { openBracket = '{', closeBracket = '}' } = opts;
    this.#reader = new TagReader({ openBracket, closeBracket });
    this.#parseQueue = new ParseQueue();
  }

  _flush(callback) {
    this.reset();
    callback(null);
  }

  _transform(chunk, encoding, callback) {
    let pending = true;
    const end = (err) => {
      if (!pending) return;
      pending = false;
      if (err) this.reset();
      callback(err);
    };

    const queue = this.#parseQueue;
    const parse = () => void (pending && queue.dequeue(end));
    const receive = (data) => void (pending && this.push(data));

    const onDone = (err) => (err ? end(err) : parse());
    const onData = (err, res) => (err ? end(err) : queue.enqueue(res, receive));
    this.#reader.feed(chunk, onData, onDone);
  }

  reset() {
    this.#reader.reset();
    this.#parseQueue.clear();
  }
}

class ParseQueue {
  constructor() {
    this.queue = NaiveQueue();
  }
  enqueue(data, resolve) {
    this.queue.enqueue(deserialize(data).then(resolve));
  }
  dequeue(cb) {
    this.queue
      .dequeue()
      .then(() => cb(null), cb)
      .finally(() => this.clear());
  }
  clear() {
    this.queue.clear();
  }
}

module.exports = { Accumulative, Chunked };
