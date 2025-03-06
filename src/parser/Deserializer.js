'use strict';

const { AsyncQueue } = require('../lib/AsyncQueue.js');

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

class Deserializer {
  #queue = null;
  #errored = false;
  lastError = null;
  onData = null;
  onDone = null;

  constructor({ concurrency }) {
    const executor = async (data) =>
      deserialize(data).then((res) => !this.#errored && this.#data(res));

    this.#queue = new AsyncQueue({ concurrency, executor });
    this.#queue.on('error', (e) => this.#error(e));
    this.#queue.on('drain', () => this.#drain());
  }

  parse(data) {
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
    this.#done();
  }

  #data(data) {
    this.onData(data);
  }

  #done(err) {
    this.onDone(err);
  }
}

module.exports = { Deserializer, deserialize };
