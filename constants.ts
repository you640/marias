
import { DictionaryEntry, LegalMoveExample, Rank, Ruleset } from './types';

export const DICTIONARY: DictionaryEntry[] = [
  { term: 'Forhont', definition: 'Hráč sediaci po ľavici rozdávajúceho, ktorý ako prvý volí hru/tromf.' },
  { term: 'Aktér', definition: 'Hráč, ktorý si zvolil záväzok a hrá proti zvyšným dvom (Obrane).' },
  { term: 'Obrana', definition: 'Dvojica hráčov spolupracujúca proti Aktérovi.' },
  { term: 'Talón', definition: 'Dve odložené karty Aktérom pred začiatkom hry.' },
  { term: 'Hláška', definition: 'Oznámenie držania kráľa a filky (K+Q) rovnakej farby pri prvom výnose tejto farby.' },
  { term: 'Ultimo', definition: 'Posledný štych v hre (často spojený so záväzkom Sedma).' },
  { term: 'Flek', definition: 'Zdvojnásobenie stávky oponentom, ak neverí v úspech záväzku.' }
];

export const SUIT_ORDER: Rank[] = ['A', '10', 'K', 'Q', 'J', '9', '8', '7'];
export const BETL_DURCH_ORDER: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];

export const JSON_RULESET = {
  version: "1.0-formal",
  players: 3,
  deck: {
    suits: ["Srdce", "Listy", "Žalude", "Gule"],
    ranks: ["7", "8", "9", "10", "J", "Q", "K", "A"],
    suit_priority: "A > 10 > K > Q > J > 9 > 8 > 7",
    betl_priority: "A > K > Q > J > 10 > 9 > 8 > 7"
  },
  mechanics: {
    deal: [7, 5, 5, "gap", 5, 5, 5],
    discard: 2,
    forbidden_discard: ["Aces", "Tens", "Trump cards (unless strictly necessary)"]
  },
  legal_moves: [
    "Must follow suit (Priznať farbu)",
    "Must beat current high card in suit (Prebíjať)",
    "If no suit, must play trump (Trumfovať)",
    "If trumping, must beat current high trump (Overtrumf)"
  ],
  scoring: {
    points: { "A": 10, "10": 10, "Ultimo": 10 },
    bonuses: { "Hláška": 20, "Trump_Hláška": 40 }
  },
  contracts: {
    "Hra": "Gain more points than defense",
    "Sedma": "Win the last trick with trump 7",
    "Sto": "Reach 100 points via tricks + announcements",
    "Betl": "Win zero tricks (Aces/Tens have no value)",
    "Durch": "Win all 10 tricks"
  },
  flek_multiplier: {
    "base": 1,
    "steps": ["Flek", "Re", "Tutti", "Boty", "Kalhoty"],
    "scaling": "2^n"
  }
};

export const LEGAL_MOVE_EXAMPLES: LegalMoveExample[] = [
  {
    id: 1,
    description: "Základné priznanie farby a prebíjanie",
    leadCard: { suit: 'Srdce', rank: '9' },
    previousPlayed: [],
    trumpSuit: 'Gule',
    hand: [{ suit: 'Srdce', rank: '7' }, { suit: 'Srdce', rank: 'K' }, { suit: 'Listy', rank: 'A' }],
    allowedCards: [{ suit: 'Srdce', rank: 'K' }] // Must follow and beat if possible
  },
  {
    id: 2,
    description: "Povinnosť trumfovať pri absencii farby",
    leadCard: { suit: 'Listy', rank: 'A' },
    previousPlayed: [],
    trumpSuit: 'Srdce',
    hand: [{ suit: 'Srdce', rank: '7' }, { suit: 'Gule', rank: '8' }],
    allowedCards: [{ suit: 'Srdce', rank: '7' }]
  },
  {
    id: 3,
    description: "Overtrumf (prebíjanie tromfom)",
    leadCard: { suit: 'Listy', rank: 'J' },
    previousPlayed: [{ suit: 'Srdce', rank: '9' }], // Trumped by Player 2
    trumpSuit: 'Srdce',
    hand: [{ suit: 'Srdce', rank: '10' }, { suit: 'Srdce', rank: '7' }, { suit: 'Gule', rank: 'A' }],
    allowedCards: [{ suit: 'Srdce', rank: '10' }] // Must overtrump
  },
  {
    id: 4,
    description: "Nemôže overtrumfovať (hrá nižší tromf)",
    leadCard: { suit: 'Listy', rank: 'J' },
    previousPlayed: [{ suit: 'Srdce', rank: 'A' }], // Already high trump
    trumpSuit: 'Srdce',
    hand: [{ suit: 'Srdce', rank: '7' }, { suit: 'Gule', rank: '8' }],
    allowedCards: [{ suit: 'Srdce', rank: '7' }]
  },
  {
    id: 5,
    description: "Voľný výnos (hráč na ťahu)",
    leadCard: null,
    previousPlayed: [],
    trumpSuit: 'Gule',
    hand: [{ suit: 'Srdce', rank: 'A' }, { suit: 'Listy', rank: '7' }],
    allowedCards: [{ suit: 'Srdce', rank: 'A' }, { suit: 'Listy', rank: '7' }]
  },
  {
    id: 6,
    description: "Betl - žiadny tromf, len farba",
    leadCard: { suit: 'Gule', rank: '10' },
    previousPlayed: [],
    trumpSuit: null,
    hand: [{ suit: 'Gule', rank: 'J' }, { suit: 'Gule', rank: '9' }, { suit: 'Srdce', rank: 'A' }],
    allowedCards: [{ suit: 'Gule', rank: 'J' }] // Must follow and beat (Gule J > 10 in Betl)
  },
  {
    id: 7,
    description: "Priznanie farby bez možnosti prebiť",
    leadCard: { suit: 'Srdce', rank: 'A' },
    previousPlayed: [],
    trumpSuit: 'Žalude',
    hand: [{ suit: 'Srdce', rank: '10' }, { suit: 'Srdce', rank: '7' }],
    allowedCards: [{ suit: 'Srdce', rank: '10' }, { suit: 'Srdce', rank: '7' }] // Both are lower than Ace
  },
  {
    id: 8,
    description: "Absencia farby aj tromfu (Renonc - odhadzovanie)",
    leadCard: { suit: 'Listy', rank: '8' },
    previousPlayed: [],
    trumpSuit: 'Srdce',
    hand: [{ suit: 'Gule', rank: 'Q' }, { suit: 'Žalude', rank: 'K' }],
    allowedCards: [{ suit: 'Gule', rank: 'Q' }, { suit: 'Žalude', rank: 'K' }]
  },
  {
    id: 9,
    description: "Prebíjanie tromfom (Trump Lead)",
    leadCard: { suit: 'Gule', rank: '8' },
    previousPlayed: [],
    trumpSuit: 'Gule',
    hand: [{ suit: 'Gule', rank: '10' }, { suit: 'Gule', rank: '7' }],
    allowedCards: [{ suit: 'Gule', rank: '10' }]
  },
  {
    id: 10,
    description: "Durch - rovnaké pravidlá ako Betl (len farba)",
    leadCard: { suit: 'Žalude', rank: '7' },
    previousPlayed: [],
    trumpSuit: null,
    hand: [{ suit: 'Žalude', rank: 'A' }, { suit: 'Listy', rank: 'A' }],
    allowedCards: [{ suit: 'Žalude', rank: 'A' }]
  },
  {
    id: 11,
    description: "Viacero kariet rovnakej farby (všetky víťazné)",
    leadCard: { suit: 'Srdce', rank: 'J' },
    previousPlayed: [],
    trumpSuit: 'Listy',
    hand: [{ suit: 'Srdce', rank: 'Q' }, { suit: 'Srdce', rank: 'K' }, { suit: 'Srdce', rank: '10' }],
    allowedCards: [{ suit: 'Srdce', rank: 'Q' }, { suit: 'Srdce', rank: 'K' }, { suit: 'Srdce', rank: '10' }]
  },
  {
    id: 12,
    description: "Hráč 3 musí prebiť Hráča 2 v tromfoch",
    leadCard: { suit: 'Žalude', rank: 'A' },
    previousPlayed: [{ suit: 'Gule', rank: '10' }], // Player 2 trumped with 10
    trumpSuit: 'Gule',
    hand: [{ suit: 'Gule', rank: 'A' }, { suit: 'Gule', rank: '7' }],
    allowedCards: [{ suit: 'Gule', rank: 'A' }] // Overtrump 10
  },
  {
    id: 13,
    description: "Povinnosť prebíjať v Betli (A > K > Q ...)",
    leadCard: { suit: 'Srdce', rank: 'K' },
    previousPlayed: [],
    trumpSuit: null,
    hand: [{ suit: 'Srdce', rank: 'A' }, { suit: 'Srdce', rank: 'Q' }],
    allowedCards: [{ suit: 'Srdce', rank: 'A' }]
  },
  {
    id: 14,
    description: "Povinnosť prebíjať v Tromfovej hre (A > 10 > K ...)",
    leadCard: { suit: 'Srdce', rank: 'K' },
    previousPlayed: [],
    trumpSuit: 'Listy',
    hand: [{ suit: 'Srdce', rank: '10' }, { suit: 'Srdce', rank: 'Q' }],
    allowedCards: [{ suit: 'Srdce', rank: '10' }] // 10 is higher than K
  },
  {
    id: 15,
    description: "Posledný štych (Ultimo) - Hráč musí použiť tromfovú 7 ak ju má",
    leadCard: { suit: 'Gule', rank: 'A' },
    previousPlayed: [],
    trumpSuit: 'Srdce',
    hand: [{ suit: 'Srdce', rank: '7' }],
    allowedCards: [{ suit: 'Srdce', rank: '7' }]
  }
];
