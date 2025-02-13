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
  const bracketsCounter = new BracketsCollector({
    openBracket,
    closeBracket,
  });

  const findOpenTag = (chunk, offset) => {
    const re = withLastIndex(openBracketRe, offset);
    const { 0: match } = re.exec(chunk) || {};
    let lastIndex = undefined;
    if (match) {
      lastIndex = re.lastIndex;
      bracketsCounter.collect(match);
    }
    return { match, lastIndex };
  };

  const findCloseTag = (chunk, offset) => {
    const re = withLastIndex(bracketRe, offset);
    let reRes = null;
    let lastIndex = undefined;
    while (isNaN(lastIndex) && (reRes = re.exec(chunk))) {
      bracketsCounter.collect(reRes[0]);
      if (bracketsCounter.done) {
        lastIndex = re.lastIndex;
      }
    }
    return { lastIndex, error: bracketsCounter.error };
  };

  return {
    findOpenTag,
    findCloseTag,
    reset: () => bracketsCounter.reset(),
  };
};

module.exports = { SearchEngine };
