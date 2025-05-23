import { useState, useEffect, useCallback } from 'react';
import { generateRandomSeed, calculateCrashPoint } from './cryptoUtils';

// Constants
const TICK_RATE = 50; // ms
const MULTIPLIER_INCREASE_RATE = 0.01;
const MIN_CRASH_MULTIPLIER = 1.0;
const MAX_CRASH_MULTIPLIER = 1000.0;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Generate crash point using cryptographic hashes
export const generateCrashPoint = async () => {
  const serverSeed = generateRandomSeed();
  const clientSeed = generateRandomSeed();

  const crashPoint = await calculateCrashPoint(serverSeed, clientSeed);

  // Store for verification
  window.localStorage.setItem('lastServerSeed', serverSeed);
  window.localStorage.setItem('lastClientSeed', clientSeed);
  window.localStorage.setItem('lastCrashPoint', crashPoint.toString());

  return { crashPoint, serverSeed, clientSeed };
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
  const [lastRoundSeeds, setLastRoundSeeds] = useState({ serverSeed: '', clientSeed: '', crashPoint: null });

  // Start a new game round
  const startGame = useCallback(async () => {
    const { crashPoint, serverSeed, clientSeed } = await generateCrashPoint();
    setCrashPoint(crashPoint);
    setCurrentMultiplier(1.0);
    setIsGameActive(true);
    setGamePhase('flying');
    setGameTimer(0);

    setLastRoundSeeds({ serverSeed, clientSeed, crashPoint });

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

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // Prevent double cashout attempts
    if (player.isCashedOut) {
      console.warn(`[gameLogic] Cashout ignored: player ${playerId} already cashed out.`);
      return;
    }
    if (!player.betId) {
      console.warn(`[gameLogic] Cashout ignored: player ${playerId} has no betId.`);
      return;
    }

    try {
      const winAmount = player.bet * currentMultiplier;

      // You must have betId stored on the player object when the bet is placed!
      if (!player.betId) {
        console.error('No betId found for player:', playerId, player); // Log player object for debugging
        throw new Error('No betId for cashout');
      }

      const response = await fetch(`${BACKEND_URL}/api/transactions/win`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          betId: player.betId, // <-- this is required!
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
  const placeBet = useCallback((playerId, amount, autoCashout = null, betId = null) => {
    // Only update local players state, do NOT call backend here!
    setPlayers(prevPlayers => {
      const existingPlayerIndex = prevPlayers.findIndex(p => p.id === playerId);
      const playerData = {
        id: playerId,
        bet: amount,
        autoCashout,
        isCashedOut: false,
        multiplier: null,
        winAmount: null,
        betId // <-- ensure betId is set if provided
      };

      if (existingPlayerIndex >= 0) {
        return prevPlayers.map((p, i) => 
          i === existingPlayerIndex ? { ...p, ...playerData } : p
        );
      }
      return [...prevPlayers, playerData];
    });
  }, []);

  // Update player's betId after a successful bet
  const setPlayerBetId = useCallback((playerId, betId) => {
    setPlayers(prevPlayers =>
      prevPlayers.map(player =>
        player.id === playerId ? { ...player, betId } : player
      )
    );
    console.log(`[gameLogic] setPlayerBetId: playerId=${playerId}, betId=${betId}`);
  }, []);
  
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
    placeBet, // <-- now accepts betId as optional 4th argument
    setPlayerBetId,
    lastGameVerification,
    lastRoundSeeds,
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