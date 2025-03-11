'use strict';

const { EventEmitter } = require('node:events');

class AsyncQueue extends EventEmitter {
  #executor = async () => {};
  #concurrency = 0;
  #running = 0;
  #queue = [];
  #canceled = false;
  #dequeueTimer = null;

  constructor(opts = {}) {
    super();
    const { concurrency, executor } = opts;
    this.#concurrency = concurrency;
    this.#executor = executor;
  }

  push(payload) {
    const { promise, resolve, reject } = Promise.withResolvers();

    if (this.#running < this.#concurrency) {
      this.#running++;
      this.#execute(payload, resolve, reject);
    } else {
      this.#enqueue(payload, resolve, reject);
    }

    return promise;
  }

  async #execute(payload, resolve, reject) {
    try {
      if (!this.#canceled) await this.#executor(payload);
      resolve(null);
    } catch (err) {
      this.#error(err, resolve, reject);
    }

    this.#running--;
    this.#dequeue();
  }

  #enqueue(payload, resolve, reject) {
    this.#queue.push({ payload, resolve, reject });
  }

  #dequeue() {
    const runnable = this.#running < this.#concurrency;
    const queued = this.#queue.length > 0;
    const scheduled = this.#dequeueTimer !== null;
    if (runnable && queued && !scheduled) {
      this.#running++;
      this.#dequeueTimer = setTimeout(this.#dequeueTask(), 0);
    }

    if (this.#queue.length === 0 && this.#running === 0) {
      if (!this.#canceled) this.#drain();
      this.#canceled = false;
    }
  }

  #dequeueTask() {
    const dequeue = () => {
      const { payload, resolve, reject } = this.#queue.shift();
      this.#execute(payload, resolve, reject);
    };

    const task = async () => {
      this.#dequeueTimer = null;
      dequeue();
      while (this.#concurrency < this.#running && this.#queue.length) {
        this.#running++;
        dequeue();
      }
    };
    return task;
  }

  #drain() {
    this.emit('drain', null);
  }

  #error(err, resolve, reject) {
    if (this.listenerCount('error') !== 0) {
      resolve(err);
      this.emit('error', err);
    } else {
      reject(err);
    }
  }

  cancel() {
    if (this.#queue.length > 0 || this.#running > 0) this.#canceled = true;
  }

  _state() {
    return {
      executor: this.#executor,
      concurrency: this.#concurrency,
      running: this.#running,
      queue: this.#queue,
      canceled: this.#canceled,
    };
  }
}

module.exports = { AsyncQueue };
