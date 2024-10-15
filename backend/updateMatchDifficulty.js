const mongoose = require('mongoose');
const Match = require('./models/Match');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const updateMatchDifficulty = async () => {
  try {
    const matches = await Match.find({});
    for (const match of matches) {
      if (match.averageOdds && match.averageOdds.home && match.averageOdds.draw && match.averageOdds.away) {
        const odds = [match.averageOdds.home, match.averageOdds.draw, match.averageOdds.away];
        const favoriteOdds = Math.min(...odds);
        match.difficulty = favoriteOdds;
        
        if (match.difficulty < 1.5) {
          match.difficultyCategory = 'Easy';
          match.potentialPoints = 5;
        } else if (match.difficulty < 2.5) {
          match.difficultyCategory = 'Medium';
          match.potentialPoints = 10;
        } else {
          match.difficultyCategory = 'Hard';
          match.potentialPoints = 15;
        }
      } else {
        match.difficulty = 2;
        match.difficultyCategory = 'Medium';
        match.potentialPoints = 10;
      }
      await match.save();
      console.log(`Updated difficulty for match: ${match.id}`);
    }
    console.log('All match difficulties updated successfully');
  } catch (error) {
    console.error('Error updating match difficulties:', error);
  } finally {
    mongoose.disconnect();
  }
};

updateMatchDifficulty();