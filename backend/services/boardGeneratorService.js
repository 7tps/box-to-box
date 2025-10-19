const wikidataService = require('./wikidataService');
const matchingService = require('./matchingService');
const localDatabaseService = require('./localDatabaseService');

// Category pools
const COUNTRIES = [
  'Argentina', 'Brazil', 'Spain', 'Germany', 'France', 'Italy', 'England', 
  'Portugal', 'Netherlands', 'Belgium', 'Croatia', 'Uruguay', 'Mexico'
];

const CLUBS = [
  'Barcelona', 'Real Madrid', 'Manchester United', 'Liverpool', 'Chelsea',
  'Manchester City', 'Arsenal', 'Bayern Munich', 'Borussia Dortmund', 'PSG',
  'Juventus', 'AC Milan', 'Inter Milan', 'Atletico Madrid', 'Tottenham'
];

const ACHIEVEMENTS = [
  'World Cup Winner',
  'Champions League Winner',
  'Ballon d\'Or Winner'
];

/**
 * Randomly select N unique items from an array
 */
function randomSelect(array, count) {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Generate a random board with validation
 * Returns { rowLabels, colLabels, isValid, emptyCells }
 */
async function generateRandomBoard(maxAttempts = 10) {
  console.log('🎲 Starting board generation...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n📋 Attempt ${attempt}/${maxAttempts}...`);
    
    // Decide how many achievements to include (0-2 max)
    const numAchievements = Math.floor(Math.random() * 3); // 0, 1, or 2
    
    // Need 6 total categories
    const remainingSlots = 6 - numAchievements;
    
    // Limit countries to 3 maximum (they will all be rows)
    // Randomly split remaining slots between countries and clubs
    const numCountries = Math.min(3, Math.max(1, Math.floor(Math.random() * (remainingSlots - 1)) + 1));
    const numClubs = remainingSlots - numCountries;
    
    console.log(`   📊 Mix: ${numCountries} countries, ${numClubs} clubs, ${numAchievements} achievements (Total: ${numCountries + numClubs + numAchievements})`);
    
    // Build category pool
    const selectedCountries = randomSelect(COUNTRIES, numCountries);
    const selectedClubs = randomSelect(CLUBS, numClubs);
    const selectedAchievements = randomSelect(ACHIEVEMENTS, numAchievements);
    
    console.log(`   🗂️  Selected categories:
      Countries (${selectedCountries.length}): ${selectedCountries.join(', ') || 'none'}
      Clubs (${selectedClubs.length}): ${selectedClubs.join(', ') || 'none'}
      Achievements (${selectedAchievements.length}): ${selectedAchievements.join(', ') || 'none'}`);
    
    // Force all countries to be ROWS (never columns)
    // This prevents country x country combinations
    const countryCategories = selectedCountries.map(c => ({ label: c, type: 'country' }));
    const clubCategories = selectedClubs.map(c => ({ label: c, type: 'club' }));
    const achievementCategories = selectedAchievements.map(a => ({ label: a, type: 'achievement' }));
    
    // Non-country categories (clubs + achievements) for filling remaining slots
    const nonCountryCategories = [...clubCategories, ...achievementCategories];
    
    console.log(`   📦 Total categories: ${countryCategories.length + nonCountryCategories.length}`);
    
    // Safety check: Ensure we have exactly 6 categories
    if (countryCategories.length + nonCountryCategories.length !== 6) {
      console.error(`   ❌ ERROR: Expected 6 categories, got ${countryCategories.length + nonCountryCategories.length}! Skipping.`);
      continue;
    }
    
    // Build rows: Start with countries, fill remaining with shuffled non-countries
    const shuffledNonCountries = nonCountryCategories.sort(() => Math.random() - 0.5);
    const rowCategories = [
      ...countryCategories,
      ...shuffledNonCountries.slice(0, 3 - countryCategories.length)
    ].sort(() => Math.random() - 0.5); // Shuffle row order
    
    // Columns: All non-countries that weren't used in rows
    const colCategories = shuffledNonCountries.slice(3 - countryCategories.length);
    
    const rowLabels = rowCategories.map(c => c.label);
    const colLabels = colCategories.map(c => c.label);
    
    // Final safety check
    if (rowLabels.length !== 3 || colLabels.length !== 3) {
      console.error(`   ❌ ERROR: Invalid split! Rows: ${rowLabels.length}, Cols: ${colLabels.length}. Skipping.`);
      continue;
    }
    
    const rowTypes = rowCategories.map(c => c.type);
    const colTypes = colCategories.map(c => c.type);
    
    console.log(`   ✂️  Split result:
      Rows (${rowLabels.length}): ${rowLabels.join(', ')}
      Cols (${colLabels.length}): ${colLabels.join(', ')}
      Total cells: ${rowLabels.length * colLabels.length}`);
    
    console.log(`   🔢 Type check: Row types: [${rowTypes.join(', ')}], Col types: [${colTypes.join(', ')}]`);
    
    // Validate the board
    const validation = await validateBoard(rowLabels, colLabels);
    
    if (validation.isValid) {
      console.log('✅ Valid board generated!');
      return {
        rowLabels,
        colLabels,
        isValid: true,
        emptyCells: []
      };
    } else {
      console.log(`❌ Invalid board (${validation.emptyCells.length} empty cells):`, validation.emptyCells);
    }
  }
  
  // If all attempts failed, return a default safe board
  console.log('⚠️ Could not generate valid board, using default...');
  return {
    rowLabels: ['Argentina', 'Brazil', 'Spain'],
    colLabels: ['Barcelona', 'Real Madrid', 'Manchester United'],
    isValid: true,
    emptyCells: []
  };
}

/**
 * Validate that every cell has at least one valid player
 * Returns { isValid, emptyCells: ['0-0', '1-2', ...] }
 */
async function validateBoard(rowLabels, colLabels) {
  console.log('   🔍 Validating board...');
  const emptyCells = [];
  
  // Resolve all entities first
  const rowEntities = await Promise.all(
    rowLabels.map(async (label, i) => {
      const type = COUNTRIES.includes(label) ? 'country' : 
                   CLUBS.includes(label) ? 'club' : 'achievement';
      const entities = await wikidataService.resolveEntity(label, type);
      return entities[0] || null;
    })
  );
  
  const colEntities = await Promise.all(
    colLabels.map(async (label, i) => {
      const type = COUNTRIES.includes(label) ? 'country' : 
                   CLUBS.includes(label) ? 'club' : 'achievement';
      const entities = await wikidataService.resolveEntity(label, type);
      return entities[0] || null;
    })
  );
  
  // Check each cell
  const checkPromises = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const rowEntity = rowEntities[row];
      const colEntity = colEntities[col];
      
      if (!rowEntity || !colEntity) {
        emptyCells.push(`${row}-${col}`);
        continue;
      }
      
      // Use localDatabaseService if either entity is an achievement
      const useLocalDb = rowEntity.type === 'achievement' || colEntity.type === 'achievement';
      
      const promise = (useLocalDb 
        ? Promise.resolve(localDatabaseService.findPlayersByCriteria(rowEntity, colEntity))
        : wikidataService.findPlayersByCriteria(rowEntity, colEntity)
      )
        .then(players => {
          if (players.length === 0) {
            emptyCells.push(`${row}-${col}`);
            console.log(`      ❌ Cell ${row}-${col} (${rowLabels[row]} x ${colLabels[col]}): 0 players`);
          } else {
            console.log(`      ✅ Cell ${row}-${col} (${rowLabels[row]} x ${colLabels[col]}): ${players.length} players`);
          }
        })
        .catch(error => {
          console.error(`      ⚠️ Cell ${row}-${col} error:`, error.message);
          emptyCells.push(`${row}-${col}`);
        });
      
      checkPromises.push(promise);
    }
  }
  
  await Promise.all(checkPromises);
  
  return {
    isValid: emptyCells.length === 0,
    emptyCells
  };
}

module.exports = {
  generateRandomBoard,
  validateBoard,
  COUNTRIES,
  CLUBS,
  ACHIEVEMENTS
};

