'use strict';

const { Transform } = require('node:stream');
const Parser = require('./parser/Parsers.js');
const { substring, slice } = require('./lib/stringUtils.js');

class JSONReader extends Transform {
  #transform = null;
  #parser = null;
  #parserSelector = null;
  #listener = (data) => this.push(data);

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
    this.#reset();
  }

  #selectParser(chunk, encoding, callback) {
    const { parser, offset } = this.#parserSelector.fromChunk(chunk);
    this.#parser = parser;
    this.#transform = this.#parse;

    this.#subscribe();
    parser.write(slice(chunk, offset), encoding, callback);
  }

  #parse(chunk, encoding, done) {
    this.#parser.write(chunk, encoding, done);
  }

  #subscribe() {
    this.#parser.on('data', (data) => this.#listener(data));
    this.#parser.once('end', () => this.#unsubscribe());
    this.#parser.once('error', () => {
      this.#unsubscribe();
      this.#reset();
    });
  }

  #unsubscribe() {
    this.#parser.off('data', this.#listener);
  }

  #reset() {
    this.#transform = this.#selectParser;
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
