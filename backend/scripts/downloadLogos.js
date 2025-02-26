const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const Match = require('../models/Match');

async function downloadLogo(url, filepath) {
  // Check if file already exists
  if (fs.existsSync(filepath)) {
    console.log(`Logo already exists: ${filepath}`);
    return;
  }

  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      writer.on('finish', () => {
        console.log(`Successfully downloaded: ${filepath}`);
        resolve();
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
  }
}

async function downloadAllLogos() {
  try {
    // Create directories in frontend/public
    const teamsDir = path.join(__dirname, '../../frontend/public/logos/teams');
    const competitionsDir = path.join(__dirname, '../../frontend/public/logos/competitions');
    
    fs.mkdirSync(teamsDir, { recursive: true });
    fs.mkdirSync(competitionsDir, { recursive: true });

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all matches from database
    const matches = await Match.find({});
    console.log(`Found ${matches.length} matches`);

    const uniqueTeams = new Set();
    const uniqueCompetitions = new Set();

    // Collect unique teams and competitions
    matches.forEach(match => {
      if (match.homeTeam?.crest) {
        uniqueTeams.add(JSON.stringify({ id: match.homeTeam.id, crest: match.homeTeam.crest }));
      }
      if (match.awayTeam?.crest) {
        uniqueTeams.add(JSON.stringify({ id: match.awayTeam.id, crest: match.awayTeam.crest }));
      }
      if (match.competition?.emblem) {
        uniqueCompetitions.add(JSON.stringify({ id: match.competition.id, emblem: match.competition.emblem }));
      }
    });

    // Download team logos
    let newTeamLogos = 0;
    console.log(`Checking ${uniqueTeams.size} team logos...`);
    for (const teamString of uniqueTeams) {
      const team = JSON.parse(teamString);
      const filepath = path.join(teamsDir, `${team.id}.png`);
      if (!fs.existsSync(filepath)) {
        await downloadLogo(team.crest, filepath);
        newTeamLogos++;
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Download competition logos
    let newCompetitionLogos = 0;
    console.log(`Checking ${uniqueCompetitions.size} competition logos...`);
    for (const competitionString of uniqueCompetitions) {
      const competition = JSON.parse(competitionString);
      const filepath = path.join(competitionsDir, `${competition.id}.png`);
      if (!fs.existsSync(filepath)) {
        await downloadLogo(competition.emblem, filepath);
        newCompetitionLogos++;
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Download complete!`);
    console.log(`New team logos downloaded: ${newTeamLogos}`);
    console.log(`New competition logos downloaded: ${newCompetitionLogos}`);
    process.exit(0);
  } catch (error) {
    console.error('Error downloading logos:', error);
    process.exit(1);
  }
}

// Run the script
downloadAllLogos();