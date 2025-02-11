'use strict';

const { Transform } = require('node:stream');
const ParseMode = require('./parser/modes.js');

//const curry = (f) => { }

class JSONReader extends Transform {
  #state = null;
  #parser = null;

  constructor(...args) {
    super(...args);
    this.#setState(this.#inspectState);
  }

  _transform(data, encoding, callback) {
    this.#state(data, encoding, callback);
  }

  _flush(callback) {
    this.#end(callback);
  }

  #setState(state) {
    this.#state = state;
  }

  #inspectState(chunk, encoding, callback) {
    const mode = {
      '[': () => mode._use(ParseMode.Chunked, chunk.slice(index + 1)),
      '{': () => mode._use(ParseMode.Accumulative, chunk),
      _use: (Parser, data) => {
        this.#parser = new Parser();
        this.#setState(this.#parseState);
        this.#state(data, encoding, callback);
      },
    };

    const { 0: match, index } = chunk.match(/[\\[\\{]/) || {};
    match in mode ? mode[match]() : callback(new Error('Wrong data format'));
  }

  #parseState(chunk, encoding, done) {
    const onData = (result) => void this.push(result);
    this.#parser.feed(chunk, onData, done);
  }

  #end(callback) {
    this.#parser.end(callback);
    this.#setState(this.#inspectState);
  }
}
/*
const main = () => {
  const stream = new JsonParser({ objectMode: true });
  stream.on('error', () => {
    console.log('Oops');
  });
  stream.write('[{"a": 1},');
  stream.write('{"b": 21}, {"c": 22}');
  stream.write('"f": [\\{"x": 0\\}], {"d": 31}');
  stream.write(', {"e" ');
  stream.write(': 41},  {');
  stream.write('"f": 41},  {"g": 51} ');
  stream.end();

  const iterate = async () => {
    for await (const data of stream) {
      console.log('await', { data });
    }
  };

  iterate().catch((e) => console.log('Eah!!!', e.message));
};

main();
*/

module.exports = { JSONReader };
