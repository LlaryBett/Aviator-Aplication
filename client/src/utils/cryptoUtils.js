// Generate a random hex string (for seeds)
export function generateRandomSeed(length = 64) {
  const chars = 'abcdef0123456789';
  let seed = '';
  for (let i = 0; i < length; i++) {
    seed += chars[Math.floor(Math.random() * chars.length)];
  }
  return seed;
}

// Browser-compatible HMAC-SHA256 using SubtleCrypto
export async function calculateCrashPoint(serverSeed, clientSeed) {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(serverSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await window.crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(clientSeed)
  );
  const hashArray = Array.from(new Uint8Array(signature));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const hex16 = hex.slice(0, 16);
  const X = parseInt(hex16, 16);

  // Provably fair crash formula (used by most crash games)
  // If X % 33 == 0, crash at 0 (rare instant crash)
  if (X % 33 === 0) return 0;

  // Calculate multiplier (minimum 1.00x, maximum 100x)
  // --- FIX: Use the correct crash formula ---
  // crash = floor((1/(1 - X / 2^52)) * 100) / 100
  const MAX = 2 ** 52;
  const Y = X % MAX;
  let multiplier = Math.floor((1 / (1 - Y / MAX)) * 100) / 100;
  multiplier = Math.max(1.00, Math.min(100, multiplier));
  return multiplier;
}
