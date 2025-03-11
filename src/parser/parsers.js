'use strict';

const { Buffer } = require('node:buffer');
const { Transform } = require('node:stream');
const { TagReader } = require('../reader/TagReader.js');
const { Deserializer, deserialize } = require('../lib/Deserializer.js');

class Accumulative extends Transform {
  #buffer = [];

  constructor(opts) {
    super({ ...opts, objectMode: true });
  }

  _transform(chunk, encoding, cb) {
    this.#buffer.push(chunk);
    cb(null);
  }

  _flush(cb) {
    const data = Buffer.concat(this.#buffer);
    const success = (res) => cb(null, res);
    const end = () => this.reset();
    deserialize(data).then(success, cb).finally(end);
  }

  reset() {
    this.#buffer = [];
  }
}

class Chunked extends Transform {
  #reader = null;
  #parser = null;
  #parseHandlers = {
    done: null,
    data: null,
  };

  constructor({ concurrency, brackets }) {
    super({ objectMode: true });
    this.#reader = new TagReader(brackets);
    this.#parser = new Deserializer({ concurrency });
    this.#parser.on('data', (data) => this.#parseHandlers.data(data));
    this.#parser.on('done', (err) => this.#parseHandlers.done(err));
  }

  _transform(chunk, encoding, callback) {
    let processing = 0;
    let pending = true;

    const end = (err) => {
      if (!pending) return;
      if (err || processing === 0) {
        pending = false;
        if (err) this.reset();
        callback(err);
      }
    };

    const parse = (err, res) => {
      if (err) end(err);
      else {
        processing++;
        this.#parser.push(res);
      }
    };

    this.#parseHandlers.done = (err) => end(err);
    this.#parseHandlers.data = (data) => (this.push(data), processing--);
    this.#reader.feed(chunk, parse, end);
  }

  _flush(callback) {
    this.reset();
    callback(null);
  }

  reset() {
    this.#parseHandlers.done = null;
    this.#parseHandlers.data = null;
    this.#reader.reset();
    this.#parser.cancel();
  }
}

module.exports = { Accumulative, Chunked };
