import crypto from 'crypto-js';

export const generateServerSeed = () => {
    return crypto.lib.WordArray.random(32).toString();
};

export const generateClientSeed = () => {
    return crypto.lib.WordArray.random(16).toString();
};

export const calculateCrashPoint = (serverSeed, clientSeed) => {
    // Combine seeds
    const combinedHash = crypto.HmacSHA256(clientSeed, serverSeed).toString();
    
    // Convert first 4 bytes to an integer
    const hash = parseInt(combinedHash.slice(0, 8), 16);
    
    // Generate float between 0 and 1
    const h = hash / Math.pow(2, 32);

    // House edge 1%
    const houseEdge = 0.99;

    // Calculate crash point using inverse function
    return Math.max(1.00, (1 / (1 - (h * houseEdge))));
};
