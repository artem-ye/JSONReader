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

  constructor(opts) {
    super({ ...opts, objectMode: true });
    const { openBracket = '{', closeBracket = '}' } = opts;
    this.#reader = new TagReader({ openBracket, closeBracket });
    this.#parser = new Deserializer({ concurrency: 15 });
  }

  _flush(callback) {
    this.reset();
    callback(null);
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

    const parser = this.#parser;
    parser.onDone = (err) => end(err);
    parser.onData = (data) => (this.push(data), processing--);

    const data = (err, res) => {
      if (err) return void end(err);
      processing++;
      parser.parse(res);
    };
    this.#reader.feed(chunk, data, end);
  }

  reset() {
    this.#reader.reset();
    this.#parser.cancel();
  }
}

module.exports = { Accumulative, Chunked };
