import React, { memo } from 'react';
import { Users } from 'lucide-react';

const LivePlayers = memo(({ players, currentMultiplier }) => {
  const sortedPlayers = [...players].sort((a, b) => b.bet - a.bet);
  
  const calculatePotentialWin = (player) => {
    if (player.isCashedOut) return player.winAmount - player.bet;
    if (!player.isCashedOut && player.bet > 0) {
      return (player.bet * currentMultiplier) - player.bet;
    }
    return 0;
  };

  return (
    <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Users size={18} className="mr-2 text-gray-400" />
          Live Players
        </h3>
        <div className="text-xs text-gray-400">
          {players.length} active
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[300px] overscroll-contain">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
              <th className="pb-2">Player</th>
              <th className="pb-2">Bet</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Profit</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => {
              const isWaiting = !player.isCashedOut && player.bet > 0;
              const profit = isWaiting ? calculatePotentialWin(player) : 
                            player.winAmount !== null ? player.winAmount - player.bet : 0;
              
              return (
                <tr key={player.id} className="border-b border-gray-700/50 text-sm">
                  <td className="py-2 flex items-center">
                    <img src={player.avatar} alt={player.name} className="w-6 h-6 rounded-full mr-2" />
                    <span className="text-white">{player.name}</span>
                  </td>
                  <td className="py-2 text-white">ksh{player.bet.toFixed(2)}</td>
                  <td className="py-2">
                    {player.isCashedOut ? (
                      <span className="text-green-500">
                        Cashed out {player.multiplier?.toFixed(2)}x
                      </span>
                    ) : isWaiting ? (
                      <span className="text-yellow-500 animate-pulse">
                        Waiting...
                      </span>
                    ) : (
                      <span className="text-red-500">
                        Lost
                      </span>
                    )}
                  </td>
                  <td className={`py-2 ${profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {isWaiting ? 
                      <span className="animate-pulse">
                        +ksh{(player.bet * currentMultiplier).toFixed(2)}
                      </span> :
                      profit > 0 ? 
                        `+$${profit.toFixed(2)}` : 
                        profit < 0 ? 
                          `-$${Math.abs(profit).toFixed(2)}` : 
                          '$0.00'
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default LivePlayers;
