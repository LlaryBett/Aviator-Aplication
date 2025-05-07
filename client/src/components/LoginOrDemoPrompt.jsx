import React from 'react';

const LoginOrDemoPrompt = ({ onPlayLive, onPlayDemo }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Blurred background */}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
    {/* Modal content */}
    <div className="relative bg-gray-800 rounded-lg p-8 shadow-lg flex flex-col items-center animate-fade-in">
      <h2 className="text-xl font-bold text-white mb-4">Choose Mode</h2>
      <button
        className="w-48 mb-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
        onClick={onPlayLive}
      >
        Play Live (Login Required)
      </button>
      <button
        className="w-48 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold"
        onClick={() => onPlayDemo(5000)}
      >
        Play Demo
      </button>
    </div>
    {/* Optional: Add a simple fade-in animation */}
    <style>
      {`
        .animate-fade-in {
          animation: fadeInModal 0.25s cubic-bezier(.4,0,.2,1);
        }
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.96);}
          to { opacity: 1; transform: scale(1);}
        }
      `}
    </style>
  </div>
);

export default LoginOrDemoPrompt;
