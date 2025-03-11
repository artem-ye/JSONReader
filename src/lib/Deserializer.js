'use strict';

const { AsyncQueue } = require('./AsyncQueue.js');
const { EventEmitter } = require('node:events');

const deserialize = (data) => {
  const parse = (resolve, reject) => {
    try {
      const obj = JSON.parse(data);
      resolve(obj);
    } catch (err) {
      reject(err);
    }
  };
  const parseAsync = (resolve, reject) => setTimeout(parse, 0, resolve, reject);
  return new Promise(parseAsync);
};

class Deserializer extends EventEmitter {
  #queue = null;
  #errored = false;
  lastError = null;

  constructor({ concurrency }) {
    super();

    const executor = async (data) => {
      return deserialize(data).then((res) => !this.#errored && this.#data(res));
    };

    this.#queue = new AsyncQueue({ concurrency, executor });
    this.#queue.on('error', (e) => this.#error(e));
    this.#queue.on('drain', () => this.#drain());
  }

  push(data) {
    this.#queue.push(data);
  }

  cancel() {
    this.#queue.cancel();
  }

  #error(e) {
    this.#errored = true;
    this.lastError = e;
    this.#queue.cancel();

    const handler = () => {
      this.#done(e);
      this.#errored = false;
    };
    setTimeout(handler, 0);
  }

  #drain() {
    this.#done(null);
  }

  #data(data) {
    this.emit('data', data);
  }

  #done(err) {
    this.emit('done', err);
  }
}

module.exports = { Deserializer, deserialize };
