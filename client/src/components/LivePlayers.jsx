import React, { memo, useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import PropTypes from 'prop-types';
import { generateAnonymousName } from '../utils/nameGenerator';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const generateDummyPlayer = (id) => ({
  betId: `dummy${id}_${Date.now()}`, // Unique ID with timestamp
  username: generateAnonymousName(),
  betAmount: Math.floor(Math.random() * 900) + 100,
  status: 'betting',
  targetMultiplier: (Math.random() * 3) + 1.2
});

const LivePlayers = memo(({ players, currentMultiplier }) => {
  // Add both red and green blink animations
  const blinkAnimation = `
    @keyframes crashBlink {
      0% { color: #22c55e; }
      25% { color: #ef4444; }
      50% { color: #ef4444; }
      75% { color: #ef4444; }
      100% { color: #ef4444; }
    }
    @keyframes cashoutBlink {
      0% { color: #ef4444; }
      50% { color: #22c55e; }
      100% { color: #22c55e; }
    }
  `;

  const [localPlayers, setLocalPlayers] = useState([]);
  const [dummyMultiplier, setDummyMultiplier] = useState(1.0);
  const [activeCount, setActiveCount] = useState(() => Math.floor(Math.random() * 400) + 100);
  const tableRef = useRef(null);
  const displayCount = 20;

  useEffect(() => {
    const minPlayers = 10;
    const addNewPlayers = (currentPlayers) => {
      const activePlayers = currentPlayers.filter(p => p.status === 'betting').length;
      const newPlayers = [];
      while (activePlayers + newPlayers.length < minPlayers) {
        newPlayers.push(generateDummyPlayer(Date.now() + Math.random()));
      }
      return [...currentPlayers, ...newPlayers].slice(0, displayCount);
    };

    if (players.length === 0) {
      setLocalPlayers(prev => addNewPlayers(prev));

      let crashedTimeout = null;

      const multiplierInterval = setInterval(() => {
        setDummyMultiplier(prev => {
          const newMultiplier = prev + (prev * 0.005);

          setLocalPlayers(prevPlayers => {
            // 1. Update statuses and randomize names/stakes for all dummy players
            let updatedPlayers = prevPlayers.map(player => {
              if (!player.betId.startsWith('dummy')) return player;

              // Always randomize name and stake for every dummy player on every tick
              const newName = generateAnonymousName();
              const newStake = Math.floor(Math.random() * 900) + 100;

              if (player.status !== 'betting') {
                // If not betting, replace with a new player (fresh name, stake, etc)
                return generateDummyPlayer(Date.now() + Math.random());
              }

              // Make crashes rare (e.g. 2% after 2x), wins are much more likely
              const crashChance = newMultiplier > 2 ? 0.02 : 0.001;
              if (Math.random() < crashChance) {
                return {
                  ...player,
                  username: newName,
                  betAmount: newStake,
                  status: 'crashed',
                  multiplier: newMultiplier
                };
              }

              if (newMultiplier >= player.targetMultiplier) {
                return {
                  ...player,
                  username: newName,
                  betAmount: newStake,
                  status: 'cashed_out',
                  multiplier: player.targetMultiplier,
                  winAmount: newStake * player.targetMultiplier // use new stake for realism
                };
              }

              // For betting, always update name and stake
              return {
                ...player,
                username: newName,
                betAmount: newStake
              };
            });

            // 2. Replace crashed/cashed_out players after their animation
            if (
              updatedPlayers.some(p => p.status === 'crashed' || p.status === 'cashed_out') &&
              !crashedTimeout
            ) {
              crashedTimeout = setTimeout(() => {
                setLocalPlayers(current => {
                  let replaced = current.map(player =>
                    (player.status === 'crashed' || player.status === 'cashed_out')
                      ? generateDummyPlayer(Date.now() + Math.random())
                      : player
                  );
                  replaced = addNewPlayers(replaced);
                  return replaced;
                });
                crashedTimeout = null;
              }, 2000);
            }

            updatedPlayers = addNewPlayers(updatedPlayers);
            return updatedPlayers;
          });

          return newMultiplier;
        });
      }, 300);

      const resetInterval = setInterval(() => {
        setDummyMultiplier(1.0);
      }, 10000);

      return () => {
        clearInterval(multiplierInterval);
        clearInterval(resetInterval);
        if (crashedTimeout) clearTimeout(crashedTimeout);
      };
    }
  }, [players.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCount(Math.floor(Math.random() * 400) + 100);
    }, 2000);
    return () => clearInterval(interval);
  }, [players.length]);

  useEffect(() => {
    console.log('Local players updated:', localPlayers);
  }, [localPlayers]);

  const getPlayerStatus = (player) => {
    const multiplier = player.betId.startsWith('dummy') ? dummyMultiplier : currentMultiplier;
    const possibleWin = player.betAmount * multiplier;

    if (player.status === 'betting') {
      return {
        className: 'text-green-400 animate-pulse',
        text: `${possibleWin.toFixed(2)} KES`
      };
    } else if (player.status === 'cashed_out') {
      return {
        className: 'text-green-400 animate-[cashoutBlink_0.8s_ease-in_forwards]',
        text: `Won ${player.winAmount.toFixed(2)} KES`
      };
    } else if (player.status === 'crashed') {
      return {
        className: 'text-red-500 animate-[crashBlink_2s_ease-in_forwards]', // Longer animation
        text: `${player.betAmount.toFixed(2)} KES`
      };
    }
    return { className: 'text-gray-400', text: 'Waiting...' };
  };

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  }, [localPlayers]);

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
              setLocalPlayers(prev => [data.player, ...prev].slice(0, displayCount));
              break;
            
            case 'player_cashout':
              setLocalPlayers(prev => 
                prev.map(p => 
                  p.betId === data.betId 
                    ? { ...p, status: 'cashed_out', multiplier: data.multiplier, winAmount: data.winAmount }
                    : p
                )
              );
              break;
            
            case 'player_crash':
              setLocalPlayers(prev => 
                prev.map(p => 
                  p.betId === data.betId 
                    ? { ...p, status: 'crashed', multiplier: data.crashPoint }
                    : p
                )
              );
              break;

            case 'game_start':
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
            {activeCount} Active
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
                      className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-all`}
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
