'use strict';

const { BracketsCollector } = require('./BracketsCollector.js');

// RegExp factory
const esc = (s) => `\\${s}`;
const toOpenBracketRegExp = (openBracket) => {
  const escOpenBracket = esc(openBracket);
  return new RegExp(`(?<!\\\\)${escOpenBracket}`, 'g');
};
const toBracketRegExp = (openBracket, closeBracket) => {
  const escOpenBracket = esc(openBracket);
  const escCloseBracket = esc(closeBracket);
  return new RegExp(`(?<!\\\\)[${escOpenBracket}${escCloseBracket}]`, 'g');
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
    const re = this.#openBracketRe;
    re.lastIndex = offset;

    const { 0: match } = re.exec(chunk) || {};
    let lastIndex = undefined;
    let error = null;

    if (match) {
      lastIndex = re.lastIndex;
      this.#bracketsCounter.collect(match);
      error = this.#bracketsCounter.error || null;
    }
    return { match, lastIndex, error };
  }

  findCloseTag(chunk, offset) {
    const re = this.#bracketRe;
    re.lastIndex = offset;

    let reRes = null;
    let lastIndex = undefined;
    let error = null;

    while (lastIndex === undefined && (reRes = re.exec(chunk))) {
      this.#bracketsCounter.collect(reRes[0]);
      if (this.#bracketsCounter.done) {
        lastIndex = re.lastIndex;
        error = this.#bracketsCounter.error || null;
      }
    }
    return { lastIndex, error };
  }

  reset() {
    this.#bracketsCounter.reset();
  }
}

module.exports = { SearchEngine };
