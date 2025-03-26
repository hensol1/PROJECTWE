// backend/scripts/generateOddsFile.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { format, addDays } = require('date-fns');
const { promisify } = require('util');
require('dotenv').config();

// Create promise-based versions of fs functions
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

// Handle potential model name differences
const getMatchModel = () => {
  try {
    return require('../models/Match');
  } catch (err) {
    try {
      // Try alternative model name if needed
      return require('../models/match');
    } catch (e) {
      console.error('Could not load Match model:', e);
      throw new Error('Match model not found');
    }
  }
};

// MongoDB connection will be handled in the main execution block
// Adding mongoose configuration to handle deprecation warning
mongoose.set('strictQuery', false);

// Create the stats directory if it doesn't exist
const statsDir = path.join(__dirname, '../public/stats');

// Using async function similar to generateStatsFile.js
const ensureDirectoryExists = async (directory) => {
  try {
    await mkdir(directory, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

// Function to generate odds files
async function generateOddsFiles() {
  console.log('Generating odds files...');
  
  try {
    // Ensure the directory exists
    await ensureDirectoryExists(statsDir);
    
    // Generate odds for today and tomorrow
    const today = new Date();
    const dates = [today, addDays(today, 1)];
    
    // Update the manifest file
    const manifestPath = path.join(statsDir, 'manifest.json');
    let manifest = {};
    
    // Load existing manifest if it exists
    try {
      const manifestContent = await readFile(manifestPath, 'utf8');
      try {
        manifest = JSON.parse(manifestContent);
      } catch (e) {
        console.warn('Could not parse existing manifest:', e);
        manifest = {};
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('Error reading manifest file:', err);
      }
      console.log('No existing manifest found, creating new one');
      manifest = {};
    }
    
    // Process each date
    for (const date of dates) {
      const dateStr = format(date, 'yyyy-MM-dd');
      console.log(`Processing matches for ${dateStr}`);
      
      // Query matches for this date
      const startOfDay = new Date(dateStr);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Get the right model instance
      const MatchModel = getMatchModel();
      
      const matches = await MatchModel.find({
        utcDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).lean();
      
      console.log(`Found ${matches.length} matches for ${dateStr}`);
      
      if (matches.length === 0) {
        console.log(`No matches found for ${dateStr}, skipping`);
        continue;
      }
      
      // Group matches by competition
      const matchesByCompetition = {};
      
      matches.forEach(match => {
        if (match.competition && match.competition.id) {
          const compId = match.competition.id;
          if (!matchesByCompetition[compId]) {
            matchesByCompetition[compId] = [];
          }
          matchesByCompetition[compId].push(match);
        }
      });
      
      // Create the odds file
      const oddsFilePath = path.join(statsDir, `odds-${dateStr}.json`);
      await writeFile(oddsFilePath, JSON.stringify(matchesByCompetition));
      
      // Update manifest
      const fileKey = `odds${dateStr.replace(/-/g, '')}`;
      manifest[fileKey] = {
        lastUpdated: Date.now(),
        path: `/stats/odds-${dateStr}.json`,
        count: matches.length
      };
      
      console.log(`Generated odds file for ${dateStr}`);
    }
    
    // Write updated manifest
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Manifest updated');
    
    console.log('Odds file generation complete!');
    return {
      success: true,
      message: 'Odds files generated successfully'
    };
  } catch (error) {
    console.error('Error generating odds files:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// If this script is run directly from command line
if (require.main === module) {
  // Connect to the database
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('MongoDB connected...');
      await generateOddsFiles();
      console.log('Completed successfully');
      mongoose.disconnect();
    })
    .catch(err => {
      console.error('Error in main process:', err);
      process.exit(1);
    });
}

module.exports = generateOddsFiles;