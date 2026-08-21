import React from "react";

export function getFixationLength(wordLength) {
  if (wordLength <= 0) return 0;
  if (wordLength <= 2) return 1;
  if (wordLength <= 5) return 2;
  if (wordLength <= 8) return 3;
  return Math.max(3, Math.ceil(wordLength * 0.45));
}

export function formatParagraphText(text, options = {}) {
  const { bionic = false } = options;
  if (!text || !bionic) return text;

  const tokens = text.split(/(\s+)/);
  return tokens.map((token, index) => {
    if (/^\s+$/.test(token) || !token) return token;

    const match = token.match(/^([\p{L}\p{N}]+)(.*)$/u);
    if (!match) return token;

    const [, word, suffix] = match;
    const fixLen = getFixationLength(word.length);
    const anchor = word.slice(0, fixLen);
    const rest = word.slice(fixLen);

    return React.createElement(
      "span",
      { key: `bionic-${index}`, className: "bionic-token" },
      React.createElement("b", { className: "fixation-anchor" }, anchor),
      rest,
      suffix,
    );
  });
}
