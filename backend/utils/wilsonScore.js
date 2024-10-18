function calculateWilsonScore(correctVotes, totalVotes) {
  if (totalVotes === 0) return 0;
  
  const z = 1.96; // 95% confidence level
  const p = correctVotes / totalVotes;
  
  const numerator = p + z*z/(2*totalVotes) - z * Math.sqrt((p*(1-p) + z*z/(4*totalVotes))/totalVotes);
  const denominator = 1 + z*z/totalVotes;
  
  return numerator / denominator;
}

module.exports = calculateWilsonScore;