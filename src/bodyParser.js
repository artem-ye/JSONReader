'use strict';

const { createSearchEngine } = require('./searchEngine.js');

const machine = ({ openBracket, closeBracket }) => {
  let chunk = '';
  let chunkOffset = 0;
  let buffer = '';
  let state = null;
  let onDone = null;
  let onData = null;
  const setState = (newState) => void (state = newState);
  const next = () => state();
  const setCallBacks = (data, done) => void ((onDone = done), (onData = data));

  const parser = createSearchEngine({ openBracket, closeBracket });

  const states = {
    newChunk: (newChunk, onData, onDone) => {
      chunk = newChunk;
      chunkOffset = 0;
      setCallBacks(onData, onDone);
      next();
    },
    inspect: () => {
      const { lastIndex, match } = parser.findOpenTag(chunk, chunkOffset);
      if (isNaN(lastIndex)) {
        states.endOfChunk();
      } else {
        buffer += match;
        chunkOffset = lastIndex;
        setState(states.collect);
        next();
      }
    },
    collect: () => {
      const { lastIndex, error } = parser.findCloseTag(chunk, chunkOffset);
      if (lastIndex === undefined) {
        buffer += chunk.slice(chunkOffset);
        states.endOfChunk();
      } else {
        buffer += chunk.slice(chunkOffset, lastIndex);
        chunkOffset = lastIndex;
        states.collected(error);
      }
    },
    collected: (error) => {
      onData(error, buffer);
      buffer = '';
      setState(states.inspect);
      next();
    },
    endOfChunk: () => {
      onDone();
      setCallBacks(null, null);
    },
    reset: () => {
      this.buffer = '';
      setCallBacks(null, null);
      parser.reset();
    },
  };

  state = states.inspect;
  return {
    feed: states.newChunk,
    reset: states.reset,
  };
};

module.exports = { createBodyParser: machine };
