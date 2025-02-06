'use strict';

const { Transform } = require('node:stream');
const { createBodyParser } = require('./src/bodyParser.js');

const jsonParse = (data) => {
  const parse = (resolve, reject) => {
    try {
      JSON.parse(data);
      resolve(data);
    } catch (err) {
      reject(err);
    }
  };
  return new Promise(parse);
};

class JsonParser extends Transform {
  #jsonBodyParser = null;
  #handler = null;

  constructor(...args) {
    super(...args);
    this.#handler = this.#inspectHandler.bind(this);
    this.#jsonBodyParser = createBodyParser({
      openBracket: '{',
      closeBracket: '}',
    });
  }

  #inspectHandler(data, encoding, callback) {
    const dataStr = data.toString();
    const { 0: match, index } = dataStr.match(/[\\[\\{]/) || {};

    const handlers = {
      '[': () => next(this.#parseHandler, dataStr.slice(index + 1)),
      '{': () => next(this.#passThroughHandler, data),
    };
    const next = (handler, data) => {
      this.#handler = handler.bind(this);
      this.#handler(data, encoding, callback);
    };
    match in handlers ? handlers[match]() : callback();
  }

  #passThroughHandler(data, encoding, callback) {
    callback(null, data);
  }

  #parseHandler(data, encoding, callback) {
    // TODO: cleanup code
    const _push = this.push.bind(this);
    const promises = [];
    const parseAsync = (data) =>
      void promises.push(jsonParse(data).then(_push));
    const onData = (err, data) => parseAsync(data);
    const onDone = () =>
      Promise.all(promises).then(
        () => callback(),
        (err) => callback(err)
      );
    this.#jsonBodyParser.feed(data.toString(), onData, onDone);
  }

  _transform(data, encoding, callback) {
    console.log({ chunk: data, handler: this.#handler.name });
    this.#handler(data, encoding, callback);
  }

  _flush(callback) {
    this.#handler = this.#inspectHandler.bind(this);
    callback();
  }
}

//const mainCallBack = async () => {
//  const stream = new JsonParser({ objectMode: true });
//  stream.on('data', (data) => console.log('sync', data));
//  stream.write('[{"a": 1},');
//  stream.write('{"b": 21}, {"c": 22}');
//  stream.write('"f": [\\{"x": 0\\}], {"d": 31}');
//  stream.write(', {"e" ');
//  stream.write(': 41},  {');
//  stream.write('"f": 41},  {"g": 51} ');
//};

const mainAsync = async () => {
  const stream = new JsonParser({ objectMode: true });
  stream.write('[{"a": 1},');
  stream.write('{"b": 21}, {"c": 22}');
  stream.write('"f": [\\{"x": 0\\}], {"d": 31}');
  stream.write(', {"e" ');
  stream.write(': 41},  {');
  stream.write('"f": 41},  {"g": 51} ');
  for await (const data of stream) {
    console.log('await', { data });
  }
};

mainAsync();
