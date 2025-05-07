import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { generateAnonymousName } from '../utils/nameGenerator';

const generateDummyLeader = (id) => ({
  id: `dummy_leader_${id}_${Date.now()}`,
  username: generateAnonymousName(),
  winAmount: Math.floor(Math.random() * 50000) + 1000,
  multiplier: (Math.random() * 4 + 1).toFixed(2),
  avatar: `https://i.pravatar.cc/150?u=leader${id}`,
});

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [activeCount, setActiveCount] = useState(() => Math.floor(Math.random() * 400) + 100);

  useEffect(() => {
    // Dummy leaderboard logic: always randomize names, win amounts, multipliers
    const updateLeaders = () => {
      const dummyLeaders = Array.from({ length: 10 }, (_, i) => generateDummyLeader(i + 1));
      setLeaders(dummyLeaders);
    };

    updateLeaders();
    const interval = setInterval(updateLeaders, 2000);

    // Also randomize active count for realism
    const activeInterval = setInterval(() => {
      setActiveCount(Math.floor(Math.random() * 400) + 100);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(activeInterval);
    };
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Trophy className="mr-2 text-yellow-500" />
        Top Winners
        <span className="ml-auto text-xs text-gray-400">{activeCount} Active</span>
      </h2>
      <div className="space-y-2">
        {leaders.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between p-2 rounded bg-gray-700/50 hover:bg-gray-700 transition-all"
          >
            <div className="flex items-center">
              <img
                src={`https://i.pravatar.cc/150?u=${player.username}`}
                alt=""
                className="w-7 h-7 rounded-full mr-2 bg-gray-600"
              />
              <span className="font-medium text-white">{player.username}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-teal-400">
                {player.winAmount.toLocaleString()} KES
              </div>
              <div className="text-xs text-gray-400">
                {player.multiplier}x
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;