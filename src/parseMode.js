'use strict';

const { createBodyParser } = require('./bodyParser');

class BaseMode {
  feed(chunk, onData, onDone) {
    const error = null;
    onData(chunk);
    onDone(error);
  }

  end(onData, onDone) {
    const error = null;
    onDone(error);
  }

  reset() {}
}

class Accumulative extends BaseMode {
  #buffer = '';

  feed(chunk, onData, onDone) {
    this.#buffer += chunk;
    onDone(null);
  }

  end(onData, onDone) {
    const resolve = (data) => {
      onData(data);
      onDone(null);
    };
    const reject = (err) => onDone(err);
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
    this.#parser = createBodyParser({ openBracket: '{', closeBracket: '}' });
    this.#queue = AsyncQueue();
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

  end(onData, onDone) {
    onDone(null);
    this.reset();
  }

  reset() {
    this.#parser.reset();
  }
}

const AsyncQueue = () => {
  const queue = [];
  return {
    enqueue: (promise) => queue.push(promise),
    clear: () => (queue.fill(undefined), (queue.length = 0)),
    dequeue: () => Promise.all(queue),
  };
};

const deserialize = (data) => {
  const parse = (resolve, reject) => {
    try {
      JSON.parse(data);
      resolve(data);
    } catch (err) {
      reject(err);
    }
  };
  const parseAsync = (resolve, reject) => setTimeout(parse, 0, resolve, reject);
  return new Promise(parseAsync);
};

module.exports = { Accumulative, Chunked };
