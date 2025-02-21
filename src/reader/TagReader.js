'use strict';

const { SearchEngine } = require('./SearchEngine.js');

class TagReader {
  #chunk = '';
  #chunkOffset = 0;
  #buffer = '';
  #search = null;
  #feed = null;
  #onDone = null;
  #onData = null;

  constructor({ openBracket, closeBracket }) {
    this.#search = new SearchEngine({ openBracket, closeBracket });
    this.#feed = this.#findStart;
  }

  feed(chunk, onData, onDone) {
    this.#chunk = chunk;
    this.#chunkOffset = 0;
    this.#setCallbacks(onData, onDone);
    this.#feed();
  }
  reset() {
    this.#buffer = '';
    this.#setCallbacks(null, null);
    this.#search.reset();
    this.#feed = this.#findStart;
  }

  #findStart() {
    const res = this.#search.findOpenTag(this.#chunk, this.#chunkOffset);
    const { lastIndex, match, error } = res;
    if (lastIndex === undefined) {
      this.#done(error);
    } else {
      this.#buffer += match;
      this.#chunkOffset = lastIndex;
      this.#next(this.#findEnd);
    }
  }
  #findEnd() {
    const res = this.#search.findCloseTag(this.#chunk, this.#chunkOffset);
    const { lastIndex, error } = res;
    if (lastIndex === undefined) {
      this.#buffer += this.#chunk.slice(this.#chunkOffset);
      this.#done(error);
    } else {
      this.#buffer += this.#chunk.slice(this.#chunkOffset, lastIndex);
      this.#chunkOffset = lastIndex;

      this.#onData(error, this.#buffer);
      this.#buffer = '';
      this.#next(this.#findStart);
    }
  }

  #done(error) {
    this.#onDone(error);
    this.#setCallbacks(null, null);
  }
  #next(handler) {
    this.#feed = handler;
    this.#feed();
  }
  #setCallbacks(onData, onDone) {
    this.#onData = onData;
    this.#onDone = onDone;
  }
}

module.exports = { TagReader };
