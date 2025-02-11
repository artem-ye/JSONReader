'use strict';

const NaiveQueue = () => {
  const queue = [];
  return {
    enqueue: (promise) => queue.push(promise),
    clear: () => (queue.fill(undefined), (queue.length = 0)),
    dequeue: () => Promise.all(queue),
  };
};

const deserialize = (data) => {
  const parse = (resolve, reject) => {
    try {
      const obj = JSON.parse(data);
      resolve(obj);
    } catch (err) {
      reject(err);
    }
  };
  const parseAsync = (resolve, reject) => setTimeout(parse, 0, resolve, reject);
  return new Promise(parseAsync);
};

module.exports = { NaiveQueue, deserialize };
