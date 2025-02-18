'use strict';

class BracketsCollector {
  #count = 0;
  #error = null;
  #done = false;
  #brackets = null;

  constructor({ openBracket, closeBracket }) {
    this.#brackets = { openBracket, closeBracket };
  }

  collect(data) {
    if (data === this.#brackets.openBracket) this.#increase();
    else if (data === this.#brackets.closeBracket) this.#decrease();
    else this.#fail(`Unexpected bracket ${data}`);
    return {
      done: this.#done,
      error: this.#error,
    };
  }
  reset() {
    this.#count = 0;
    this.#error = null;
    this.#done = false;
  }

  #increase() {
    this.#count++;
  }
  #decrease() {
    if (--this.#count > 0) return;
    const errored = this.#count < 0;
    errored ? this.#fail('Inconsistent brackets count') : this.#end();
  }
  #end() {
    this.#done = true;
  }
  #fail(message) {
    this.#done = true;
    this.#error = new Error(message);
  }

  get done() {
    return this.#done;
  }
  get errored() {
    return this.#error !== null;
  }
  get error() {
    return this.#error;
  }
  get count() {
    return this.#count;
  }
}

module.exports = { BracketsCollector };
