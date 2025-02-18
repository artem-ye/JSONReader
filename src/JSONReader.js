'use strict';

const { Transform } = require('node:stream');
const ParseStream = require('./parser/parsers.js');

// Be free to use more complex constructions in
// chunkedPattern param.
// Something like this: '{results:{data:['
const selectParser = (chunk, chunkedPattern = '[') => {
  let Parser = null;
  let offset = 0;

  if (chunk.startsWith(chunkedPattern)) {
    Parser = ParseStream.Chunked;
    offset = chunkedPattern.length;
  } else {
    Parser = ParseStream.Accumulative;
    offset = 0;
  }
  return { Parser, offset };
};

class JSONReader extends Transform {
  #transform = null;
  #parser = null;

  constructor(...args) {
    super(...args);
    this.#transform = this.#selectParser;
  }

  _transform(data, encoding, callback) {
    this.#transform(data, encoding, callback);
  }

  _flush(callback) {
    this.#parser.end(callback);
    this.#transform = this.#selectParser;
  }

  #selectParser(chunk, encoding, callback) {
    const { Parser, offset } = selectParser(chunk);
    const parser = new Parser({ objectMode: true });

    const listen = async () => {
      for await (const data of parser) this.push(data);
    };
    listen().catch((err) => this.emit('error', err));

    this.#parser = parser;
    this.#transform = this.#passThrough;
    this.#transform(chunk.slice(offset), encoding, callback);
  }

  #passThrough(chunk, encoding, done) {
    this.#parser.write(chunk, encoding, done);
  }
}

module.exports = { JSONReader };
