import React from "react";
import { getFixationLength } from "./textFormatter.js";

/**
 * Functional stopwords and short particles that carry low syntactic weight.
 * Leaving these unbolded in Bionic Salience mode reduces visual vibration
 * and allows the eye to smoothly anchor on structural nouns, verbs, and head words.
 * Based on empirical findings in Wang et al. (2025) and Zhang et al. (2025).
 */
export const LOW_SALIENCE_PARTICLES = new Set([
  "a", "an", "the", "and", "or", "but", "nor", "so", "for", "yet",
  "in", "on", "at", "to", "by", "of", "up", "as", "is", "it", "if",
  "be", "am", "are", "was", "were", "been", "has", "had", "have",
  "do", "did", "does", "its", "my", "our", "her", "his", "their",
  "that", "this", "then", "than", "into", "onto", "from", "with",
]);

/**
 * Determine whether a token is high-salience (content carrier) vs low-salience (functional particle).
 * @param {string} rawWord - Clean alpha word
 * @returns {boolean}
 */
export function isSalientToken(rawWord) {
  if (!rawWord) return false;
  const normalized = rawWord.toLowerCase();
  if (normalized.length <= 1) return false;
  if (LOW_SALIENCE_PARTICLES.has(normalized)) return false;
  return true;
}

/**
 * Calculate dynamic anchor length based on syntactic salience.
 * @param {string} word - The clean word string
 * @returns {number} Fixation anchor character count
 */
export function getSalientFixationLength(word) {
  if (!word || word.length <= 1) return 0;
  const isSalient = isSalientToken(word);
  if (!isSalient) {
    // For low-salience words, return at most 1 anchor char or 0 if very short
    return word.length >= 4 ? 1 : 0;
  }
  // For salient words, calculate dynamic grapheme fixation length
  return getFixationLength(word.length);
}

/**
 * Formats a paragraph text using Syntactic Salience Bionic Fixation.
 * Pure React element tree tokenizer with zero dangerouslySetInnerHTML risk.
 * @param {string} text - Raw paragraph text
 * @returns {Array<React.ReactNode>}
 */
export function formatSalientParagraphText(text) {
  if (!text) return text;

  const tokens = text.split(/(\s+)/);
  return tokens.map((token, index) => {
    if (/^\s+$/.test(token) || !token) return token;

    const match = token.match(/^([\p{L}\p{N}]+)(.*)$/u);
    if (!match) return token;

    const [, word, suffix] = match;
    const fixLen = getSalientFixationLength(word);

    if (fixLen <= 0) {
      return React.createElement(
        "span",
        { key: `salience-${index}`, className: "bionic-token bionic-calm" },
        word,
        suffix,
      );
    }

    const anchor = word.slice(0, fixLen);
    const rest = word.slice(fixLen);

    return React.createElement(
      "span",
      { key: `salience-${index}`, className: "bionic-token bionic-salient" },
      React.createElement("b", { className: "fixation-anchor fixation-salient" }, anchor),
      rest,
      suffix,
    );
  });
}
