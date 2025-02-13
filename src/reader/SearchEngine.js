'use strict';

const { BracketsCollector } = require('./BracketsCollector.js');

// RegExp utils
const esc = (s) => `\\${s}`;
const withLastIndex = (r, lastIndex) => ((r.lastIndex = lastIndex), r);

const SearchEngine = ({ openBracket, closeBracket }) => {
  const openBracketRe = new RegExp(`(?<!\\\\)${esc(openBracket)}`, 'g');
  const bracketRe = new RegExp(
    `(?<!\\\\)[${esc(openBracket)}${esc(closeBracket)}]`,
    'g'
  );
  const bracketsCounter = BracketsCollector({
    openBracket,
    closeBracket,
  });

  const findOpenTag = (chunk, offset) => {
    const re = withLastIndex(openBracketRe, offset);
    let lastIndex = undefined;
    const { 0: match } = re.exec(chunk) || {};
    if (match) {
      lastIndex = re.lastIndex;
      bracketsCounter.collect(match);
    }
    return { match, lastIndex };
  };

  const findCloseTag = (chunk, offset) => {
    const re = withLastIndex(bracketRe, offset);
    let res = null;
    let lastIndex = undefined;
    let error = null;
    while (isNaN(lastIndex) && (res = re.exec(chunk))) {
      bracketsCounter.collect(res[0]);
      if (bracketsCounter.done) {
        lastIndex = re.lastIndex;
        if (bracketsCounter.errored) {
          error = new Error('Inconsistent brackets count');
        }
      }
    }
    return { lastIndex, error };
  };

  return {
    findOpenTag,
    findCloseTag,
    reset: () => bracketsCounter.reset(),
  };
};

module.exports = { SearchEngine };
