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
    const resolve = (data) => callback(null, data);
    const reject = (err) => callback(err);
    deserialize(this.#buffer).then(resolve, reject);
    this.reset();
  }

  reset() {
    this.#buffer = '';
  }
}

class Chunked extends BaseMode {
  #parser = null;
  #queue = null;

  constructor() {
    super();
    this.#parser = TagReader({ openBracket: '{', closeBracket: '}' });
    this.#queue = NaiveQueue();
  }

  feed(chunk, onData, onDone) {
    let pending = true;
    const end = (err) => {
      if (pending) {
        pending = false;
        queue.clear();
        onDone(err);
      }
    };

    const emit = {
      data: (data) => void (pending && onData(data)),
      error: (err) => end(err),
      success: () => end(null),
    };
    const queue = this.#queue;
    const enqueue = (str) => queue.enqueue(deserialize(str).then(emit.data));
    const dequeue = () => queue.dequeue().then(emit.success, emit.error);

    const _data = (err, result) => void (err ? end(err) : enqueue(result));
    const _done = () => void (pending && dequeue());
    this.#parser.feed(chunk, _data, _done);
  }

  end(callback) {
    callback(null);
    this.reset();
  }

  reset() {
    this.#parser.reset();
  }
}

module.exports = { Accumulative, Chunked };
