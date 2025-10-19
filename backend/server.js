const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const wikidataService = require('./services/wikidataService');
const matchingService = require('./services/matchingService');
const boardGeneratorService = require('./services/boardGeneratorService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Box-to-Box API is running' });
});

// Resolve entity (country or club) by label
app.get('/api/resolve-entity', async (req, res) => {
  try {
    const { label, type = 'auto' } = req.query;
    
    if (!label) {
      return res.status(400).json({ error: 'Label parameter is required' });
    }

    const results = await wikidataService.resolveEntity(label, type);
    res.json(results);
  } catch (error) {
    console.error('Error resolving entity:', error);
    res.status(500).json({ error: 'Failed to resolve entity', details: error.message });
  }
});

// Find player by name
app.get('/api/player-by-name', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Name parameter is required' });
    }

    const players = await wikidataService.findPlayerByName(name);
    res.json(players);
  } catch (error) {
    console.error('Error finding player:', error);
    res.status(500).json({ error: 'Failed to find player', details: error.message });
  }
});

// Check if player matches row/column labels
app.get('/api/check-player', async (req, res) => {
  try {
    const { playerQ, rowLabel, colLabel } = req.query;
    
    if (!playerQ || !rowLabel || !colLabel) {
      return res.status(400).json({ 
        error: 'playerQ, rowLabel, and colLabel parameters are required' 
      });
    }

    const result = await matchingService.checkPlayerMatch(playerQ, rowLabel, colLabel);
    res.json(result);
  } catch (error) {
    console.error('Error checking player:', error);
    res.status(500).json({ error: 'Failed to check player', details: error.message });
  }
});

// Get player details
app.get('/api/player-details', async (req, res) => {
  try {
    const { playerQ } = req.query;
    
    if (!playerQ) {
      return res.status(400).json({ error: 'playerQ parameter is required' });
    }

    const details = await wikidataService.getPlayerDetails(playerQ);
    res.json(details);
  } catch (error) {
    console.error('Error getting player details:', error);
    res.status(500).json({ error: 'Failed to get player details', details: error.message });
  }
});

// Pre-compute valid players for ALL cells in the board at once
app.post('/api/precompute-board', async (req, res) => {
  try {
    const { rowLabels, colLabels } = req.body;
    
    if (!rowLabels || !colLabels || rowLabels.length !== 3 || colLabels.length !== 3) {
      return res.status(400).json({ 
        error: 'rowLabels and colLabels arrays with 3 items each are required' 
      });
    }

    console.log('🔄 Precomputing entire board...');
    const boardData = await matchingService.precomputeEntireBoard(rowLabels, colLabels);
    console.log('✅ Board precomputed successfully');
    res.json(boardData);
  } catch (error) {
    console.error('Error precomputing board:', error);
    res.status(500).json({ error: 'Failed to precompute board', details: error.message });
  }
});

// Autocomplete player search (fast, limited results)
app.get('/api/autocomplete', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const suggestions = await wikidataService.autocompletePlayer(query, limit);
    res.json(suggestions);
  } catch (error) {
    console.error('Error in autocomplete:', error);
    res.status(500).json({ error: 'Autocomplete failed', details: error.message });
  }
});

// Generate random board
app.get('/api/generate-board', async (req, res) => {
  try {
    console.log('🎲 Generating random board...');
    const board = await boardGeneratorService.generateRandomBoard();
    res.json(board);
  } catch (error) {
    console.error('Error generating board:', error);
    res.status(500).json({ error: 'Failed to generate board', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Using Wikidata as primary data source`);
});

module.exports = app;

