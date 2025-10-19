const axios = require('axios');
const stringSimilarity = require('string-similarity');

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const TIMEOUT = 30000; // 30 seconds

/**
 * Execute a SPARQL query against Wikidata
 */
async function executeSparqlQuery(query) {
  try {
    const response = await axios.get(WIKIDATA_ENDPOINT, {
      params: {
        query,
        format: 'json'
      },
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'Box-to-Box-Game/1.0'
      },
      timeout: TIMEOUT
    });
    return response.data.results.bindings;
  } catch (error) {
    console.error('SPARQL query error:', error.message);
    throw new Error(`Wikidata query failed: ${error.message}`);
  }
}

/**
 * Resolve an entity (country or club) by label
 * For clubs: ONLY big 5 leagues (England, Spain, Germany, France, Italy)
 */
async function resolveEntity(label, type = 'auto') {
  const escapedLabel = label.replace(/"/g, '\\"');
  
  // Build type filter based on requested type
  let typeFilter = '';
  if (type === 'country') {
    typeFilter = '{ ?entity wdt:P31 wd:Q6256. } UNION { ?entity wdt:P31 wd:Q3624078. }';
  } else if (type === 'club') {
    // Only clubs from big 5 leagues
    typeFilter = `
      ?entity wdt:P31 wd:Q476028.  # association football club
      ?entity wdt:P118 ?league.     # league
      VALUES ?league {
        wd:Q9448        # Premier League (England)
        wd:Q324867      # La Liga (Spain)
        wd:Q13394       # Serie A (Italy)
        wd:Q82595       # Bundesliga (Germany)
        wd:Q13394653    # Ligue 1 (France)
      }
    `;
  }
  
  const query = `
    SELECT DISTINCT ?entity ?entityLabel ?countryLabel ?sitelinks WHERE {
      {
        ?entity rdfs:label "${escapedLabel}"@en.
      } UNION {
        ?entity skos:altLabel "${escapedLabel}"@en.
      }
      ${typeFilter}
      OPTIONAL { ?entity wdt:P17 ?country. }
      OPTIONAL { ?entity wikibase:sitelinks ?sitelinks. }
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en". 
      }
    }
    ORDER BY DESC(?sitelinks)
    LIMIT 10
  `;

  const results = await executeSparqlQuery(query);
  
  const entities = results.map(binding => ({
    qid: binding.entity.value.split('/').pop(),
    label: binding.entityLabel.value,
    type: type,
    country: binding.countryLabel?.value || '',
    sitelinks: parseInt(binding.sitelinks?.value || '0'),
    aliases: '',
    url: binding.entity.value
  }));
  
  // Manual overrides - guarantee correct clubs
  const preferredEntities = {
    'barcelona': 'Q7156',
    'fc barcelona': 'Q7156',
    'real madrid': 'Q8682',
    'manchester united': 'Q18656',
    'man united': 'Q18656',
    'chelsea': 'Q9616',
    'arsenal': 'Q9617',
    'liverpool': 'Q1130849',
    'bayern munich': 'Q15789',
    'bayern': 'Q15789',
    'juventus': 'Q1385804',
    'juve': 'Q1385804',
    'milan': 'Q1543',
    'ac milan': 'Q1543',
    'inter milan': 'Q631',
    'inter': 'Q631',
    'psg': 'Q483020',
    'paris saint-germain': 'Q483020',
    'manchester city': 'Q50602',
    'man city': 'Q50602',
    'tottenham': 'Q18741',
    'atletico madrid': 'Q8701',
    'atletico': 'Q8701'
  };
  
  const normalizedLabel = label.toLowerCase().trim();
  if (type === 'club' && preferredEntities[normalizedLabel]) {
    const qid = preferredEntities[normalizedLabel];
    console.log(`🎯 Using hardcoded club: ${label} → ${qid}`);
    // Return hardcoded entity directly
    return [{
      qid: qid,
      label: label,
      type: 'club',
      country: '',
      sitelinks: 9999,
      aliases: '',
      url: `http://www.wikidata.org/entity/${qid}`
    }];
  }
  
  console.log(`📋 Resolved ${entities.length} entities for "${label}"`);
  return entities;
}

/**
 * Find players by name (fuzzy search)
 */
async function findPlayerByName(name) {
  const escapedName = name.replace(/"/g, '\\"');
  
  const query = `
    SELECT DISTINCT ?player ?playerLabel ?dob ?pobLabel ?description WHERE {
      {
        ?player rdfs:label "${escapedName}"@en.
      } UNION {
        ?player skos:altLabel "${escapedName}"@en.
      } UNION {
        ?player rdfs:label ?label.
        FILTER(CONTAINS(LCASE(?label), LCASE("${escapedName}")))
        FILTER(LANG(?label) = "en")
      }
      ?player wdt:P31 wd:Q5.  # instance of human
      ?player wdt:P106 wd:Q937857.  # occupation: association football player
      OPTIONAL { ?player wdt:P569 ?dob. }  # date of birth
      OPTIONAL { ?player wdt:P19 ?pob. }   # place of birth
      OPTIONAL { ?player schema:description ?description. FILTER(LANG(?description) = "en") }
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en". 
      }
    }
    LIMIT 20
  `;

  const results = await executeSparqlQuery(query);
  
  const players = results.map(binding => ({
    qid: binding.player.value.split('/').pop(),
    label: binding.playerLabel.value,
    dob: binding.dob?.value ? new Date(binding.dob.value).getFullYear() : null,
    placeOfBirth: binding.pobLabel?.value || null,
    description: binding.description?.value || '',
    url: binding.player.value
  }));

  // Sort by string similarity to original query
  players.sort((a, b) => {
    const similarityA = stringSimilarity.compareTwoStrings(name.toLowerCase(), a.label.toLowerCase());
    const similarityB = stringSimilarity.compareTwoStrings(name.toLowerCase(), b.label.toLowerCase());
    return similarityB - similarityA;
  });

  return players;
}

/**
 * Get detailed information about a player
 */
async function getPlayerDetails(playerQid) {
  const query = `
    SELECT DISTINCT ?country ?countryLabel ?club ?clubLabel ?startTime ?endTime WHERE {
      VALUES ?player { wd:${playerQid} }
      OPTIONAL { 
        ?player wdt:P27 ?country.  # country of citizenship
      }
      OPTIONAL { 
        ?player p:P54 ?clubStatement.  # member of sports team
        ?clubStatement ps:P54 ?club.
        OPTIONAL { ?clubStatement pq:P580 ?startTime. }  # start time
        OPTIONAL { ?clubStatement pq:P582 ?endTime. }    # end time
      }
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en". 
      }
    }
  `;

  const results = await executeSparqlQuery(query);
  
  const countries = new Set();
  const clubs = [];
  
  results.forEach(binding => {
    if (binding.country) {
      countries.add({
        qid: binding.country.value.split('/').pop(),
        label: binding.countryLabel.value
      });
    }
    if (binding.club) {
      clubs.push({
        qid: binding.club.value.split('/').pop(),
        label: binding.clubLabel.value,
        startTime: binding.startTime?.value ? new Date(binding.startTime.value).getFullYear() : null,
        endTime: binding.endTime?.value ? new Date(binding.endTime.value).getFullYear() : null
      });
    }
  });

  return {
    countries: Array.from(countries),
    clubs: clubs
  };
}

/**
 * Autocomplete player search (using Wikidata search API - much faster!)
 * Filters to only show actual football/soccer players
 */
async function autocompletePlayer(query, limit = 10) {
  try {
    // Use Wikidata's search API instead of SPARQL for speed
    const response = await axios.get('https://www.wikidata.org/w/api.php', {
      params: {
        action: 'wbsearchentities',
        search: query,
        language: 'en',
        limit: limit * 5, // Get more to filter (increased)
        format: 'json'
      },
      timeout: 5000
    });

    if (!response.data || !response.data.search) {
      return [];
    }

    // Very simple filter - just exclude obvious non-players
    const results = response.data.search
      .filter(item => {
        const desc = (item.description || '').toLowerCase();
        const label = (item.label || '').toLowerCase();
        
        // Just exclude obvious non-players (very permissive)
        const isExcluded = desc.includes('video game') ||
                          desc.includes('game of') ||
                          desc.includes('film') ||
                          desc.includes('movie') ||
                          desc.includes('album') ||
                          desc.includes('song') ||
                          desc.includes('television') ||
                          desc.includes('manga') ||
                          desc.includes('book') ||
                          label.includes('soccer 64') ||
                          label.includes('trial') ||
                          label.includes('career') ||
                          label.includes(' game ') ||
                          label.includes('the game');
        
        // Include anything related to football that's not explicitly excluded
        const hasFootball = desc.includes('football') || desc.includes('soccer');
        
        return hasFootball && !isExcluded;
      })
      .slice(0, limit)
      .map(item => ({
        qid: item.id,
        label: item.label,
        description: item.description || ''
      }));

    console.log(`🔍 Autocomplete: "${query}" → ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Autocomplete error:', error.message);
    // Return empty array on error rather than throwing
    return [];
  }
}

/**
 * Find players matching specific criteria (for precomputation)
 * NEW: Requires BOTH country AND club to match (AND logic)
 * NO LIMIT - gets all matching players
 */
async function findPlayersByCriteria(countryQid = null, clubQid = null) {
  if (!countryQid || !clubQid) {
    console.log('❌ Both country AND club required for AND logic');
    return [];
  }
  
  console.log(`🔍 Finding ALL players for country:${countryQid} AND club:${clubQid}`);
  
  // Query requires BOTH nationality AND club membership - NO LIMIT!
  // Using p:P54/ps:P54 to capture ALL clubs (past and present), not just current
  const query = `
    SELECT DISTINCT ?player ?playerLabel WHERE {
      ?player wdt:P27 wd:${countryQid}.        # Must be from this country
      ?player p:P54/ps:P54 wd:${clubQid}.      # Must have played for this club (includes past clubs)
      SERVICE wikibase:label { 
        bd:serviceParam wikibase:language "en". 
      }
    }
  `;

  try {
    console.log(`📤 Executing AND query (no limit): ${countryQid} AND ${clubQid}...`);
    
    // If querying Argentina x Barcelona, check Messi specifically
    if (countryQid === 'Q414' && clubQid === 'Q7156') {
      const messiCheckQuery = `
        SELECT ?p27 ?p54 ?p54Label WHERE {
          wd:Q615 wdt:P27 ?p27.
          wd:Q615 p:P54/ps:P54 ?p54.
          SERVICE wikibase:label {
            bd:serviceParam wikibase:language "en".
          }
        }
      `;
      try {
        const messiCheck = await executeSparqlQuery(messiCheckQuery);
        console.log('🔍 MESSI DIAGNOSTIC (Q615):');
        console.log('   P27 (nationality):', messiCheck.map(r => r.p27?.value).filter((v, i, a) => a.indexOf(v) === i));
        console.log('   ALL P54 clubs (QIDs):', messiCheck.map(r => r.p54?.value.split('/').pop()).filter((v, i, a) => a.indexOf(v) === i));
        console.log('   ALL P54 clubs (names):', messiCheck.map(r => r.p54Label?.value).filter((v, i, a) => a.indexOf(v) === i));
        const hasArgentina = messiCheck.some(r => r.p27?.value === 'http://www.wikidata.org/entity/Q414');
        const hasBarcelonaQID = messiCheck.some(r => r.p54?.value === 'http://www.wikidata.org/entity/Q7156');
        const hasBarcelonaName = messiCheck.some(r => r.p54Label?.value?.includes('Barcelona'));
        console.log(`   Has Argentina (Q414)? ${hasArgentina ? '✅' : '❌'}`);
        console.log(`   Has Barcelona Q7156? ${hasBarcelonaQID ? '✅' : '❌'}`);
        console.log(`   Has "Barcelona" in club names? ${hasBarcelonaName ? '✅' : '❌'}`);
      } catch (e) {
        console.log('   ⚠️ Could not check Messi:', e.message);
      }
    }
    
    const results = await executeSparqlQuery(query);
    console.log(`✅ Got ${results.length} players matching BOTH criteria`);
    
    // Log first few players for debugging
    if (results.length > 0) {
      const preview = results.slice(0, 5).map(b => b.playerLabel.value).join(', ');
      console.log(`   First players: ${preview}${results.length > 5 ? '...' : ''}`);
      
      // Check specifically for Messi when querying Argentina (Q414) x Barcelona (Q7156)
      if (countryQid === 'Q414' && clubQid === 'Q7156') {
        const messiInResults = results.find(r => 
          r.playerLabel.value.toLowerCase().includes('messi')
        );
        console.log(`   🔍 Messi check: ${messiInResults ? '✅ FOUND: ' + messiInResults.playerLabel.value : '❌ NOT FOUND in Wikidata results'}`);
      }
    }
    
    const players = results.map(binding => ({
      qid: binding.player.value.split('/').pop(),
      label: binding.playerLabel.value
    }));
    
    return players;
  } catch (error) {
    console.error(`❌ Error finding players for country:${countryQid} AND club:${clubQid}`, error.message);
    return [];
  }
}

module.exports = {
  resolveEntity,
  findPlayerByName,
  getPlayerDetails,
  executeSparqlQuery,
  autocompletePlayer,
  findPlayersByCriteria
}