'use strict';

const DEFAULTS = {
  openBracket: '{',
  closeBracket: '}',
};

const createBracketsCollector = ({ openBracket, closeBracket } = DEFAULTS) => {
  let count = 0;
  let isDone = false;
  let state = null;
  const setState = (newState) => void (state = newState);
  const processor = {
    [openBracket]: () => void ++count,
    [closeBracket]: () => void (--count === 0 && done()),
  };

  const feed = (chunk) => state(chunk);

  const reset = () => {
    isDone = false;
    count = 0;
    setState(collectState);
  };

  const done = () => {
    isDone = true;
    setState(resetState);
  };

  const collectState = (chunk) => {
    if (chunk in processor) processor[chunk]();
  };

  const resetState = (chunk) => {
    reset();
    state(chunk);
  };

  state = collectState;
  return {
    collect: feed,
    reset,
    isDone: () => isDone,
    state: () => ({ isDone, count }),
  };
};

module.exports = { createBracketsCollector };
