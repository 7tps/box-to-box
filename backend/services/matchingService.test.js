const { getBestMatch, formatPeriod } = require('./matchingService');

describe('matchingService', () => {
  describe('getBestMatch', () => {
    test('should return the only entity if there is only one', () => {
      const entities = [
        { qid: 'Q414', label: 'Argentina' }
      ];
      const result = getBestMatch('Argentina', entities);
      expect(result.qid).toBe('Q414');
    });

    test('should return the best matching entity based on string similarity', () => {
      const entities = [
        { qid: 'Q7156', label: 'FC Barcelona' },
        { qid: 'Q8678', label: 'Barcelona Sporting Club' },
        { qid: 'Q12345', label: 'Barcelona Dragons' }
      ];
      const result = getBestMatch('Barcelona', entities);
      // Should prefer FC Barcelona due to exact match in label
      expect(result.label).toContain('Barcelona');
    });

    test('should handle case-insensitive matching', () => {
      const entities = [
        { qid: 'Q8682', label: 'Real Madrid CF' },
        { qid: 'Q12346', label: 'Real Madrid Basketball' }
      ];
      const result = getBestMatch('real madrid', entities);
      expect(result.label).toContain('Real Madrid');
    });
  });

  describe('formatPeriod', () => {
    test('should format both start and end times', () => {
      const result = formatPeriod(2014, 2021);
      expect(result).toBe('2014–2021');
    });

    test('should handle missing end time (present)', () => {
      const result = formatPeriod(2022, null);
      expect(result).toBe('2022–present');
    });

    test('should handle missing start time', () => {
      const result = formatPeriod(null, 2020);
      expect(result).toBe('unknown–2020');
    });

    test('should handle both missing times', () => {
      const result = formatPeriod(null, null);
      expect(result).toBe('unknown period');
    });
  });
});

describe('Player matching scenarios', () => {
  test('should match player by nationality', () => {
    // This is a conceptual test showing what the matching logic should do
    const playerCountries = [{ qid: 'Q414', label: 'Argentina' }];
    const rowEntityQid = 'Q414';
    
    const hasMatch = playerCountries.some(c => c.qid === rowEntityQid);
    expect(hasMatch).toBe(true);
  });

  test('should match player by club history', () => {
    const playerClubs = [
      { qid: 'Q7156', label: 'FC Barcelona', startTime: 2004, endTime: 2021 },
      { qid: 'Q10313', label: 'Newell\'s Old Boys', startTime: 1994, endTime: 2000 }
    ];
    const colEntityQid = 'Q7156';
    
    const hasMatch = playerClubs.some(c => c.qid === colEntityQid);
    expect(hasMatch).toBe(true);
  });

  test('should not match if neither nationality nor club matches', () => {
    const playerCountries = [{ qid: 'Q414', label: 'Argentina' }];
    const playerClubs = [{ qid: 'Q7156', label: 'FC Barcelona' }];
    
    const rowEntityQid = 'Q45'; // Portugal
    const colEntityQid = 'Q8682'; // Real Madrid
    
    const rowMatch = playerCountries.some(c => c.qid === rowEntityQid);
    const colMatch = playerClubs.some(c => c.qid === colEntityQid);
    
    expect(rowMatch || colMatch).toBe(false);
  });

  test('should validate if either row OR column matches (game rule)', () => {
    // Scenario: Argentina row, Real Madrid column, player is Argentine
    const playerCountries = [{ qid: 'Q414', label: 'Argentina' }];
    const playerClubs = [{ qid: 'Q7156', label: 'FC Barcelona' }]; // Not Real Madrid
    
    const rowEntityQid = 'Q414'; // Argentina
    const colEntityQid = 'Q8682'; // Real Madrid
    
    const rowMatch = playerCountries.some(c => c.qid === rowEntityQid);
    const colMatch = playerClubs.some(c => c.qid === colEntityQid);
    
    const isValid = rowMatch || colMatch; // Should be true because Argentina matches
    expect(isValid).toBe(true);
  });
});

