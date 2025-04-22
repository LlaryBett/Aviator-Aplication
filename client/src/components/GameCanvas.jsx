import React, { useRef } from 'react';
import { Plane } from 'lucide-react';

const GameCanvas = ({ multiplier, gamePhase }) => {
  const canvasRef = useRef(null);
  
  const calculatePosition = () => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    const logMultiplier = Math.log(multiplier) / Math.log(10);
    const x = Math.min(width * 0.1 + (width * 0.6 * logMultiplier), width * 0.9);
    const y = Math.max(height * 0.8 - (height * 0.6 * logMultiplier), height * 0.2);
    return { x, y };
  };
  
  const position = calculatePosition();
  
  const formatMultiplier = (value) => {
    if (value < 2) return value.toFixed(2);
    if (value < 10) return value.toFixed(1);
    return value.toFixed(0);
  };

  return (
    <div className="relative w-full h-96 sm:h-[450px] bg-gradient-to-b from-indigo-900 to-gray-900 rounded-lg overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/5 w-24 h-12 bg-white/20 rounded-full blur-md"></div>
        <div className="absolute top-1/3 left-2/3 w-32 h-16 bg-white/10 rounded-full blur-md"></div>
        <div className="absolute top-1/2 left-1/3 w-20 h-10 bg-white/15 rounded-full blur-md"></div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-1/3 h-2 bg-yellow-400"></div>
      
      <div ref={canvasRef} className="relative w-full h-full">
        <div 
          className={`absolute transition-all duration-100 ease-out transform ${
            gamePhase === 'crashed' ? 'animate-bounce text-red-500' : 
            gamePhase === 'waiting' ? 'text-gray-400' : 'text-white'
          }`}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: `rotate(${gamePhase === 'crashed' ? '45' : '0'}deg)`
          }}
        >
          <Plane size={36} />
        </div>
        
        {gamePhase === 'flying' && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d={`M 50,${canvasRef.current?.clientHeight || 0} L ${position.x + 18},${position.y + 18}`}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />
          </svg>
        )}
      </div>
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className={`text-6xl sm:text-8xl font-bold transition-all duration-100 
          ${gamePhase === 'crashed' ? 'text-red-500 animate-pulse' : 'text-white'}`}
        >
          {formatMultiplier(multiplier)}x
        </div>
      </div>
      
      {gamePhase === 'waiting' && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 bg-indigo-600/70 px-4 py-2 rounded-full text-white">
          Next round starting soon...
        </div>
      )}
      
      {gamePhase === 'crashed' && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 bg-red-600/80 px-6 py-3 rounded-full text-white text-xl animate-pulse">
          CRASHED!
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
