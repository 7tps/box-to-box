const wikidataService = require('./wikidataService');
const matchingService = require('./matchingService');

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
    
    // Randomly decide which categories to use for rows and columns
    // Mix of countries, clubs, and achievements
    const allCategories = [
      ...randomSelect(COUNTRIES, 2).map(c => ({ label: c, type: 'country' })),
      ...randomSelect(CLUBS, 2).map(c => ({ label: c, type: 'club' })),
      ...randomSelect(ACHIEVEMENTS, 2).map(a => ({ label: a, type: 'achievement' }))
    ];
    
    // Shuffle and split into rows and columns
    const shuffled = allCategories.sort(() => Math.random() - 0.5);
    const rowLabels = shuffled.slice(0, 3).map(c => c.label);
    const colLabels = shuffled.slice(3, 6).map(c => c.label);
    
    console.log('   Rows:', rowLabels);
    console.log('   Cols:', colLabels);
    
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
      
      const promise = wikidataService.findPlayersByCriteria(rowEntity, colEntity)
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

