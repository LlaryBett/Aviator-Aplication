/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {string} avatar
 * @property {number} bet
 * @property {number|null} multiplier
 * @property {boolean} isCashedOut
 * @property {number|null} winAmount
 */

/**
 * @typedef {Object} GameHistoryItem
 * @property {string} id
 * @property {number} crashPoint
 * @property {number} timestamp
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} userId
 * @property {string} username
 * @property {string} avatar
 * @property {string} message
 * @property {number} timestamp
 */

/**
 * @typedef {Object} BetInfo
 * @property {number} amount
 * @property {number|null} autoCashout
 * @property {boolean} isActive
 */

export const PlayerShape = {
  id: '',
  name: '',
  avatar: '',
  bet: 0,
  multiplier: null,
  isCashedOut: false,
  winAmount: null
};

export const GameHistoryItemShape = {
  id: '',
  crashPoint: 0,
  timestamp: 0
};

export const ChatMessageShape = {
  id: '',
  userId: '',
  username: '',
  avatar: '',
  message: '',
  timestamp: 0
};

export const BetInfoShape = {
  amount: 0,
  autoCashout: null,
  isActive: false
};