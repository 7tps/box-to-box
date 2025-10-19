/**
 * Configuration for swappable data sources
 * This module allows switching between Wikidata, local DB, and commercial APIs
 */

const wikidataService = require('../services/wikidataService');

const DATA_SOURCE = process.env.DATA_SOURCE || 'wikidata';

// Factory function to get the appropriate data service
function getDataService() {
  switch (DATA_SOURCE) {
    case 'wikidata':
      return wikidataService;
    case 'local':
      // Future: implement local DB service
      // return require('../services/localDbService');
      console.warn('Local DB not yet implemented, falling back to Wikidata');
      return wikidataService;
    case 'api':
      // Future: implement commercial API service
      // return require('../services/apiFootballService');
      console.warn('Commercial API not yet implemented, falling back to Wikidata');
      return wikidataService;
    default:
      return wikidataService;
  }
}

module.exports = {
  getDataService,
  DATA_SOURCE
};

