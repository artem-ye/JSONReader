'use strict';

class AsyncQueue {
  #executor = async () => {};
  #events = null;
  #concurrency = 0;
  #running = 0;
  #queue = [];
  #canceled = false;
  #dequeueTimer = null;

  constructor(opts = {}) {
    const { concurrency, executor } = opts;
    this.#concurrency = concurrency || 25;
    this.#executor = executor;
    this.#events = {
      drain: () => {},
      error: (e) => {
        throw e;
      },
    };
  }

  push(payload) {
    const { promise, resolve } = Promise.withResolvers();

    if (this.#running < this.#concurrency) {
      this.#running++;
      this.#execute(payload, resolve);
    } else {
      this.#enqueue(payload, resolve);
    }

    return promise;
  }

  async #execute(payload, resolve) {
    try {
      if (!this.#canceled) await this.#executor(payload);
      resolve(null);
    } catch (err) {
      this.#events.error(err);
      resolve(err);
    }

    this.#running--;
    this.#dequeue();
  }

  #enqueue(payload, resolve) {
    this.#queue.push({ payload, resolve });
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
      if (!this.#canceled) this.#events.drain();
      this.#canceled = false;
    }
  }

  #dequeueTask() {
    const dequeue = () => {
      const { payload, resolve } = this.#queue.shift();
      this.#execute(payload, resolve);
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

  cancel() {
    if (this.#queue.length > 0 || this.#running > 0) this.#canceled = true;
  }

  on(event, handler) {
    this.#events[event] = handler;
  }

  off(event) {
    this.#events[event] = () => {};
  }

  _state() {
    return {
      executor: this.#executor,
      drain: this.#events.drain,
      error: this.#events.error,
      concurrency: this.#concurrency,
      running: this.#running,
      queue: this.#queue,
      canceled: this.#canceled,
    };
  }
}

module.exports = { AsyncQueue };
