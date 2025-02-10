'use strict';

const { createBodyParser } = require('./bodyParser');

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

class JsonStreamParser {
  feed(chunk, onData, onDone) {
    const error = null;
    onData(error, chunk);
    onDone(error);
  }

  end(onData, onDone) {
    const error = null;
    onDone(error);
  }

  reset() {}
}

class Accumulative extends JsonStreamParser {
  #buffer = '';

  feed(chunk, onData, onDone) {
    this.#buffer += chunk;
    onDone(null);
  }

  end(onData, onDone) {
    const end = (err, res) => void (onData(err, res), onDone());
    deserialize(this.#buffer).then((res) => end(null, res), end);
    this.reset();
  }

  reset() {
    this.#buffer = '';
  }
}

class Chunked extends JsonStreamParser {
  #parser = null;

  constructor() {
    super();
    this.#parser = createBodyParser({ openBracket: '{', closeBracket: '}' });
  }

  feed(chunk, onData, onDone) {
    let isDone = false;
    const end = (err) => {
      if (!isDone) {
        isDone = true;
        onDone(err);
      }
    };

    const queue = [];
    const _resolve = (data) => onData(null, data);
    const enqueue = (data) => queue.push(deserialize(data).then(_resolve));
    const dequeue = () => Promise.all(queue).then(() => end(null), end);

    const _data = (err, data) => (err ? end(err) : enqueue(data));
    const _done = () => dequeue();
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

module.exports = { Accumulative, Chunked };
