'use strict';

const { Transform } = require('node:stream');
const Parser = require('./parser/Parsers.js');
const { substring, slice } = require('./lib/stringUtils.js');

class JSONReader extends Transform {
  #transform = this.#selectParser;
  #parser = null;
  #parserSelector = null;

  // Be free to use more complex constructions in
  // chunkedPattern option.
  // For example, use this:
  //  new JSONReader({chunkedPattern: '{results:{data:['})
  // to parse array entries, from 'data' property in chunked mode
  constructor(options = {}) {
    const { chunkedPattern = '[', concurrency = 15, ...rest } = options;
    super({ ...rest, objectMode: true });
    this.#parserSelector = new ParserSelector({ concurrency, chunkedPattern });
  }

  _transform(data, encoding, callback) {
    this.#transform(data, encoding, callback);
  }

  #selectParser(chunk, encoding, callback) {
    const { parser, offset } = this.#parserSelector.fromChunk(chunk);
    parser.on('data', (data) => this.push(data));
    parser.once('error', (err) => this.emit(err));

    this.#parser = parser;
    this.#transform = this.#parse;
    this.#transform(slice(chunk, offset), encoding, callback);
  }

  #parse(chunk, encoding, done) {
    this.#parser.write(chunk, encoding, done);
  }

  _flush(callback) {
    this.#parser.end(callback);
  }
}

class ParserSelector {
  constructor({ chunkedPattern, concurrency }) {
    this.chunkedPattern = chunkedPattern;
    this.concurrency = concurrency;
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
    const concurrency = this.concurrency;
    let parser = null;

    const head = substring(chunk, 0, chunkedPattern.length + 1);
    if (head.startsWith(chunkedPattern)) {
      const brackets = this.#recognizeBrackets(head.at(-1));
      if (brackets) parser = new Parser.Chunked({ brackets, concurrency });
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
