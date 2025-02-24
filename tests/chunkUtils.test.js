'use strict';

const assert = require('node:assert');
const { describe, it } = require('node:test');
const { substring, slice } = require('../src/utils');
const { Buffer } = require('node:buffer');

describe('String utils', () => {
  describe('substring', () => {
    const str = 'Test str';
    const bufStr = Buffer.from(str);

    it('case 1: end param omitted', () => {
      const start = 4;
      assert.equal(str.substring(start), substring(str, start));
      assert.equal(str.substring(start), substring(bufStr, start));
    });
    it('case 2: both params', () => {
      const start = 2;
      const end = 4;
      assert.equal(str.substring(start, end), substring(str, start, end));
      assert.equal(str.substring(start, end), substring(bufStr, start, end));
    });
  });

  describe('slice', () => {
    const str = 'Test str';
    const bufStr = Buffer.from(str);

    it('case 1: end param omitted', () => {
      const start = 4;
      assert.equal(str.slice(start), slice(str, start));
      assert.equal(str.slice(start), slice(bufStr, start));
    });
    it('case 2: both params', () => {
      const start = 2;
      const end = 4;
      assert.equal(str.slice(start, end), slice(str, start, end));
      assert.equal(str.slice(start, end), slice(bufStr, start, end));
    });
  });
});
