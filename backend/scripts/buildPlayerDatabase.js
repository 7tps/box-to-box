const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * One-time script to build a comprehensive player database
 * Scrapes Wikipedia and uses Wikidata for basic player info
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
  
  // Convert to array
  const players = Array.from(playerMap.values());
  
  console.log(`\n✅ Total players: ${players.length}`);
  console.log(`   - With Ballon d'Or: ${players.filter(p => p.ballonDor).length}`);
  console.log(`   - World Cup winners: ${players.filter(p => p.worldCupWinner).length}`);
  console.log(`   - With club data: ${players.filter(p => p.clubs && p.clubs.length > 0).length}`);
  
  // Save to file
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(players, null, 2));
  console.log(`\n💾 Saved to ${OUTPUT_FILE}`);
  
  return players;
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

