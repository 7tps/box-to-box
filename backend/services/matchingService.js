const wikidataService = require('./wikidataService');
const stringSimilarity = require('string-similarity');

/**
 * Check if a player matches the row and column labels
 */
async function checkPlayerMatch(playerQid, rowLabel, colLabel) {
  try {
    // Get player details
    const playerDetails = await wikidataService.getPlayerDetails(playerQid);
    
    // Resolve row label (typically nationality)
    const rowEntities = await wikidataService.resolveEntity(rowLabel, 'country');
    
    // Resolve column label (typically club)
    const colEntities = await wikidataService.resolveEntity(colLabel, 'club');
    
    // Check row match (nationality)
    let rowMatch = false;
    let rowMatchDetails = null;
    
    if (rowEntities.length > 0) {
      // Get best matching entity
      const bestRowEntity = getBestMatch(rowLabel, rowEntities);
      
      // Check if player has this nationality
      const hasNationality = playerDetails.countries.some(
        country => country.qid === bestRowEntity.qid
      );
      
      if (hasNationality) {
        rowMatch = true;
        rowMatchDetails = {
          type: 'nationality',
          property: 'P27 (country of citizenship)',
          entity: bestRowEntity.label,
          qid: bestRowEntity.qid
        };
      }
    } else {
      // Try as club if no country match
      const rowClubEntities = await wikidataService.resolveEntity(rowLabel, 'club');
      if (rowClubEntities.length > 0) {
        const bestRowEntity = getBestMatch(rowLabel, rowClubEntities);
        const playedFor = playerDetails.clubs.find(
          club => club.qid === bestRowEntity.qid
        );
        
        if (playedFor) {
          rowMatch = true;
          const period = formatPeriod(playedFor.startTime, playedFor.endTime);
          rowMatchDetails = {
            type: 'club',
            property: 'P54 (member of sports team)',
            entity: bestRowEntity.label,
            qid: bestRowEntity.qid,
            period: period
          };
        }
      }
    }
    
    // Check column match (club)
    let colMatch = false;
    let colMatchDetails = null;
    
    if (colEntities.length > 0) {
      const bestColEntity = getBestMatch(colLabel, colEntities);
      
      // Check if player played for this club
      const playedFor = playerDetails.clubs.find(
        club => club.qid === bestColEntity.qid
      );
      
      if (playedFor) {
        colMatch = true;
        const period = formatPeriod(playedFor.startTime, playedFor.endTime);
        colMatchDetails = {
          type: 'club',
          property: 'P54 (member of sports team)',
          entity: bestColEntity.label,
          qid: bestColEntity.qid,
          period: period
        };
      }
    } else {
      // Try as country if no club match
      const colCountryEntities = await wikidataService.resolveEntity(colLabel, 'country');
      if (colCountryEntities.length > 0) {
        const bestColEntity = getBestMatch(colLabel, colCountryEntities);
        const hasNationality = playerDetails.countries.some(
          country => country.qid === bestColEntity.qid
        );
        
        if (hasNationality) {
          colMatch = true;
          colMatchDetails = {
            type: 'nationality',
            property: 'P27 (country of citizenship)',
            entity: bestColEntity.label,
            qid: bestColEntity.qid
          };
        }
      }
    }
    
    // The game rule: match if EITHER row OR column matches
    const isValid = rowMatch || colMatch;
    
    return {
      valid: isValid,
      rowMatch,
      colMatch,
      rowMatchDetails,
      colMatchDetails,
      playerDetails
    };
  } catch (error) {
    console.error('Error in checkPlayerMatch:', error);
    throw error;
  }
}

/**
 * Get the best matching entity from a list based on string similarity
 */
function getBestMatch(label, entities) {
  if (entities.length === 1) return entities[0];
  
  // Calculate similarity scores
  const scored = entities.map(entity => ({
    ...entity,
    score: stringSimilarity.compareTwoStrings(
      label.toLowerCase(),
      entity.label.toLowerCase()
    )
  }));
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0];
}

/**
 * Format time period
 */
function formatPeriod(startTime, endTime) {
  if (!startTime && !endTime) return 'unknown period';
  if (startTime && !endTime) return `${startTime}–present`;
  if (!startTime && endTime) return `unknown–${endTime}`;
  return `${startTime}–${endTime}`;
}

/**
 * Pre-compute valid players for a cell
 * This fetches players that match either the row OR column criteria
 */
async function precomputeValidPlayers(rowLabel, colLabel) {
  try {
    console.log(`\n🔄 Precomputing: ${rowLabel} × ${colLabel} (AND logic)`);
    
    // Resolve both labels
    const rowEntities = await wikidataService.resolveEntity(rowLabel, 'country');
    const colEntities = await wikidataService.resolveEntity(colLabel, 'club');
    
    console.log(`  Row entities found: ${rowEntities.length}`, rowEntities.map(e => `${e.label} (${e.qid})`));
    console.log(`  Col entities found: ${colEntities.length}`, colEntities.map(e => `${e.label} (${e.qid})`));
    
    if (rowEntities.length === 0 || colEntities.length === 0) {
      console.log('  ❌ Need both country AND club for AND logic');
      return {
        players: [],
        rowEntity: null,
        colEntity: null,
        message: 'Could not resolve both labels',
        count: 0
      };
    }
    
    const bestRowEntity = getBestMatch(rowLabel, rowEntities);
    const bestColEntity = getBestMatch(colLabel, colEntities);
    
    console.log(`  ✅ Best row: ${bestRowEntity?.label} (${bestRowEntity?.qid})`);
    console.log(`  ✅ Best col: ${bestColEntity?.label} (${bestColEntity?.qid})`);
    
    // NEW: Get players matching BOTH row AND column (AND logic) - NO LIMIT
    console.log(`  🔍 Fetching ALL players for ${bestRowEntity.qid} AND ${bestColEntity.qid}...`);
    const validPlayers = await wikidataService.findPlayersByCriteria(
      bestRowEntity.qid, 
      bestColEntity.qid
    );
    console.log(`  ✅ Got ${validPlayers.length} players matching BOTH criteria\n`);
    
    return {
      players: validPlayers,
      rowEntity: bestRowEntity,
      colEntity: bestColEntity,
      count: validPlayers.length
    };
  } catch (error) {
    console.error('❌ Error precomputing valid players:', error);
    throw error;
  }
}

/**
 * Quick validation using pre-computed player list
 */
function validateAgainstPrecomputed(playerName, precomputedData) {
  if (!precomputedData || !precomputedData.players) {
    return { valid: false, message: 'No precomputed data available' };
  }
  
  const normalizedInput = playerName.toLowerCase().trim();
  const matchingPlayer = precomputedData.players.find(p => 
    p.label.toLowerCase() === normalizedInput ||
    p.label.toLowerCase().includes(normalizedInput)
  );
  
  if (matchingPlayer) {
    return {
      valid: true,
      player: matchingPlayer,
      rowEntity: precomputedData.rowEntity,
      colEntity: precomputedData.colEntity
    };
  }
  
  return {
    valid: false,
    message: 'Player not found in valid answers for this cell'
  };
}

/**
 * Precompute valid players for the entire 3x3 board
 * Runs all 9 cell queries in parallel for speed
 */
async function precomputeEntireBoard(rowLabels, colLabels) {
  console.log('Starting board precomputation for:', rowLabels, 'x', colLabels);
  
  const cells = {};
  const allPlayersByName = new Map(); // Map of player name -> {qid, label, validCells: []}
  
  // Create array of all cell combinations
  const cellPromises = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cellKey = `${row}-${col}`;
      const promise = precomputeValidPlayers(rowLabels[row], colLabels[col])
        .then(result => ({ cellKey, result }))
        .catch(error => {
          console.error(`Error precomputing cell ${cellKey}:`, error.message);
          return { cellKey, result: { players: [], rowEntity: null, colEntity: null, count: 0 } };
        });
      cellPromises.push(promise);
    }
  }
  
  // Wait for all cells to complete in parallel
  const results = await Promise.all(cellPromises);
  
  // Process results
  results.forEach(({ cellKey, result }) => {
    cells[cellKey] = result;
    
    // Add players to the global map
    result.players.forEach(player => {
      const normalizedName = player.label.toLowerCase();
      if (!allPlayersByName.has(normalizedName)) {
        allPlayersByName.set(normalizedName, {
          qid: player.qid,
          label: player.label,
          validCells: []
        });
      }
      allPlayersByName.get(normalizedName).validCells.push(cellKey);
    });
  });
  
  // Convert map to array
  const allPlayers = Array.from(allPlayersByName.values());
  
  console.log(`✅ Precomputed ${allPlayers.length} unique players across all cells`);
  
  return {
    cells,
    allPlayers,
    playerCount: allPlayers.length
  };
}

/**
 * Find which cell(s) a player belongs to
 */
function findPlayerCells(playerName, boardData) {
  const normalizedName = playerName.toLowerCase().trim();
  
  // Check exact match first
  const exactMatch = boardData.allPlayers.find(p => 
    p.label.toLowerCase() === normalizedName
  );
  
  if (exactMatch) {
    return {
      found: true,
      player: exactMatch,
      cells: exactMatch.validCells
    };
  }
  
  // Try partial match
  const partialMatch = boardData.allPlayers.find(p => 
    p.label.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(p.label.toLowerCase())
  );
  
  if (partialMatch) {
    return {
      found: true,
      player: partialMatch,
      cells: partialMatch.validCells
    };
  }
  
  return {
    found: false,
    player: null,
    cells: []
  };
}

module.exports = {
  checkPlayerMatch,
  getBestMatch,
  formatPeriod,
  precomputeValidPlayers,
  validateAgainstPrecomputed,
  precomputeEntireBoard,
  findPlayerCells
};

