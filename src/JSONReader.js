'use strict';

const { Transform } = require('node:stream');
const Parser = require('./parser/parsers.js');
const { substring, slice } = require('./utils.js');

class JSONReader extends Transform {
  #transform = null;
  #parser = null;
  #parserSelector = null;

  // Be free to use more complex constructions in
  // chunkedPattern option.
  // For example, use this:
  //  new JSONReader({chunkedPattern: '{results:{data:['})
  // to parse array entries, from 'data' property in chunked mode
  constructor(options) {
    super({ ...options, objectMode: true });
    this.#transform = this.#selectParser;
    this.#parserSelector = new ParserSelector(options?.chunkedPattern || '[');
  }

  _transform(data, encoding, callback) {
    this.#transform(data, encoding, callback);
  }

  _flush(callback) {
    this.#parser.end(callback);
    this.#transform = this.#selectParser;
  }

  #selectParser(chunk, encoding, callback) {
    const { parser, offset } = this.#parserSelector.fromChunk(chunk);
    this.#parser = parser;
    this.#transform = this.#parse;

    this.#listen();
    parser.write(slice(chunk, offset), encoding, callback);
  }

  #parse(chunk, encoding, done) {
    this.#parser.write(chunk, encoding, done);
  }

  async #listen() {
    try {
      for await (const data of this.#parser) this.push(data);
    } catch (err) {
      this.emit('error', err);
    }
  }
}

class ParserSelector {
  constructor(chunkedPattern) {
    this.chunkedPattern = chunkedPattern;
  }

  fromChunk(chunk) {
    return this.#chunked(chunk) || this.#accumulative();
  }

  #accumulative() {
    return {
      parser: new Parser.Accumulative(),
      offset: 0,
    };
  }

  #chunked(chunk) {
    const chunkedPattern = this.chunkedPattern;
    let parser = null;

    const head = substring(chunk, 0, chunkedPattern.length + 1);
    if (head.startsWith(chunkedPattern)) {
      const brackets = this.#recognizeBrackets(head.at(-1));
      if (brackets) parser = new Parser.Chunked(brackets);
    }

    return parser ? { parser, offset: chunkedPattern.length } : null;
  }

  #recognizeBrackets(openBracket) {
    const pair = { '{': '}', '[': ']' };
    const closeBracket = pair[openBracket];
    return closeBracket ? { openBracket, closeBracket } : null;
  }
}

module.exports = { JSONReader };
