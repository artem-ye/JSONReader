'use strict';

const { BracketsCollector } = require('./BracketsCollector.js');

// RegExp utils
const esc = (s) => `\\${s}`;
const withLastIndex = (r, lastIndex) => ((r.lastIndex = lastIndex), r);

const toOpenBracketRegExp = (openBracket) => {
  return new RegExp(`(?<!\\\\)${esc(openBracket)}`, 'g');
};
const toBracketRegExp = (openBracket, closeBracket) => {
  return new RegExp(`(?<!\\\\)[${esc(openBracket)}${esc(closeBracket)}]`, 'g');
};

class SearchEngine {
  #openBracketRe = null;
  #bracketRe = null;
  #bracketsCounter = null;

  constructor({ openBracket, closeBracket }) {
    this.#openBracketRe = toOpenBracketRegExp(openBracket);
    this.#bracketRe = toBracketRegExp(openBracket, closeBracket);
    this.#bracketsCounter = new BracketsCollector({
      openBracket,
      closeBracket,
    });
  }

  findOpenTag(chunk, offset) {
    const re = withLastIndex(this.#openBracketRe, offset);
    const { 0: match } = re.exec(chunk) || {};
    let lastIndex = undefined;
    let error = null;

    if (match) {
      lastIndex = re.lastIndex;
      this.#bracketsCounter.collect(match);
      error = this.#bracketsCounter.error;
    }
    return { match, lastIndex, error };
  }

  findCloseTag(chunk, offset) {
    const re = withLastIndex(this.#bracketRe, offset);
    let reRes = null;
    let lastIndex = undefined;
    let error = null;

    while (lastIndex === undefined && (reRes = re.exec(chunk))) {
      this.#bracketsCounter.collect(reRes[0]);
      if (this.#bracketsCounter.done) {
        lastIndex = re.lastIndex;
        error = this.#bracketsCounter.error;
      }
    }
    return { lastIndex, error };
  }

  reset() {
    this.#bracketsCounter.reset();
  }
}

module.exports = { SearchEngine };
