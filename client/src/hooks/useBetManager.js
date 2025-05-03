import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const useBetManager = () => {
  const { user, updateBalance } = useAuth();
  const [balanceLock, setBalanceLock] = useState(false);

  const placeBet = useCallback(async (amount, autoCashout = null) => {
    console.log('[useBetManager] placeBet called:', { amount, autoCashout });
    if (balanceLock) return false;
    setBalanceLock(true);

    try {
      // Validate balance
      if (!user?.balance || user.balance < amount) {
        toast.error(`Insufficient balance! Need at least ${amount} KES`);
        return false;
      }

      const response = await fetch(`${BACKEND_URL}/api/transactions/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          amount,
          autoCashout,
          status: 'pending'
        })
      });

      const data = await response.json();
      console.log('[useBetManager] Backend response:', data);
      
      if (!response.ok) {
        throw new Error(data.error);
      }

      updateBalance(data.newBalance);
      return { success: true, betId: data.betId };

    } catch (error) {
      toast.error('Failed to place bet');
      console.error('[useBetManager] Bet error:', error);
      return false;
    } finally {
      setBalanceLock(false);
    }
  }, [user?.balance, updateBalance, balanceLock]);

  const cashOut = useCallback(async (betId, amount, currentMultiplier) => {
    if (balanceLock) return false;
    setBalanceLock(true);

    try {
      console.log('Processing cashout:', {
        betId,
        amount,
        multiplier: currentMultiplier
      });

      const winAmount = parseFloat(amount) * parseFloat(currentMultiplier);
      
      const response = await fetch(`${BACKEND_URL}/api/transactions/win`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          betId,
          amount, // Add original bet amount
          winAmount,
          multiplier: currentMultiplier
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Cashout API error:', data);
        throw new Error(data.message || 'Failed to process win');
      }

      updateBalance(data.newBalance);
      toast.success(`Won ${winAmount.toFixed(2)} KES @ ${currentMultiplier.toFixed(2)}x!`);
      return true;

    } catch (error) {
      console.error('Cashout error:', error);
      toast.error(error.message || 'Failed to process win');
      return false;
    } finally {
      setBalanceLock(false);
    }
  }, [updateBalance, balanceLock]);

  const handleLoss = useCallback(async (betId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/bet/lost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          betId,
          status: 'lost'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }

      updateBalance(data.newBalance);
      toast.error(`Lost bet!`);

    } catch (error) {
      console.error('Loss handling error:', error);
      toast.error('Failed to process loss');
    }
  }, [updateBalance]);

  return {
    placeBet,
    cashOut,
    handleLoss,
    isLocked: balanceLock
  };
};
