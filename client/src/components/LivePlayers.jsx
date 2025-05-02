import React, { memo, useState, useEffect, useRef } from 'react';
import { Users } from 'lucide-react';
import PropTypes from 'prop-types';

const LivePlayers = memo(({ players, currentMultiplier }) => {
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
    let className = '';
    let text = '';

    if (player.status === 'betting') {
      className = 'text-green-400 animate-pulse';
      text = `${(player.betAmount * multiplier).toFixed(2)}`;
    } else if (player.status === 'cashed_out') {
      className = 'text-green-400 animate-pulse';
      text = `${player.multiplier}x`;
    } else if (player.status === 'crashed') {
      className = 'text-red-400 animate-pulse';
      text = `Crashed at ${player.multiplier}x`;
    } else {
      className = 'text-gray-400';
      text = 'Waiting...';
    }

    return { className, text };
  };

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = 0;
    }
  }, [localPlayers]);

  return (
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
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2">Stake</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {localPlayers.map((player) => {
                const status = getPlayerStatus(player);
                return (
                  <tr
                    key={player.betId}
                    className={`border-b border-gray-700 ${blinkingPlayers[player.betId] ? 'opacity-0 transition-opacity duration-1000' : ''}`}
                  >
                    <td className="px-4 py-2 flex items-center space-x-2">
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <span>{player.username}</span>
                    </td>
                    <td className="px-4 py-2">
                      {typeof player.betAmount === 'number' ? player.betAmount.toFixed(2) : '0.00'}
                    </td>
                    <td className={`px-4 py-2 text-sm ${status.className}`}>
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
