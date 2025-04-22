import { useState, useEffect, useCallback } from 'react';

// Constants
const TICK_RATE = 50; // ms
const MULTIPLIER_INCREASE_RATE = 0.01;
const MIN_CRASH_MULTIPLIER = 1.0;
const MAX_CRASH_MULTIPLIER = 100.0;

// Generate a random crash point based on house edge
export const generateCrashPoint = () => {
  const randomValue = Math.random();
  const houseEdge = 0.95;
  
  if (randomValue < 0.01) {
    return MIN_CRASH_MULTIPLIER + (Math.random() * (MAX_CRASH_MULTIPLIER - 10)) + 10;
  } else {
    return MIN_CRASH_MULTIPLIER + (Math.random() * 9 * houseEdge);
  }
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
  const cashOut = useCallback((playerId) => {
    if (isGameActive && gamePhase === 'flying') {
      setPlayers(prevPlayers => 
        prevPlayers.map(player => {
          if (player.id === playerId && !player.isCashedOut && player.bet > 0) {
            return {
              ...player,
              isCashedOut: true,
              multiplier: currentMultiplier,
              winAmount: player.bet * currentMultiplier
            };
          }
          return player;
        })
      );
    }
  }, [isGameActive, gamePhase, currentMultiplier]);
  
  // Place a bet
  const placeBet = useCallback((playerId, amount) => {
    if (gamePhase === 'waiting') {
      setPlayers(prevPlayers => {
        const playerExists = prevPlayers.some(p => p.id === playerId);
        
        if (playerExists) {
          return prevPlayers.map(player => 
            player.id === playerId 
              ? { ...player, bet: amount, isCashedOut: false, multiplier: null, winAmount: null }
              : player
          );
        } else {
          return [
            ...prevPlayers,
            {
              id: playerId,
              name: `Player ${prevPlayers.length + 1}`,
              avatar: `https://i.pravatar.cc/150?u=${playerId}`,
              bet: amount,
              multiplier: null,
              isCashedOut: false,
              winAmount: null
            }
          ];
        }
      });
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
    placeBet
  };
};