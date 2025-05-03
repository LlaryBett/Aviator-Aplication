import React, { memo, useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import PropTypes from 'prop-types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const LivePlayers = memo(({ players, currentMultiplier }) => {
  // Add this style block at the top of the component
  const blinkAnimation = `
    @keyframes crashBlink {
      0% { color: #22c55e; }
      50% { color: #ef4444; }
      100% { color: #ef4444; }
    }
  `;

  const [localPlayers, setLocalPlayers] = useState([]);
  const [blinkingPlayers, setBlinkingPlayers] = useState({});
  const removeTimerRefs = useRef({});
  const tableRef = useRef(null);
  const displayCount = 20;

  useEffect(() => {
    // Filter out players with zero stake
    const filteredPlayers = players.filter(player => player.betAmount > 0);

    // Randomly select top players
    const shuffledPlayers = [...filteredPlayers].sort(() => 0.5 - Math.random());
    const topPlayers = shuffledPlayers.slice(0, displayCount);

    setLocalPlayers(topPlayers);
  }, [players]);

  useEffect(() => {
    localPlayers.forEach(player => {
      if ((player.status === 'cashed_out' || player.status === 'crashed') && !blinkingPlayers[player.betId]) {
        setBlinkingPlayers(prev => ({ ...prev, [player.betId]: true }));

        // Clear any existing timer for this player
        if (removeTimerRefs.current[player.betId]) {
          clearTimeout(removeTimerRefs.current[player.betId]);
        }

        // Set a new timer to remove the player
        removeTimerRefs.current[player.betId] = setTimeout(() => {
          setLocalPlayers(prev => prev.filter(p => p.betId !== player.betId));
          setBlinkingPlayers(prev => {
            const { [player.betId]: _, ...rest } = prev;
            return rest;
          });
        }, 1000);
      }
    });

    // Cleanup function to clear timers when component unmounts or players change
    return () => {
      Object.values(removeTimerRefs.current).forEach(timer => clearTimeout(timer));
      removeTimerRefs.current = {};
    };
  }, [localPlayers, blinkingPlayers]);

  const getPlayerStatus = (player) => {
    const multiplier = typeof currentMultiplier === 'number' ? currentMultiplier : 0;
    const possibleWin = player.betAmount * multiplier;
    
    if (player.status === 'betting') {
      return {
        className: 'text-green-400 animate-pulse',
        text: `${possibleWin.toFixed(2)} KES`
      };
    } else if (player.status === 'cashed_out') {
      return {
        className: 'text-green-400',
        text: `Won ${player.winAmount.toFixed(2)} KES`
      };
    } else if (player.status === 'crashed') {
      return {
        className: 'animate-[crashBlink_0.5s_ease-in_forwards]',
        text: `${multiplier.toFixed(2)}x`
      };
    }
    return { className: 'text-gray-400', text: 'Waiting...' };
  };

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  }, [localPlayers]);

  // Add WebSocket connection
  useEffect(() => {
    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      const wsUrl = BACKEND_URL.replace(/^http/, 'ws');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ LivePlayers WebSocket connected');
        reconnectAttempts = 0;
      };

      ws.onclose = () => {
        console.log('❌ LivePlayers WebSocket closed');
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connectWebSocket, 1000 * reconnectAttempts);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch(data.type) {
            case 'player_bet':
              // Add new player to the list
              setLocalPlayers(prev => [data.player, ...prev].slice(0, displayCount));
              break;
            
            case 'player_cashout':
              // Update player status on cashout
              setLocalPlayers(prev => 
                prev.map(p => 
                  p.betId === data.betId 
                    ? { ...p, status: 'cashed_out', multiplier: data.multiplier, winAmount: data.winAmount }
                    : p
                )
              );
              break;
            
            case 'player_crash':
              // Update player status on crash
              setLocalPlayers(prev => 
                prev.map(p => 
                  p.betId === data.betId 
                    ? { ...p, status: 'crashed', multiplier: data.crashPoint }
                    : p
                )
              );
              break;

            case 'game_start':
              // Clear players that are not betting in the new round
              setLocalPlayers(prev => prev.filter(p => p.status === 'betting'));
              break;
          }
        } catch (e) {
          console.error('LivePlayers WebSocket message error:', e);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <>
      <style>{blinkAnimation}</style>
      <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users size={18} className="text-gray-400" />
            Live Players
          </h3>
          <span className="text-xs text-gray-400">
            {localPlayers.length} Active
          </span>
        </div>

        {localPlayers.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            No active players...
          </div>
        ) : (
          <div className="overflow-y-auto h-[400px]">
            <table ref={tableRef} className="table-auto w-full text-left text-gray-300">
              <thead className="bg-gray-700/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Player</th>
                  <th className="px-4 py-2">Stake (KES)</th>
                  <th className="px-4 py-2">Possible Win</th>
                </tr>
              </thead>
              <tbody>
                {localPlayers.map((player) => {
                  const status = getPlayerStatus(player);
                  return (
                    <tr
                      key={player.betId}
                      className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-all ${
                        blinkingPlayers[player.betId] ? 'opacity-0 duration-1000' : 'opacity-100'
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://i.pravatar.cc/150?u=${player.username}`}
                            alt=""
                            className="w-8 h-8 rounded-full bg-gray-600"
                          />
                          <span className="font-medium">{player.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {player.betAmount.toFixed(2)}
                      </td>
                      <td className={`px-4 py-2 font-medium ${status.className}`}>
                        {status.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
});

LivePlayers.propTypes = {
  players: PropTypes.arrayOf(
    PropTypes.shape({
      betId: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      avatar: PropTypes.string.isRequired,
      betAmount: PropTypes.number.isRequired,
      status: PropTypes.oneOf(['betting', 'cashed_out', 'crashed']).isRequired,
      multiplier: PropTypes.number,
      winAmount: PropTypes.number,
      crashPoint: PropTypes.number,
    })
  ).isRequired,
  currentMultiplier: PropTypes.number.isRequired,
};

export default LivePlayers;
