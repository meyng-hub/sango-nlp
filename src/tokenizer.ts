// SPDX-License-Identifier: MIT
/**
 * Sango Text Tokenizer
 *
 * Splits Sango text into structured tokens, correctly handling
 * Sango-specific diacritics (â, ê, ë, î, ö, ô, û, ü, ï, ä),
 * nasal clusters (mb, nd, ng, ngb, nz, nj, ndr), and multi-word
 * expressions connected by hyphens (e.g., "Balë-ôko", "Kôkô-wâlï").
 *
 * @module tokenizer
 */

/** Token types produced by the tokenizer. */
export type TokenType =
  | "word"
  | "punctuation"
  | "number"
  | "whitespace"
  | "unknown";

/** A single token extracted from Sango text. */
export interface Token {
  /** The raw text of the token. */
  text: string;
  /** Semantic type of the token. */
  type: TokenType;
  /** Character offset where this token starts in the original text. */
  offset: number;
}

/**
 * Set of common Sango grammatical particles and connectors.
 * These are function words that link nouns, verbs, and clauses.
 *
 * - **na** — "and", "with", conjunction / preposition
 * - **ti** — possessive particle ("of"), marks possession
 * - **so** — demonstrative ("this/that"), relative pronoun
 * - **ni** — conditional ("if"), conjunction
 * - **ngba** — conjunction ("but", "however")
 * - **ndo** — conjunction ("or")
 * - **ala** — greeting / respect particle
 * - **la** — emphasis / topic marker
 * - **lo** — pronoun ("he/she/it")
 * - **a** — pronoun ("he/she/it" subject marker)
 */
export const SANGO_PARTICLES = new Set([
  "na",
  "ti",
  "so",
  "ni",
  "ngba",
  "ndo",
  "ala",
  "la",
  "lo",
  "a",
  "tî",
  "sô",
  "nî",
  "lâ",
  "âla",
]);

/**
 * Regular expression character class matching Sango letters,
 * including all diacritical variants used in standard orthography.
 *
 * Sango uses Latin script extended with:
 * - Circumflex vowels for high tone: â, ê, î, ô, û
 * - Diaeresis vowels for mid tone: ä, ë, ï, ö, ü
 * - Acute accent: á, é, ó
 */
const SANGO_LETTER = /[a-zA-ZàâäáãèéêëìîïíòóôöùúûüñçÀÂÄÁÃÈÉÊËÌÎÏÍÒÓÔÖÙÚÛÜÑÇ]/;

/**
 * Pattern that matches a complete Sango word, including hyphenated
 * compounds (e.g., "Balë-ôko", "Kôkô-wâlï", "Ngbangbo-ôko").
 */
const WORD_PATTERN = new RegExp(
  `${SANGO_LETTER.source}+(?:-${SANGO_LETTER.source}+)*`,
  "u",
);

/**
 * Pattern that matches numbers, including decimals and thousands separators.
 * Sango text may use either period or comma as decimal separator.
 */
const NUMBER_PATTERN = /\d+(?:[.,]\d+)*/;

/** Pattern that matches punctuation characters. */
const PUNCTUATION_PATTERN =
  /[.!?,;:'"()\[\]{}\-\u2013\u2014\u2018\u2019\u201C\u201D\u00AB\u00BB/\\]/;

/** Pattern matching whitespace runs. */
const WHITESPACE_PATTERN = /\s+/;

/**
 * Master tokenizer regex. Order matters: words before punctuation,
 * because hyphens inside words should not split them.
 */
const TOKEN_REGEX = new RegExp(
  `(${WORD_PATTERN.source})|(${NUMBER_PATTERN.source})|(${PUNCTUATION_PATTERN.source})|(${WHITESPACE_PATTERN.source})`,
  "gu",
);

/**
 * Classifies a raw match into a token type.
 */
function classifyMatch(match: RegExpMatchArray): TokenType {
  if (match[1] != null) return "word";
  if (match[2] != null) return "number";
  if (match[3] != null) return "punctuation";
  if (match[4] != null) return "whitespace";
  return "unknown";
}

/**
 * Tokenizes a Sango text string into an array of typed tokens.
 *
 * The tokenizer:
 * - Preserves Sango diacritics (â, ê, ë, î, ö, ô, û, ü, ï, ä)
 * - Keeps hyphenated compounds as single tokens ("Balë-ôko")
 * - Recognizes common particles (na, ti, so, ni, ngba)
 * - Tracks character offsets for each token
 * - Handles numbers with decimal separators
 *
 * @param text - The Sango text to tokenize.
 * @param options - Optional configuration.
 * @param options.includeWhitespace - If true, whitespace tokens are included. Default: false.
 * @returns An array of tokens.
 *
 * @example
 * ```ts
 * import { tokenize } from "@meyng/sango-nlp";
 *
 * const tokens = tokenize("Bara âla, tongana nye?");
 * // [
 * //   { text: "Bara",     type: "word",        offset: 0 },
 * //   { text: "âla",      type: "word",        offset: 5 },
 * //   { text: ",",        type: "punctuation", offset: 8 },
 * //   { text: "tongana",  type: "word",        offset: 10 },
 * //   { text: "nye",      type: "word",        offset: 18 },
 * //   { text: "?",        type: "punctuation", offset: 21 },
 * // ]
 * ```
 */
export function tokenize(
  text: string,
  options: { includeWhitespace?: boolean } = {},
): Token[] {
  const { includeWhitespace = false } = options;
  const tokens: Token[] = [];

  // Reset regex state
  TOKEN_REGEX.lastIndex = 0;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    // Capture any unmatched characters between tokens as "unknown"
    if (match.index > lastIndex) {
      const unknownText = text.slice(lastIndex, match.index);
      if (unknownText.trim().length > 0 || includeWhitespace) {
        tokens.push({
          text: unknownText,
          type: "unknown",
          offset: lastIndex,
        });
      }
    }

    const type = classifyMatch(match);

    if (type !== "whitespace" || includeWhitespace) {
      tokens.push({
        text: match[0],
        type,
        offset: match.index,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Capture trailing unmatched text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim().length > 0 || includeWhitespace) {
      tokens.push({
        text: remaining,
        type: "unknown",
        offset: lastIndex,
      });
    }
  }

  return tokens;
}

/**
 * Checks whether a token's text is a known Sango particle or connector.
 *
 * @param token - The token to check (or a plain string).
 * @returns True if the lowercase form is a recognized Sango particle.
 *
 * @example
 * ```ts
 * isParticle("na");  // true
 * isParticle("tî");  // true
 * isParticle("cat"); // false
 * ```
 */
export function isParticle(token: Token | string): boolean {
  const text = typeof token === "string" ? token : token.text;
  return SANGO_PARTICLES.has(text.toLowerCase());
}

/**
 * Extracts only word tokens from a text, filtering out punctuation,
 * numbers, and whitespace. Convenience wrapper around `tokenize`.
 *
 * @param text - The Sango text to extract words from.
 * @returns An array of word-type tokens.
 */
export function extractWords(text: string): Token[] {
  return tokenize(text).filter((t) => t.type === "word");
}
