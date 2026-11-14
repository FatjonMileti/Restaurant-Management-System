/**
 * Conservative, deterministic checks for safety-sensitive restaurant messages.
 *
 * These checks complement the model's own uncertainty flag. They never decide
 * that a dish is safe; they only force the waiter to verify sensitive details.
 */

export type SafetyCategory =
  | 'allergy_or_dietary'
  | 'cross_contamination'
  | 'price_or_quantity'
  | 'reservation_detail'
  | 'negation_or_condition';

export interface SafetyAssessment {
  categories: SafetyCategory[];
  reasons: string[];
  numericMismatch: boolean;
}

interface Rule {
  category: SafetyCategory;
  reason: string;
  terms: string[];
}

const RULES: Rule[] = [
  {
    category: 'allergy_or_dietary',
    reason: 'The message mentions allergies, dietary needs or ingredients.',
    terms: [
      'allerg',
      'alergj',
      'allergji',
      'alergji',
      'intoler',
      'intolleran',
      'celiac',
      'coeliac',
      'gluten',
      'glutine',
      'peanut',
      'arachid',
      'noci',
      'nut',
      'nuts',
      'lactose',
      'lattosio',
      'latticini',
      'dairy',
      'uova',
      'egg',
      'eggs',
      'shellfish',
      'crostacei',
      'fish',
      'pesce',
      'soy',
      'soia',
      'sesame',
      'sesamo',
      'vegetarian',
      'vegetar',
      'vegan',
      'halal',
      'kosher',
      'diet',
      'dieta',
      'ndjeshm',
      'alergjik',
    ],
  },
  {
    category: 'cross_contamination',
    reason: 'The message mentions cross-contamination or shared preparation.',
    terms: [
      'cross-contamination',
      'cross contamination',
      'contaminazione incrociata',
      'contaminazione',
      'kontaminim',
      'contamination',
      'shared fryer',
      'friggitrice condivisa',
    ],
  },
  {
    category: 'price_or_quantity',
    reason: 'The message mentions prices, currency, quantities or portion sizes.',
    terms: [
      'price',
      'prezzo',
      'çmim',
      'cmim',
      'cost',
      'costo',
      'kosto',
      'euro',
      'dollar',
      'dollaro',
      '$',
      '€',
      'quantity',
      'quantità',
      'quantita',
      'sasia',
      'how many',
      'sa shumë',
      'sa shume',
      'quanto',
      'combien',
      'wie viel',
      'cuánto',
      'cuanto',
      'portion',
      'porzione',
      'porcion',
      // Spoken quantities without digits (English/Italian/Albanian).
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
      'uno',
      'due',
      'tre',
      'quattro',
      'cinque',
      'sei',
      'sette',
      'otto',
      'nove',
      'dieci',
      'një',
      'dy',
      'katër',
      'pesë',
      'gjashtë',
      'shtatë',
      'tetë',
      'nëntë',
      'dhjetë',
    ],
  },
  {
    category: 'reservation_detail',
    reason: 'The message mentions reservation details such as a date, time or party size.',
    terms: [
      'reservation',
      'prenotazione',
      'rezervim',
      'reserve',
      'book a table',
      'booking',
      'tavolo per',
      'table for',
      'party of',
      'guests',
      'persone',
      'persona',
      'njerëz',
      'njerez',
      'appointment',
    ],
  },
  {
    category: 'negation_or_condition',
    reason: 'The message contains negation, an exception or a conditional statement.',
    terms: [
      'without',
      'senza',
      'pa ',
      'nuk ',
      'not ',
      'no ',
      'non ',
      'kein',
      'sans ',
      'sin ',
      'gluten-free',
      'gluten free',
      'senza glutine',
      'pa gluten',
      'if ',
      ' se ',
      'nëse',
      'nese',
      'only',
      'solo',
      'vetëm',
      'vetem',
      'except',
      'tranne',
      'përveç',
      'pervec',
      'but ',
    ],
  },
];

const normalizedText = (value: string): string =>
  ` ${value.toLowerCase().replace(/\s+/g, ' ').trim()} `;

const includesTerm = (haystack: string, term: string): boolean => {
  // Currency symbols are commonly attached to digits ("$12"), so match them
  // anywhere rather than requiring word boundaries.
  if (term === '$' || term === '€') return haystack.includes(term);
  if (term.endsWith(' ')) return haystack.includes(term);
  if (term.length <= 3) return haystack.includes(` ${term} `);
  return haystack.includes(term);
};

const extractNumbers = (value: string): number[] => {
  const matches = value.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return matches
    .map((match) => Number(match.replace(',', '.')))
    .filter((number) => Number.isFinite(number))
    .sort((a, b) => a - b);
};

export const numbersDiffer = (source: string, translation: string): boolean => {
  const sourceNumbers = extractNumbers(source);
  const translationNumbers = extractNumbers(translation);
  if (sourceNumbers.length === 0 && translationNumbers.length === 0) return false;
  if (sourceNumbers.length !== translationNumbers.length) return true;
  return sourceNumbers.some(
    (number, index) => Math.abs(number - (translationNumbers[index] ?? Number.NaN)) > 1e-9,
  );
};

export const assessSafety = (source: string, translation?: string): SafetyAssessment => {
  const haystack = normalizedText(source);
  const categories: SafetyCategory[] = [];
  const reasons: string[] = [];

  for (const rule of RULES) {
    if (rule.terms.some((term) => includesTerm(haystack, term))) {
      categories.push(rule.category);
      reasons.push(rule.reason);
    }
  }

  const numericMismatch =
    typeof translation === 'string' && numbersDiffer(source, translation);
  if (numericMismatch) {
    reasons.push(
      'Numbers in the translation may not match the original price, quantity, date or time.',
    );
  }

  return { categories, reasons, numericMismatch };
};
