'use strict';

const { Transform } = require('node:stream');
const { TagReader } = require('../reader/TagReader.js');
const { deserialize, NaiveQueue } = require('./utils.js');

class Accumulative extends Transform {
  #buffer = '';

  _transform(chunk, encoding, cb) {
    this.#buffer += chunk;
    cb(null);
  }

  _flush(cb) {
    const success = (res) => cb(null, res);
    deserialize(this.#buffer).then(success, cb).finally(this.reset);
  }

  reset() {
    this.#buffer = '';
  }
}

class Chunked extends Transform {
  #reader = null;
  #parseQueue = null;

  constructor(...args) {
    super(...args);
    this.#reader = new TagReader({ openBracket: '{', closeBracket: '}' });
    this.#parseQueue = parseQueue();
  }

  _transform(chunk, encoding, cb) {
    const parseQueue = this.#parseQueue;
    let pending = true;

    const end = (err) => {
      if (!pending) return;
      pending = false;
      // if (err) this.reset();
      cb(err);
    };

    // TODO: need cancelable async queue
    const onData = (err, data) => {
      if (err) {
        end(err);
      } else {
        const resolve = (res) => void (pending && this.push(res));
        parseQueue.enqueue(data, resolve);
      }
    };
    const onDone = (err) => {
      if (!pending) return;
      if (err) {
        end(err);
      } else {
        const resolve = () => end(null);
        parseQueue.resolve(resolve, end);
      }
    };
    this.#reader.feed(chunk, onData, onDone);
  }

  _flush(callback) {
    this.reset();
    callback(null);
  }

  reset() {
    this.#reader.reset();
    this.#parseQueue.clear();
  }
}

const parseQueue = () => {
  const queue = NaiveQueue();
  return {
    enqueue: (data, resolve) => {
      queue.enqueue(deserialize(data).then(resolve));
    },
    resolve: (resolve, reject) => {
      queue
        .dequeue()
        .then(resolve, reject)
        .finally(() => queue.clear());
    },
    clear: () => {
      queue.clear();
    },
  };
};

module.exports = { Accumulative, Chunked };
