'use strict';

//const assert = require('node:assert');
const { it } = require('node:test');

const { Transform } = require('node:stream');
const { Buffer } = require('node:buffer');

it('discover', { todo: true, skip: true }, () => {
  class Base extends Transform {
    constructor(child) {
      super();
      this.child = child;
      this.child.on('data', (chunk) => {
        this.push(chunk);
      });
      this.child.once('error', () => {});
    }

    _transform(chunk, encoding, cb) {
      this.child.write(chunk, (err) => {
        cb(err);
      });
    }

    _flush(cb) {
      console.log(' !!! Flushed !!!');
      this.child.end(cb);
    }

    _final(cb) {
      console.log('FINAL!!!');
      cb();
    }
  }

  class Chunked extends Transform {
    _transform(chunk, encoding, cb) {
      setTimeout(() => {
        if (chunk.toString() === 'error') {
          return cb('error');
        }
        this.push(chunk);
        this.push(chunk);
        cb();
      }, 500);
    }
  }

  class Acc extends Transform {
    buffer = [];
    _transform(chunk, encoding, cb) {
      this.buffer.push(chunk);
      cb(null);
    }

    _flush(cb) {
      setTimeout(() => {
        cb(null, Buffer.concat(this.buffer));
      }, 500);
    }
  }

  const s = new Base(new Chunked());
  s.on('data', (data) => {
    console.log(data.toString(), data[0]);
  });
  s.on('error', (err) => {
    console.log('fuck!!!', { err });
  });
  s.write('Hello');
  s.write('World');
  s.write('error');
  s.write('Yo');
  s.end();
  //s.destroy();
});
