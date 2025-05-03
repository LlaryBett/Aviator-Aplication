import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Timer, Rocket, RotateCcw, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBetManager } from '../hooks/useBetManager';
import { toast } from 'react-hot-toast';
import { useGameState } from '../utils/gameLogic';
import { BetIdValidator } from '../utils/betIdValidator';

const BetPanel = ({ panelId, gamePhase, currentMultiplier, onPlaceBet, onCashOut }) => {
  const { user } = useAuth();
  const { placeBet, cashOut, handleLoss, isLocked } = useBetManager();
  const { setPlayerBetId } = useGameState();

  const [betInfo, setBetInfo] = useState({
    amount: 10,
    autoCashout: null,
    isActive: false,
    betId: null
  });
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [autoBetNextRound, setAutoBetNextRound] = useState(false);

  const prevGamePhase = useRef();
  const betDebounceRef = useRef(false);

  useEffect(() => {
    const playerKey = `player${panelId}`;
    const storedBetId = BetIdValidator.getBetId(playerKey);

    if (
      storedBetId &&
      gamePhase === 'flying' &&
      prevGamePhase.current !== 'flying'
    ) {
      console.log(`[BetPanel ${panelId}] Initializing bet state:`, {
        betId: storedBetId,
        gamePhase,
        multiplier: currentMultiplier
      });

      setPlayerBetId(playerKey, storedBetId);

      setBetInfo(prev => ({
        ...prev,
        betId: storedBetId,
        isActive: true
      }));
    }

    prevGamePhase.current = gamePhase;
  }, [panelId, gamePhase, setPlayerBetId]);

  useEffect(() => {
    const playerKey = `player${panelId}`;
    if (betInfo.betId) {
      console.log(`[BetPanel ${panelId}] Updating stored betId:`, betInfo.betId);
      BetIdValidator.storeBetId(playerKey, betInfo.betId);
      setPlayerBetId(playerKey, betInfo.betId);
    } else {
      console.log(`[BetPanel ${panelId}] Clearing stored betId`);
      BetIdValidator.clearBetId(playerKey);
    }
  }, [betInfo.betId, panelId, setPlayerBetId]);

  useEffect(() => {
    return () => {
      const playerKey = `player${panelId}`;
      BetIdValidator.clearBetId(playerKey);
    };
  }, [panelId]);

  useEffect(() => {
    if (
      autoBetNextRound &&
      gamePhase === 'waiting' &&
      !betInfo.isActive &&
      !isPlacingBet
    ) {
      // Place bet automatically at start of round
      setTimeout(() => {
        handlePlaceBet();
      }, 200);
    }
  }, [autoBetNextRound, gamePhase]);

  useEffect(() => {
    if (
      betInfo.isActive &&
      betInfo.autoCashout &&
      gamePhase === 'flying' &&
      currentMultiplier >= betInfo.autoCashout &&
      !isCashingOut
    ) {
      handleCashOut();
    }
  }, [betInfo.isActive, betInfo.autoCashout, currentMultiplier, gamePhase, isCashingOut]);

  const handlePlaceBet = async () => {
    if (isPlacingBet || isCashingOut || betDebounceRef.current || !user || user.balance < betInfo.amount) {
      return;
    }
    if (isLocked) return;

    betDebounceRef.current = true;
    setTimeout(() => { betDebounceRef.current = false; }, 1000); // 1 second debounce

    try {
      setIsPlacingBet(true);
      console.log('[BetPanel] Placing bet:', { amount: betInfo.amount, autoCashout: betInfo.autoCashout });
      
      const result = await placeBet(betInfo.amount, betInfo.autoCashout);
      
      if (result.success && result.betId) {
        const playerKey = `player${panelId}`;
        
        BetIdValidator.storeBetId(playerKey, result.betId);
        setPlayerBetId(playerKey, result.betId);
        
        console.log(`[BetPanel ${panelId}] Bet placed and validated:`, {
          betId: result.betId,
          isStored: BetIdValidator.validateBetId(playerKey, result.betId)
        });

        setBetInfo((prev) => ({
          ...prev,
          isActive: true,
          betId: result.betId,
        }));

        onPlaceBet(betInfo.amount, betInfo.autoCashout, {
          betId: result.betId,
          username: user.username,
          avatar: user.avatar,
          betAmount: betInfo.amount,
          status: 'betting',
          autoCashout: betInfo.autoCashout,
        });

      } else {
        throw new Error('No betId received from backend');
      }
    } catch (error) {
      console.error('[BetPanel] Bet placement failed:', error);
      toast.error('Failed to place bet');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleCashOut = async () => {
    console.trace('[BetPanel] handleCashOut called', { panelId, betInfo, gamePhase });
    const playerKey = `player${panelId}`;
    const storedBetId = BetIdValidator.getBetId(playerKey);

    if (
      !betInfo.isActive ||
      gamePhase !== 'flying' ||
      isLocked ||
      (!betInfo.betId && !storedBetId) ||
      isCashingOut
    ) {
      console.log(`[BetPanel ${panelId}] Cashout blocked:`, { 
        isActive: betInfo.isActive, 
        gamePhase, 
        isLocked,
        betInfoBetId: betInfo.betId,
        storedBetId
      });
      return;
    }

    setIsCashingOut(true);

    const activeBetId = betInfo.betId || storedBetId;
    if (!activeBetId) {
      console.error(`[BetPanel ${panelId}] No valid betId for cashout`);
      toast.error('Cannot process cashout - no active bet found');
      setIsCashingOut(false);
      return;
    }

    try {
      console.log(`[BetPanel ${panelId}] Processing cashout:`, {
        betId: activeBetId,
        amount: betInfo.amount,
        multiplier: currentMultiplier
      });

      setBetInfo(prev => ({ ...prev, isActive: false }));

      const success = await cashOut(activeBetId, betInfo.amount, currentMultiplier);

      if (success) {
        const winAmount = betInfo.amount * currentMultiplier;

        onCashOut(activeBetId, winAmount, currentMultiplier);

        BetIdValidator.clearBetId(playerKey);
        setPlayerBetId(playerKey, null);

        setBetInfo(prev => ({ 
          ...prev, 
          betId: null 
        }));

        toast.success(`Won ${winAmount.toFixed(2)} KES!`);
      } else {
        throw new Error('Cashout failed');
      }
    } catch (error) {
      console.error(`[BetPanel ${panelId}] Cashout error:`, error);
      toast.error('Failed to process win - please try again');
      setBetInfo(prev => ({ ...prev, isActive: false, betId: null }));
      BetIdValidator.clearBetId(playerKey);
      setPlayerBetId(playerKey, null);
    } finally {
      setIsCashingOut(false);
    }
  };

  useEffect(() => {
    if (gamePhase === 'crashed' && betInfo.isActive && betInfo.betId) {
      handleLoss(betInfo.betId);
      setBetInfo(prev => ({ ...prev, isActive: false }));
    }
  }, [gamePhase, betInfo.isActive, betInfo.betId, handleLoss]);

  const isPanelActive = betInfo.isActive;
  const canCashOut = isPanelActive && gamePhase === 'flying' && !isCashingOut;
  const canBet = !isPanelActive && gamePhase === 'waiting';
  
  const potentialWin = isPanelActive ? 
    (betInfo.amount * (betInfo.autoCashout || currentMultiplier)).toFixed(2) : 
    (betInfo.amount * 2).toFixed(2);

  const isBetDisabled = isPlacingBet || !user || user.balance < betInfo.amount;

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
            checked={autoBetNextRound}
            onChange={() => setAutoBetNextRound(v => !v)}
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
              disabled={isBetDisabled}
              className={`col-span-2 flex items-center justify-center py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded transition-colors ${isBetDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isPlacingBet ? 'Placing Bet...' : (
                <>
                  <Rocket size={16} className="mr-1" />
                  Place Bet
                </>
              )}
            </button>
          ) : canCashOut ? (
            <button
              onClick={handleCashOut}
              disabled={isCashingOut}
              className={`col-span-2 flex items-center justify-center py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors animate-pulse ${isCashingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isCashingOut ? 'Processing...' : <>Cash Out ({currentMultiplier.toFixed(2)}x)</>}
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