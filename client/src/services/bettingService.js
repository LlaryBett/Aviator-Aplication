const BASE_URL = 'http://localhost:5000/api';

export const bettingService = {
  async placeBet(amount, autoCashout) {
    const response = await fetch(`${BASE_URL}/transactions/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ amount, autoCashout, status: 'pending' })
    });
    return response.json();
  },

  async processCashout(betId, amount, multiplier) {
    const winAmount = amount * multiplier;
    const response = await fetch(`${BASE_URL}/transactions/win`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ betId, winAmount, multiplier })
    });
    return response.json();
  },

  async processLoss(betId, amount) {
    const response = await fetch(`${BASE_URL}/transactions/loss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ betId, amount, status: 'lost' })
    });
    return response.json();
  }
};
