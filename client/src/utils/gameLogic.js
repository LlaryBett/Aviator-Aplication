import { useState, useEffect, useCallback } from 'react';
import { generateServerSeed, generateClientSeed, calculateCrashPoint } from './cryptoUtils';

// Constants
const TICK_RATE = 50; // ms
const MULTIPLIER_INCREASE_RATE = 0.01;
const MIN_CRASH_MULTIPLIER = 1.0;
const MAX_CRASH_MULTIPLIER = 1000.0;

// Generate crash point using cryptographic hashes
export const generateCrashPoint = () => {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    
    // Calculate raw crash point
    const rawCrashPoint = calculateCrashPoint(serverSeed, clientSeed);
    
    // Apply max limit without affecting distribution
    const finalCrashPoint = Math.min(rawCrashPoint, MAX_CRASH_MULTIPLIER);
    
    // Store verification data
    window.localStorage.setItem('lastServerSeed', serverSeed);
    window.localStorage.setItem('lastClientSeed', clientSeed);
    window.localStorage.setItem('lastCrashPoint', finalCrashPoint.toString());
    
    return finalCrashPoint;
};

// Custom hook for game state management
export const useGameState = () => {
  const [isGameActive, setIsGameActive] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting');
  const [gameHistory, setGameHistory] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gameTimer, setGameTimer] = useState(0);
  const [lastGameVerification, setLastGameVerification] = useState(null);

  // Start a new game round
  const startGame = useCallback(() => {
    const newCrashPoint = generateCrashPoint();
    setCrashPoint(newCrashPoint);
    setCurrentMultiplier(1.0);
    setIsGameActive(true);
    setGamePhase('flying');
    setGameTimer(0);
    
    // Reset player cash out status
    setPlayers(prevPlayers => 
      prevPlayers.map(player => ({
        ...player,
        isCashedOut: false,
        multiplier: null,
        winAmount: null
      }))
    );
  }, []);
  
  // Process the game loop
  useEffect(() => {
    let intervalId;
    
    if (isGameActive && gamePhase === 'flying') {
      intervalId = window.setInterval(() => {
        setGameTimer(prev => prev + TICK_RATE);
        
        setCurrentMultiplier(prev => {
          const newMultiplier = prev + (prev * MULTIPLIER_INCREASE_RATE);
          
          // Check for auto cashouts
          setPlayers(prevPlayers => 
            prevPlayers.map(player => {
              if (!player.isCashedOut && player.bet > 0) {
                const autoCashoutTarget = player.id === 'player1' ? 1.5 : (player.id === 'player2' ? 2.0 : null);
                if (autoCashoutTarget && newMultiplier >= autoCashoutTarget) {
                  return {
                    ...player,
                    isCashedOut: true,
                    multiplier: newMultiplier,
                    winAmount: player.bet * newMultiplier
                  };
                }
              }
              return player;
            })
          );
          
          // Check if game should crash
          if (crashPoint !== null && newMultiplier >= crashPoint) {
            setIsGameActive(false);
            setGamePhase('crashed');
            
            // Add to game history
            setGameHistory(prev => [
              {
                id: Math.random().toString(36).substring(2, 9),
                crashPoint: newMultiplier,
                timestamp: Date.now()
              },
              ...prev.slice(0, 19)
            ]);
            
            // Schedule next round
            setTimeout(() => {
              setGamePhase('waiting');
              setTimeout(startGame, 3000);
            }, 2000);
            
            return newMultiplier;
          }
          
          return newMultiplier;
        });
      }, TICK_RATE);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isGameActive, gamePhase, crashPoint, startGame]);
  
  // Manually cash out a player
  const cashOut = useCallback(async (playerId) => {
    if (!isGameActive || gamePhase !== 'flying') return;

    try {
      const player = players.find(p => p.id === playerId);
      if (!player || player.isCashedOut) return;

      const winAmount = player.bet * currentMultiplier;

      const response = await fetch('http://localhost:5000/api/transactions/win', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          betAmount: player.bet,
          winAmount,
          multiplier: currentMultiplier
        })
      });

      if (!response.ok) throw new Error('Failed to process win');

      // Update player status after successful transaction
      setPlayers(prev => prev.map(p => 
        p.id === playerId 
          ? { ...p, isCashedOut: true, multiplier: currentMultiplier, winAmount }
          : p
      ));
    } catch (error) {
      console.error('Cashout error:', error);
    }
  }, [isGameActive, gamePhase, currentMultiplier, players]);
  
  // Place a bet
  const placeBet = useCallback(async (playerId, amount, autoCashout = null) => {
    if (gamePhase !== 'waiting') return;

    try {
      // Record bet transaction first
      const response = await fetch('http://localhost:5000/api/transactions/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount, autoCashout })
      });

      if (!response.ok) throw new Error('Failed to place bet');
      
      // Update players after successful transaction
      setPlayers(prevPlayers => {
        const existingPlayerIndex = prevPlayers.findIndex(p => p.id === playerId);
        const playerData = {
          id: playerId,
          bet: amount,
          autoCashout,
          isCashedOut: false,
          multiplier: null,
          winAmount: null
        };

        if (existingPlayerIndex >= 0) {
          return prevPlayers.map((p, i) => 
            i === existingPlayerIndex ? { ...p, ...playerData } : p
          );
        }
        return [...prevPlayers, playerData];
      });
    } catch (error) {
      console.error('Bet error:', error);
    }
  }, [gamePhase]);
  
  // Initialize the game
  useEffect(() => {
    setPlayers([
      {
        id: 'player1',
        name: 'Alex',
        avatar: 'https://i.pravatar.cc/150?u=player1',
        bet: 25,
        multiplier: null,
        isCashedOut: false,
        winAmount: null
      },
      {
        id: 'player2',
        name: 'Sophia',
        avatar: 'https://i.pravatar.cc/150?u=player2',
        bet: 50,
        multiplier: null,
        isCashedOut: false,
        winAmount: null
      },
      {
        id: 'player3',
        name: 'Miguel',
        avatar: 'https://i.pravatar.cc/150?u=player3',
        bet: 100,
        multiplier: null,
        isCashedOut: false,
        winAmount: null
      }
    ]);
    
    setGameHistory([
      { id: '1', crashPoint: 1.24, timestamp: Date.now() - 60000 },
      { id: '2', crashPoint: 3.57, timestamp: Date.now() - 120000 },
      { id: '3', crashPoint: 1.92, timestamp: Date.now() - 180000 },
      { id: '4', crashPoint: 4.12, timestamp: Date.now() - 240000 },
      { id: '5', crashPoint: 1.35, timestamp: Date.now() - 300000 }
    ]);
    
    setTimeout(startGame, 3000);
  }, [startGame]);
  
  return {
    currentMultiplier,
    gamePhase,
    gameHistory,
    players,
    gameTimer,
    startGame,
    cashOut,
    placeBet,
    lastGameVerification,
    verifyLastGame: () => {
      const serverSeed = window.localStorage.getItem('lastServerSeed');
      const clientSeed = window.localStorage.getItem('lastClientSeed');
      const storedCrashPoint = parseFloat(window.localStorage.getItem('lastCrashPoint'));
      
      if (serverSeed && clientSeed && storedCrashPoint) {
        const calculatedCrashPoint = calculateCrashPoint(serverSeed, clientSeed);
        setLastGameVerification({
          verified: Math.abs(calculatedCrashPoint - storedCrashPoint) < 0.0001,
          serverSeed,
          clientSeed,
          crashPoint: storedCrashPoint
        });
      }
    }
  };
};