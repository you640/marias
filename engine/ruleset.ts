
export const RULESET = {
  points: {
    ACE: 10,
    TEN: 10,
    ULTIMO: 10,
    MELD_NORMAL: 20,
    MELD_TRUMP: 40
  },
  contracts: {
    HRA: { base: 1, multiplier: 1 },
    SEDMA: { base: 1, multiplier: 2 },
    STO: { base: 4, multiplier: 1 },
    STO_SEDMA: { base: 8, multiplier: 1 },
    BETL: { base: 5, multiplier: 1 },
    DURCH: { base: 10, multiplier: 1 }
  },
  flek_ladder: [1, 2, 4, 8, 16, 32],
  talon_constraints: {
    no_ace_ten_in_suit_game: true,
    no_trump_seven_if_sedma: true
  },
  scoring_variant: {
    countOnlyOneMeldFor100: true
  }
};
