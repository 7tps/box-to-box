const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * One-time script to build a comprehensive player database
 * Scrapes Wikipedia and uses Wikidata for basic player info
 * 
 * Features:
 * - Loads manual achievement data (Ballon d'Or, World Cup, Champions League)
 * - Fetches player data from top clubs via Wikidata SPARQL
 * - Automatic deduplication: prioritizes manual entries over Wikidata entries
 * - Removes duplicate players with incorrect nationalities
 */

const OUTPUT_FILE = path.join(__dirname, '../data/players.json');

// Top clubs from Big 5 leagues
const TOP_CLUBS = {
  'Q7156': 'Barcelona',
  'Q8682': 'Real Madrid',
  'Q8701': 'Atletico Madrid',
  
  'Q18656': 'Manchester United',
  'Q50602': 'Manchester City',
  'Q9616': 'Chelsea',
  'Q1130849': 'Liverpool',
  'Q9617': 'Arsenal',
  'Q18741': 'Tottenham',
  
  'Q1422': 'Juventus',
  'Q1543': 'AC Milan',
  'Q631': 'Inter Milan',
  'Q2641': 'Napoli',
  'Q2739': 'Roma',
  
  'Q15789': 'Bayern Munich',
  'Q41420': 'Borussia Dortmund',
  
  'Q483020': 'PSG'
};

// World Cup winners by year (team QIDs)
const WORLD_CUP_WINNERS = {
  '2022': 'Q79800', // Argentina
  '2018': 'Q142', // France
  '2014': 'Q183', // Germany
  '2010': 'Q29', // Spain
  '2006': 'Q38', // Italy
  '2002': 'Q155', // Brazil
  '1998': 'Q142', // France
  '1994': 'Q155', // Brazil
  '1990': 'Q183', // Germany
  '1986': 'Q414', // Argentina
  '1982': 'Q38', // Italy
  '1978': 'Q414', // Argentina
  '1974': 'Q183', // Germany
  '1970': 'Q155', // Brazil
};

// Major countries
const COUNTRIES = {
  'Q414': 'Argentina',
  'Q155': 'Brazil',
  'Q29': 'Spain',
  'Q183': 'Germany',
  'Q142': 'France',
  'Q38': 'Italy',
  'Q21': 'England',
  'Q45': 'Portugal',
  'Q55': 'Netherlands',
  'Q31': 'Belgium',
  'Q224': 'Croatia',
  'Q77': 'Uruguay',
  'Q96': 'Mexico'
};

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';

async function executeSparqlQuery(query) {
  try {
    const response = await axios.get(WIKIDATA_ENDPOINT, {
      params: { query, format: 'json' },
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'Box-to-Box-Scraper/1.0'
      },
      timeout: 60000
    });
    return response.data.results.bindings;
  } catch (error) {
    console.error('SPARQL error:', error.message);
    return [];
  }
}

async function fetchPlayersForClub(clubQid, clubName) {
  console.log(`📥 Fetching players for ${clubName} (${clubQid})...`);
  
  const query = `
    SELECT DISTINCT ?player ?playerLabel ?countryLabel WHERE {
      ?player p:P54/ps:P54 wd:${clubQid}.
      ?player wdt:P27 ?country.
      ?player wdt:P31 wd:Q5.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;
  
  const results = await executeSparqlQuery(query);
  console.log(`   Found ${results.length} players`);
  
  return results.map(r => ({
    name: r.playerLabel.value,
    qid: r.player.value.split('/').pop(),
    country: r.countryLabel.value,
    clubs: [clubName]
  }));
}

async function fetchWorldCupWinners(year, countryQid) {
  console.log(`🏆 Fetching World Cup ${year} winners (${countryQid})...`);
  
  const query = `
    SELECT DISTINCT ?player ?playerLabel WHERE {
      ?player wdt:P27 wd:${countryQid}.
      ?player wdt:P31 wd:Q5.
      ?player wdt:P106/wdt:P279* wd:Q937857.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;
  
  const results = await executeSparqlQuery(query);
  console.log(`   Found ${results.length} players`);
  
  return results.map(r => ({
    name: r.playerLabel.value,
    qid: r.player.value.split('/').pop(),
    worldCupWinner: true,
    worldCupYears: [year]
  }));
}

async function fetchBallonDorWinners() {
  console.log(`🏅 Fetching Ballon d'Or winners...`);
  
  const query = `
    SELECT DISTINCT ?player ?playerLabel WHERE {
      ?player wdt:P166 wd:Q251566.
      ?player wdt:P31 wd:Q5.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;
  
  const results = await executeSparqlQuery(query);
  console.log(`   Found ${results.length} players`);
  
  return results.map(r => ({
    name: r.playerLabel.value,
    qid: r.player.value.split('/').pop(),
    ballonDor: true
  }));
}

async function buildDatabase() {
  console.log('🚀 Building player database...\n');
  
  const playerMap = new Map();
  
  // Load manual achievements data
  console.log('=== LOADING MANUAL ACHIEVEMENTS DATA ===');
  const manualData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../data/manual-achievements.json'), 'utf8')
  );
  
  // Add Ballon d'Or winners
  console.log('✅ Adding Ballon d\'Or winners...');
  manualData.ballonDorWinners.forEach(p => {
    const key = p.name.toLowerCase();
    playerMap.set(key, {
      name: p.name,
      qid: `MANUAL_${key.replace(/\s/g, '_')}`,
      country: p.country,
      clubs: p.clubs || [],
      ballonDor: true,
      ballonDorYears: p.years
    });
  });
  console.log(`   ${manualData.ballonDorWinners.length} players added`);
  
  // Add World Cup winners
  console.log('✅ Adding World Cup winners...');
  Object.entries(manualData.worldCupWinners).forEach(([year, players]) => {
    players.forEach(p => {
      const key = p.name.toLowerCase();
      if (playerMap.has(key)) {
        const existing = playerMap.get(key);
        existing.worldCupWinner = true;
        existing.worldCupYears = existing.worldCupYears || [];
        existing.worldCupYears.push(year);
        existing.clubs = [...new Set([...(existing.clubs || []), ...(p.clubs || [])])];
      } else {
        playerMap.set(key, {
          name: p.name,
          qid: `MANUAL_${key.replace(/\s/g, '_')}`,
          country: p.country,
          clubs: p.clubs || [],
          worldCupWinner: true,
          worldCupYears: [year]
        });
      }
    });
  });
  console.log(`   ${Object.values(manualData.worldCupWinners).flat().length} players added`);
  
  // Add Champions League winners
  console.log('✅ Adding Champions League winners...');
  Object.entries(manualData.championsLeagueWinners).forEach(([year, players]) => {
    players.forEach(p => {
      const key = p.name.toLowerCase();
      if (playerMap.has(key)) {
        const existing = playerMap.get(key);
        existing.championsLeagueWinner = true;
        existing.championsLeagueYears = existing.championsLeagueYears || [];
        existing.championsLeagueYears.push(year);
        existing.clubs = [...new Set([...(existing.clubs || []), ...(p.clubs || [])])];
        existing.country = existing.country || p.country;
      } else {
        playerMap.set(key, {
          name: p.name,
          qid: `MANUAL_${key.replace(/\s/g, '_')}`,
          country: p.country,
          clubs: p.clubs || [],
          championsLeagueWinner: true,
          championsLeagueYears: [year]
        });
      }
    });
  });
  console.log(`   ${Object.values(manualData.championsLeagueWinners).flat().length} players added\n`);
  
  // Fetch players from top clubs
  console.log('=== TOP CLUBS (from Wikidata) ===');
  for (const [clubQid, clubName] of Object.entries(TOP_CLUBS)) {
    const players = await fetchPlayersForClub(clubQid, clubName);
    players.forEach(p => {
      if (playerMap.has(p.qid)) {
        const existing = playerMap.get(p.qid);
        existing.clubs = existing.clubs || [];
        if (!existing.clubs.includes(clubName)) {
          existing.clubs.push(clubName);
        }
        existing.country = existing.country || p.country;
      } else {
        playerMap.set(p.qid, p);
      }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Convert to array and deduplicate
  const players = Array.from(playerMap.values());
  
  console.log(`\n=== DEDUPLICATION ===`);
  console.log(`📊 Total players before deduplication: ${players.length}`);
  
  // Group players by name (case-insensitive)
  const playersByName = {};
  players.forEach(player => {
    const name = player.name.toLowerCase();
    if (!playersByName[name]) {
      playersByName[name] = [];
    }
    playersByName[name].push(player);
  });
  
  // Find duplicates and determine which to keep
  const duplicates = [];
  const finalPlayers = [];
  
  Object.entries(playersByName).forEach(([name, playerList]) => {
    if (playerList.length > 1) {
      console.log(`🔍 Found ${playerList.length} entries for "${name}":`);
      
      playerList.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.country} (QID: ${player.qid})`);
      });
      
      // Prioritize manual entries (they have correct data)
      const manualEntry = playerList.find(p => p.qid.startsWith('MANUAL_'));
      const wikidataEntries = playerList.filter(p => !p.qid.startsWith('MANUAL_'));
      
      if (manualEntry) {
        console.log(`  ✅ Keeping manual entry: ${manualEntry.country}`);
        finalPlayers.push(manualEntry);
        duplicates.push(...wikidataEntries);
      } else {
        // No manual entry, keep the one with most achievements/data
        const bestEntry = playerList.reduce((best, current) => {
          const bestScore = (best.ballonDor ? 1 : 0) + (best.worldCupWinner ? 1 : 0) + (best.championsLeagueWinner ? 1 : 0);
          const currentScore = (current.ballonDor ? 1 : 0) + (current.worldCupWinner ? 1 : 0) + (current.championsLeagueWinner ? 1 : 0);
          return currentScore > bestScore ? current : best;
        });
        
        console.log(`  ✅ Keeping entry with most achievements: ${bestEntry.country}`);
        finalPlayers.push(bestEntry);
        duplicates.push(...playerList.filter(p => p.qid !== bestEntry.qid));
      }
    } else {
      // Single entry, keep it
      finalPlayers.push(playerList[0]);
    }
  });
  
  console.log(`📊 Total players after deduplication: ${finalPlayers.length}`);
  console.log(`🗑️ Removed ${duplicates.length} duplicate entries`);
  
  // Verify key players
  const keyPlayers = ['Lionel Messi', 'Ángel Di María', 'Cristiano Ronaldo'];
  keyPlayers.forEach(playerName => {
    const entries = finalPlayers.filter(p => 
      p.name.toLowerCase() === playerName.toLowerCase()
    );
    
    if (entries.length === 1) {
      console.log(`✅ ${playerName}: ${entries[0].country} (${entries[0].qid})`);
    } else if (entries.length === 0) {
      console.log(`❌ ${playerName}: NO ENTRIES FOUND!`);
    } else {
      console.log(`⚠️ ${playerName}: ${entries.length} entries still exist`);
    }
  });
  
  console.log(`\n✅ Final player statistics:`);
  console.log(`   - Total players: ${finalPlayers.length}`);
  console.log(`   - With Ballon d'Or: ${finalPlayers.filter(p => p.ballonDor).length}`);
  console.log(`   - World Cup winners: ${finalPlayers.filter(p => p.worldCupWinner).length}`);
  console.log(`   - Champions League winners: ${finalPlayers.filter(p => p.championsLeagueWinner).length}`);
  console.log(`   - With club data: ${finalPlayers.filter(p => p.clubs && p.clubs.length > 0).length}`);
  
  // Save to file
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalPlayers, null, 2));
  console.log(`\n💾 Saved to ${OUTPUT_FILE}`);
  
  return finalPlayers;
}

// Run if called directly
if (require.main === module) {
  buildDatabase()
    .then(() => {
      console.log('\n🎉 Database build complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { buildDatabase };

