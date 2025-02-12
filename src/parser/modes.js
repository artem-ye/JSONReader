'use strict';

const { TagReader } = require('../reader/TagReader.js');
const { deserialize, NaiveQueue } = require('./utils.js');

class BaseMode {
  feed(chunk, onData, onDone) {
    const error = null;
    onData(chunk);
    onDone(error);
  }
  end(callback) {
    const error = null;
    const data = null;
    callback(error, data);
  }
  reset() {}
}

class Accumulative extends BaseMode {
  #buffer = '';

  feed(chunk, onData, onDone) {
    this.#buffer += chunk;
    onDone(null);
  }
  end(callback) {
    deserialize(this.#buffer).then((res) => callback(null, res), callback);
    this.reset();
  }
  reset() {
    this.#buffer = '';
  }
}

class Chunked extends BaseMode {
  #reader = null;
  #parseQueue = null;

  constructor() {
    super();
    this.#reader = TagReader({ openBracket: '{', closeBracket: '}' });
    this.#parseQueue = ParseQueue();
  }

  feed(chunk, onData, onDone) {
    const parseQueue = this.#parseQueue;
    let pending = true;

    const end = (err) => {
      if (!pending) return;
      pending = false;
      parseQueue.clear();
      onDone(err);
    };

    const parse = (err, data) => {
      if (err) return void end(err);
      const resolve = (result) => void (pending && onData(result));
      parseQueue.enqueue(data, resolve);
    };
    const resolve = () => {
      if (!pending) return;
      const resolve = () => end(null);
      parseQueue.resolve(resolve, end);
    };
    this.#reader.feed(chunk, parse, resolve);
  }

  end(callback) {
    callback(null);
    this.reset();
  }

  reset() {
    this.#reader.reset();
    this.#parseQueue.clear();
  }
}

const ParseQueue = () => {
  const queue = NaiveQueue();
  return {
    enqueue: (data, resolve) => {
      queue.enqueue(deserialize(data).then(resolve));
    },
    resolve: (resolve, reject) => {
      queue.dequeue().then(resolve, reject);
    },
    clear: () => {
      queue.clear();
    },
  };
};

module.exports = { Accumulative, Chunked };
