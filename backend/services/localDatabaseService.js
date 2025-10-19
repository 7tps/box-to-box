const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/players.json');

let playersCache = null;

/**
 * Load the local player database
 */
function loadDatabase() {
  if (playersCache) {
    return playersCache;
  }
  
  if (!fs.existsSync(DB_PATH)) {
    console.warn('⚠️  Local player database not found. Run: node backend/scripts/buildPlayerDatabase.js');
    return [];
  }
  
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    playersCache = JSON.parse(data);
    console.log(`✅ Loaded ${playersCache.length} players from local database`);
    return playersCache;
  } catch (error) {
    console.error('❌ Error loading player database:', error.message);
    return [];
  }
}

/**
 * Find players matching criteria using local database
 */
function findPlayersByCriteria(criteria1, criteria2) {
  const players = loadDatabase();
  
  if (players.length === 0) {
    console.log('⚠️  No local database available, returning empty');
    return [];
  }
  
  console.log(`🔍 Searching local DB: ${criteria1.label} (${criteria1.type}) AND ${criteria2.label} (${criteria2.type})`);
  
  const matches = players.filter(player => {
    return matchesCriteria(player, criteria1) && matchesCriteria(player, criteria2);
  });
  
  console.log(`✅ Found ${matches.length} players in local DB`);
  
  return matches.map(p => ({
    qid: p.qid,
    label: p.name
  }));
}

/**
 * Check if a player matches a specific criterion
 */
function matchesCriteria(player, criteria) {
  if (criteria.type === 'country') {
    return player.country && 
           player.country.toLowerCase() === criteria.label.toLowerCase();
  }
  
  if (criteria.type === 'club') {
    return player.clubs && 
           player.clubs.some(club => 
             club.toLowerCase().includes(criteria.label.toLowerCase()) ||
             criteria.label.toLowerCase().includes(club.toLowerCase())
           );
  }
  
  if (criteria.qid === 'WORLD_CUP') {
    return player.worldCupWinner === true;
  }
  
  if (criteria.qid === 'CHAMPIONS_LEAGUE') {
    return player.championsLeagueWinner === true;
  }
  
  if (criteria.qid === 'BALLON_DOR') {
    return player.ballonDor === true;
  }
  
  return false;
}

/**
 * Search for players by name with career years
 */
function searchPlayersByName(query) {
  const players = loadDatabase();
  const normalized = query.toLowerCase().trim();
  
  return players
    .filter(p => p.name.toLowerCase().includes(normalized))
    .sort((a, b) => {
      // Prioritize exact matches and famous players
      const aExact = a.name.toLowerCase() === normalized;
      const bExact = b.name.toLowerCase() === normalized;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Sort by number of achievements (more = more famous)
      const aAchievements = (a.ballonDor ? 1 : 0) + 
                           (a.worldCupWinner ? 1 : 0) + 
                           (a.championsLeagueWinner ? 1 : 0);
      const bAchievements = (b.ballonDor ? 1 : 0) + 
                           (b.worldCupWinner ? 1 : 0) + 
                           (b.championsLeagueWinner ? 1 : 0);
      return bAchievements - aAchievements;
    })
    .slice(0, 15)
    .map(p => {
      // Calculate career years from achievements
      let startYear = null;
      let endYear = null;
      
      if (p.worldCupYears && p.worldCupYears.length > 0) {
        const years = p.worldCupYears.map(y => parseInt(y));
        startYear = Math.min(...years);
        endYear = Math.max(...years);
      }
      
      if (p.championsLeagueYears && p.championsLeagueYears.length > 0) {
        const years = p.championsLeagueYears.map(y => parseInt(y));
        if (!startYear || Math.min(...years) < startYear) startYear = Math.min(...years);
        if (!endYear || Math.max(...years) > endYear) endYear = Math.max(...years);
      }
      
      if (p.ballonDorYears && p.ballonDorYears.length > 0) {
        const years = p.ballonDorYears;
        if (!startYear || Math.min(...years) < startYear) startYear = Math.min(...years);
        if (!endYear || Math.max(...years) > endYear) endYear = Math.max(...years);
      }
      
      // Estimate career span (usually 15-20 years)
      if (startYear) {
        startYear = Math.max(1950, startYear - 5); // Start ~5 years before first achievement
        if (!endYear) endYear = startYear + 15;
        endYear = Math.min(2024, endYear + 3); // End ~3 years after last achievement
      }
      
      return {
        qid: p.qid,
        label: p.name,
        country: p.country,
        years: startYear && endYear ? `${startYear}-${endYear}` : null,
        clubs: p.clubs || []
      };
    });
}

/**
 * Get stats about the database
 */
function getDatabaseStats() {
  const players = loadDatabase();
  
  return {
    totalPlayers: players.length,
    withClubs: players.filter(p => p.clubs && p.clubs.length > 0).length,
    worldCupWinners: players.filter(p => p.worldCupWinner).length,
    championsLeagueWinners: players.filter(p => p.championsLeagueWinner).length,
    ballonDorWinners: players.filter(p => p.ballonDor).length,
    byCountry: players.reduce((acc, p) => {
      const country = p.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {})
  };
}

module.exports = {
  loadDatabase,
  findPlayersByCriteria,
  searchPlayersByName,
  getDatabaseStats
};

