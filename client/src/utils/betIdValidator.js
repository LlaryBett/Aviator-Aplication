const BET_ID_PREFIX = 'aviator_bet_';

export const BetIdValidator = {
  storeBetId: (playerId, betId) => {
    if (!betId) return false;
    localStorage.setItem(`${BET_ID_PREFIX}${playerId}`, betId);
    return true;
  },

  getBetId: (playerId) => {
    return localStorage.getItem(`${BET_ID_PREFIX}${playerId}`);
  },

  clearBetId: (playerId) => {
    console.log(`[BetIdValidator] Clearing betId for ${playerId}`);
    localStorage.removeItem(`${BET_ID_PREFIX}${playerId}`);
  },

  validateBetId: (playerId, betId) => {
    const storedBetId = BetIdValidator.getBetId(playerId);
    return storedBetId === betId && !!betId;
  },

  isActiveBet: (playerId) => {
    return !!BetIdValidator.getBetId(playerId);
  }
};
