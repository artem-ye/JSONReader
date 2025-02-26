'use strict';

const { Transform } = require('node:stream');
const ParseStream = require('./parser/parsers.js');
const { substring, slice } = require('./utils.js');

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
    const { parser, offset } = ParserFactory.fromChunk(
      chunk,
      this.#chunkedPattern
    );
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

class ParserFactory {
  static fromChunk(chunk, chunkedPattern) {
    let parser = null;
    let offset = 0;

    const head = substring(chunk, 0, chunkedPattern.length + 1);
    if (head.startsWith(chunkedPattern)) {
      const { error, brackets } = ParserFactory.#recognizeBrackets(head.at(-1));
      if (!error) {
        parser = new ParseStream.Chunked(brackets);
        offset = chunkedPattern.length;
      }
    }

    if (parser === null) {
      parser = new ParseStream.Accumulative();
      offset = 0;
    }
    return { parser, offset };
  }

  static #recognizeBrackets(openBracket) {
    let closeBracket = undefined;
    let error = false;
    if (openBracket === '[') closeBracket = ']';
    else if (openBracket === '{') closeBracket = '}';
    else error = true;
    return { error, brackets: { openBracket, closeBracket } };
  }
}

module.exports = { JSONReader };
