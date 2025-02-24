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
  // to parse array entries, from 'data' property
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
    const { error, parser, offset } = ParserFactory.fromChunk(
      chunk,
      this.#chunkedPattern
    );
    if (error) {
      callback(error);
    } else {
      parser.write(offset ? slice(chunk, offset) : chunk, encoding, callback);
      (async () => {
        for await (const data of parser) this.push(data);
      })().catch((err) => this.emit('error', err));

      this.#parser = parser;
      this.#transform = this.#passThrough;
    }
  }

  #passThrough(chunk, encoding, done) {
    this.#parser.write(chunk, encoding, done);
  }
}

class ParserFactory {
  static fromChunk(chunk, chunkedPattern = '[') {
    let parser = null;
    let offset = 0;
    let error = null;

    const head = substring(chunk, 0, chunkedPattern.length + 1);
    if (head.startsWith(chunkedPattern)) {
      const { error: err, brackets } = ParserFactory.#bracketsPair(head.at(-1));
      if (err) {
        error = new Error(`Unsupported open bracket at head of chunk: ${head}`);
      } else {
        parser = new ParseStream.Chunked(brackets);
        offset = chunkedPattern.length;
      }
    } else {
      parser = new ParseStream.Accumulative();
      offset = 0;
    }
    return { error, parser, offset };
  }

  static #bracketsPair(openBracket) {
    let closeBracket = undefined;
    let error = false;
    if (openBracket === '[') closeBracket = ']';
    else if (openBracket === '{') closeBracket = '}';
    else error = true;
    return { error, brackets: { openBracket, closeBracket } };
  }
}

module.exports = { JSONReader };
