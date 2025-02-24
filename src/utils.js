'use strict';

const { Buffer } = require('node:buffer');

const isBuffer = (something) => Buffer.isBuffer(something);

const substring = (data, start, end) =>
  isBuffer(data)
    ? data.subarray(start, end).toString()
    : data.substring(start, end);

const slice = (data, start, end) =>
  isBuffer(data) ? data.subarray(start, end) : data.slice(start, end);

const stringUtils = {
  substring,
  slice,
};

module.exports = stringUtils;
