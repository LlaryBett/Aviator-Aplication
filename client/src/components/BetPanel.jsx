import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Timer, Rocket, RotateCcw, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBetManager } from '../hooks/useBetManager';
import { toast } from 'react-hot-toast';

const BetPanel = ({ panelId, gamePhase, currentMultiplier, onPlaceBet, onCashOut }) => {
  const { user } = useAuth();
  const { placeBet, cashOut, handleLoss, isLocked } = useBetManager();
  
  const [betInfo, setBetInfo] = useState({
    amount: 10,
    autoCashout: null,
    isActive: false,
    betId: null
  });

  // Handle placing bet
  const handlePlaceBet = async () => {
    if (!user || user.balance < betInfo.amount) {
      toast.error(`Insufficient balance! Need at least ${betInfo.amount} KES`);
      return;
    }

    if (isLocked) return;

    const result = await placeBet(betInfo.amount, betInfo.autoCashout);
    if (result.success) {
      setBetInfo((prev) => ({
        ...prev,
        isActive: true,
        betId: result.betId,
      }));

      // Emit player data for LivePlayers
      const betData = {
        betId: result.betId,
        username: user.username,
        avatar: user.avatar,
        betAmount: betInfo.amount,
        status: 'betting',
        autoCashout: betInfo.autoCashout,
      };

      onPlaceBet(betInfo.amount, betInfo.autoCashout, betData);
    }
  };

  // Handle cashout
  const handleCashOut = async () => {
    if (!betInfo.isActive || gamePhase === 'crashed' || isLocked) return;

    try {
      const success = await cashOut(
        betInfo.betId,
        betInfo.amount,
        currentMultiplier
      );

      if (success) {
        setBetInfo((prev) => ({ ...prev, isActive: false }));

        // Emit cashout data for LivePlayers
        onCashOut(
          betInfo.betId,
          betInfo.amount * currentMultiplier,
          currentMultiplier
        );
      } else {
        setBetInfo((prev) => ({ ...prev, isActive: false }));
        onCashOut(betInfo.betId, 0, 0, 'failed_cashout');
        throw new Error('Cashout returned false');
      }
    } catch (error) {
      console.error('Cashout failed:', error);
      toast.error('Failed to process win - please try again');
    }
  };

  // Handle game crash
  useEffect(() => {
    if (gamePhase === 'crashed' && betInfo.isActive && betInfo.betId) {
      handleLoss(betInfo.betId);
      setBetInfo(prev => ({ ...prev, isActive: false }));
    }
  }, [gamePhase, betInfo.isActive, betInfo.betId, handleLoss]);

  const isPanelActive = betInfo.isActive;
  const canCashOut = isPanelActive && gamePhase === 'flying';
  const canBet = !isPanelActive && gamePhase === 'waiting';
  
  const potentialWin = isPanelActive ? 
    (betInfo.amount * (betInfo.autoCashout || currentMultiplier)).toFixed(2) : 
    (betInfo.amount * 2).toFixed(2);

  return (
    <>
      <div className={`bg-gray-800/90 backdrop-blur-md border rounded-lg p-4 ${
        isPanelActive ? 'border-teal-500/70' : 'border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Bet #{panelId}</h3>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            canBet ? 'bg-indigo-600/70 text-white' : 
            canCashOut ? 'bg-green-600/70 text-white' : 
            'bg-gray-700 text-gray-300'
          }`}>
            {canBet ? 'Ready to Bet' : 
             canCashOut ? 'In Flight' : 
             gamePhase === 'crashed' ? 'Game Over' : 'Waiting'}
          </div>
        </div>
        
        <div className="mb-3">
          <label className="block text-gray-400 text-sm mb-1">
            Bet Amount (10 - 5,000 KES)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <DollarSign size={16} />
            </span>
            <input
              type="number"
              value={betInfo.amount}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  if (value < 10) {
                    toast.error('Minimum bet amount is KES 10');
                    setBetInfo(prev => ({ ...prev, amount: 10 }));
                  } else if (value > 5000) {
                    toast.error('Maximum bet amount is KES 5,000');
                    setBetInfo(prev => ({ ...prev, amount: 5000 }));
                  } else {
                    setBetInfo(prev => ({ ...prev, amount: value }));
                  }
                }
              }}
              disabled={isPanelActive}
              className={`w-full pl-10 pr-4 py-2 bg-gray-700 border ${
                isPanelActive ? 'border-gray-600' : 'border-gray-500'
              } rounded focus:outline-none focus:ring-1 focus:ring-teal-500 text-white`}
              min="10"
              max="5000"
              step="10"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-1">Auto Cashout at</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Timer size={16} />
            </span>
            <input
              type="number"
              value={betInfo.autoCashout || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (isNaN(value) || value <= 1) {
                  setBetInfo(prev => ({ ...prev, autoCashout: null }));
                } else {
                  setBetInfo(prev => ({ ...prev, autoCashout: value }));
                }
              }}
              placeholder="No auto cashout"
              disabled={isPanelActive}
              className={`w-full pl-10 pr-4 py-2 bg-gray-700 border ${
                isPanelActive ? 'border-gray-600' : 'border-gray-500'
              } rounded focus:outline-none focus:ring-1 focus:ring-teal-500 text-white`}
              min="1.01"
              step="0.01"
            />
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <input
            id={`autoBet-${panelId}`}
            type="checkbox"
            checked={betInfo.autoCashout}
            onChange={() => setBetInfo(prev => ({ ...prev, autoCashout: !betInfo.autoCashout }))}
            disabled={isPanelActive}
            className="h-4 w-4 rounded border-gray-500 text-teal-600 focus:ring-teal-500 bg-gray-700"
          />
          <label htmlFor={`autoBet-${panelId}`} className="ml-2 text-sm text-gray-300">
            Auto bet next round
          </label>
        </div>
        
        <div className="bg-gray-700/70 rounded p-2 mb-4 flex justify-between items-center">
          <span className="text-gray-300 text-sm">Potential Win:</span>
          <span className="text-teal-400 font-semibold">ksh.{potentialWin}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {canBet ? (
            <button
              onClick={handlePlaceBet}
              className="col-span-2 flex items-center justify-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors"
            >
              <Rocket size={16} className="mr-1" />
              Place Bet
            </button>
          ) : canCashOut ? (
            <button
              onClick={handleCashOut}
              className="col-span-2 flex items-center justify-center py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors animate-pulse"
            >
              Cash Out ({currentMultiplier.toFixed(2)}x)
            </button>
          ) : (
            <button
              disabled
              className="col-span-2 flex items-center justify-center py-2 px-4 bg-gray-600 text-gray-300 font-medium rounded cursor-not-allowed"
            >
              <RotateCcw size={16} className="mr-1" />
              {gamePhase === 'crashed' ? 'Waiting for next round' : 'Place Bet'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

BetPanel.propTypes = {
  panelId: PropTypes.number.isRequired,
  gamePhase: PropTypes.oneOf(['waiting', 'flying', 'crashed']).isRequired,
  currentMultiplier: PropTypes.number.isRequired,
  onPlaceBet: PropTypes.func.isRequired,
  onCashOut: PropTypes.func.isRequired
};

export default BetPanel;