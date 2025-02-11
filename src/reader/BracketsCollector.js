'use strict';

const createCounter = (cb) => {
  let value = 0;
  const _interface = {
    get value() {
      return value;
    },
    reset: () => void (value = 0),
    inc: () => void value++,
    dec: () => {
      if (--value < 1) cb(value < 0);
    },
  };
  return _interface;
};

const BracketsCollector = ({ openBracket, closeBracket }) => {
  let done = false;
  let error = false;
  let state = null;
  const setState = (newState) => void (state = newState);

  const counter = createCounter((err) => end(err));
  const processor = {
    [openBracket]: () => counter.inc(),
    [closeBracket]: () => counter.dec(),
  };

  const collect = (chunk) => state(chunk);

  const end = (isError) => {
    done = true;
    error = isError;
    setState(resetState);
  };

  const reset = () => {
    done = false;
    error = false;
    counter.reset();
    setState(collectState);
  };

  const collectState = (chunk) => {
    if (chunk in processor) processor[chunk]();
  };

  const resetState = (chunk) => {
    reset();
    state(chunk);
  };

  state = collectState;
  // prettier-ignore
  return {
    collect,
    reset,
    get errored() { return error; },
    get done() { return done; },
    state: () => ({ done: done, errored: error, count: counter.value }),
  };
};

module.exports = { BracketsCollector: BracketsCollector };
