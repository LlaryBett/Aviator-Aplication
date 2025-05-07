const generateAnonymousName = () => {
  const firstLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  const stars = '*****';
  const lastLetter = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
  return `${firstLetter}${stars}${lastLetter}`;
};

export { generateAnonymousName };
