'use strict';

const { Transform } = require('node:stream');
const ParseStream = require('./parser/parsers.js');
const { substring, slice } = require('./utils.js');
const { Maybe } = require('./lib/Maybe.js');

const parserFromChunk = (chunk, chunkedPattern) => {
  const recognizeBrackets = (openBracket) => {
    const pair = { '{': '}', '[': ']' };
    let closeBracket = pair[openBracket];
    return closeBracket === undefined ? null : { openBracket, closeBracket };
  };

  const head = substring(chunk, 0, chunkedPattern.length + 1);
  const chunked = Maybe.of(head)
    .map((v) => (v.startsWith(chunkedPattern) ? v : null))
    .map((v) => v.at(-1))
    .map(recognizeBrackets)
    .map((brackets) => ({
      parser: new ParseStream.Chunked(brackets),
      offset: chunkedPattern.length,
    }));

  return chunked.isJust
    ? chunked.join()
    : { parser: new ParseStream.Accumulative(), offset: 0 };
};

class JSONReader extends Transform {
  #transform = null;
  #parser = null;
  #chunkedPattern = '';

  // Be free to use more complex constructions in
  // chunkedPattern option.
  // For example, use this:
  //  new JSONReader({chunkedPattern: '{results:{data:['})
  // to parse array entries, from 'data' property in chunked mode
  constructor(options) {
    super({ ...options, objectMode: true });
    this.#transform = this.#selectParser;
    this.#chunkedPattern = options?.chunkedPattern || '[';
  }

  _transform(data, encoding, callback) {
    this.#transform(data, encoding, callback);
  }

  _flush(callback) {
    this.#parser.end(callback);
    this.#transform = this.#selectParser;
  }

  #selectParser(chunk, encoding, callback) {
    const { parser, offset } = parserFromChunk(chunk, this.#chunkedPattern);
    this.#parser = parser;
    this.#transform = this.#parse;

    this.#subscribe();
    this.#transform(slice(chunk, offset), encoding, callback);
  }

  #parse(chunk, encoding, done) {
    this.#parser.write(chunk, encoding, done);
  }

  async #subscribe() {
    try {
      for await (const data of this.#parser) this.push(data);
    } catch (err) {
      this.emit('error', err);
    }
  }
}

module.exports = { JSONReader };
