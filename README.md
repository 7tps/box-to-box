# ⚽ Box to Box - Soccer Validation Game

A web application that implements the soccer "box-to-box" validation game using Wikidata as the primary data source. Players enter soccer player names, and the app automatically places them in cells where they match BOTH the row label (nationality) AND the column label (club).

## 🎮 How to Play

1. You see a 3×3 grid with editable row and column labels
2. Row labels represent countries (nationalities)
3. Column labels represent clubs
4. Type any player's name - the app will automatically place them in the correct cell
5. The player must match **BOTH** the row label (nationality) **AND** the column label (club)
6. ✅ = Valid match | ❌ = Invalid

### Example
If row = "Argentina" and column = "Barcelona":
- ✅ **Lionel Messi** - Argentine AND played for Barcelona ✓
- ✅ **Javier Mascherano** - Argentine AND played for Barcelona ✓
- ❌ **Sergio Agüero** - Argentine but never played for Barcelona
- ❌ **Xavi** - Played for Barcelona but not Argentine
- ❌ **Cristiano Ronaldo** - Portuguese AND never played for Barcelona

## 🚀 Quick Start

### Prerequisites
- Node.js 16.x or higher
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd box-to-box
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env if needed (defaults work fine)
```

4. **Start the development server**
```bash
npm run dev
```

This will start:
- Backend API on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

5. **Open your browser**
Navigate to `http://localhost:3000` and start playing!

## 📁 Project Structure

```
box-to-box/
├── backend/
│   ├── server.js                 # Express server
│   ├── services/
│   │   ├── wikidataService.js    # Wikidata SPARQL queries
│   │   ├── matchingService.js    # Player validation logic
│   │   └── matchingService.test.js # Unit tests
│   └── config/
│       └── dataSources.js        # Data source configuration
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Grid.js           # Main 3x3 grid component
│   │   │   ├── Cell.js           # Individual cell component
│   │   │   ├── LabelEditor.js    # Editable row/col labels
│   │   │   ├── PlayerDisambiguation.js # Multiple player selector
│   │   │   └── Instructions.js   # Game instructions
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── package.json
├── .env.example
└── README.md
```

## 🔌 API Endpoints

### Backend API

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Box-to-Box API is running"
}
```

#### `GET /api/resolve-entity`
Resolve a label (country or club name) to Wikidata entity.

**Query Parameters:**
- `label` (required) - The entity name to resolve (e.g., "Argentina", "Barcelona")
- `type` (optional) - Entity type: `country`, `club`, or `auto` (default)

**Example:**
```
GET /api/resolve-entity?label=Argentina&type=country
```

**Response:**
```json
[
  {
    "qid": "Q414",
    "label": "Argentina",
    "type": "country",
    "aliases": "Argentine Republic, ARG",
    "url": "http://www.wikidata.org/entity/Q414"
  }
]
```

#### `GET /api/player-by-name`
Search for players by name (fuzzy matching).

**Query Parameters:**
- `name` (required) - Player name to search for

**Example:**
```
GET /api/player-by-name?name=Messi
```

**Response:**
```json
[
  {
    "qid": "Q615",
    "label": "Lionel Messi",
    "dob": 1987,
    "placeOfBirth": "Rosario",
    "description": "Argentine association football player",
    "url": "http://www.wikidata.org/entity/Q615"
  }
]
```

#### `GET /api/check-player`
Validate if a player matches row and column labels.

**Query Parameters:**
- `playerQ` (required) - Wikidata QID of the player (e.g., "Q615")
- `rowLabel` (required) - Row label to check against
- `colLabel` (required) - Column label to check against

**Example:**
```
GET /api/check-player?playerQ=Q615&rowLabel=Argentina&colLabel=Barcelona
```

**Response:**
```json
{
  "valid": true,
  "rowMatch": true,
  "colMatch": true,
  "rowMatchDetails": {
    "type": "nationality",
    "property": "P27 (country of citizenship)",
    "entity": "Argentina",
    "qid": "Q414"
  },
  "colMatchDetails": {
    "type": "club",
    "property": "P54 (member of sports team)",
    "entity": "FC Barcelona",
    "qid": "Q7156",
    "period": "2004–2021"
  },
  "playerDetails": {
    "countries": [...],
    "clubs": [...]
  }
}
```

#### `GET /api/player-details`
Get detailed information about a player.

**Query Parameters:**
- `playerQ` (required) - Wikidata QID of the player

## 🔄 Swapping Data Sources

The application is designed to support multiple data sources. Currently, Wikidata is fully implemented.

### Current Support

✅ **Wikidata (Primary)** - Fully implemented
- SPARQL queries to Wikidata public endpoint
- Real-time data
- Handles aliases and disambiguation
- No API key required

### Future Data Sources

The architecture supports adding:

🔜 **Local Database (OpenFootball/football.db format)**

To implement local SQLite fallback:

1. Create `backend/services/localDbService.js`
2. Implement the same interface as `wikidataService.js`
3. Set `DATA_SOURCE=local` in `.env`
4. Place your SQLite database in `./data/football.db`

```javascript
// backend/services/localDbService.js example
async function findPlayerByName(name) {
  // Query local SQLite database
  // Return same format as wikidataService
}

module.exports = { findPlayerByName, /* ... */ };
```

🔜 **Commercial APIs (API-Football, Sportmonks)**

To integrate a commercial API:

1. Create `backend/services/apiFootballService.js`
2. Add your API key to `.env`:
   ```
   API_FOOTBALL_KEY=your_key_here
   DATA_SOURCE=api
   ```
3. Implement the service interface

### Data Source Configuration

Edit `backend/config/dataSources.js` to add new data sources:

```javascript
function getDataService() {
  switch (DATA_SOURCE) {
    case 'wikidata':
      return wikidataService;
    case 'local':
      return localDbService; // Implement this
    case 'api':
      return apiFootballService; // Implement this
    default:
      return wikidataService;
  }
}
```

## 🧪 Testing

Run the unit tests:

```bash
npm test
```

The test suite covers:
- Entity resolution and string matching
- Player validation logic
- Time period formatting
- Game rules (OR logic for row/column matches)

## 🎯 Matching Logic

### How Validation Works

1. **Entity Resolution**: Row and column labels are resolved to Wikidata entities
   - Handles aliases (e.g., "Barça" → "FC Barcelona")
   - Uses string similarity for best match when multiple entities found

2. **Player Lookup**: Player name is fuzzy-matched against Wikidata
   - If multiple players match, disambiguation UI is shown
   - Returns player with Wikidata QID

3. **Validation**: Player is checked against row and column entities
   - **Row Match**: Checks `P27` (country of citizenship)
   - **Column Match**: Checks `P54` (member of sports team)
   - Player is **valid** if **EITHER** row **OR** column matches

4. **Result Display**: Shows which criteria matched with details
   - Displays matched entity and time periods for clubs
   - Links to Wikidata page for verification

### SPARQL Queries

The app uses Wikidata's SPARQL endpoint with optimized queries:

```sparql
# Example: Get player nationalities and clubs
SELECT DISTINCT ?country ?countryLabel ?club ?clubLabel ?startTime ?endTime WHERE {
  VALUES ?player { wd:Q615 }
  OPTIONAL { ?player wdt:P27 ?country. }
  OPTIONAL { 
    ?player p:P54 ?clubStatement.
    ?clubStatement ps:P54 ?club.
    OPTIONAL { ?clubStatement pq:P580 ?startTime. }
    OPTIONAL { ?clubStatement pq:P582 ?endTime. }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin master
```

2. **Import to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "Import Project"
- Select your repository
- Configure build settings:
  - **Framework Preset**: Create React App
  - **Root Directory**: `frontend`
  - **Build Command**: `npm run build`
  - **Output Directory**: `build`

3. **Add Serverless Functions** (for backend)
Create `api/` directory with serverless functions or deploy backend separately

### Deploy Backend Separately

For the backend API, you can use:
- **Heroku**: `git push heroku master`
- **Railway**: Connect GitHub repo
- **DigitalOcean App Platform**: Connect repo
- **AWS Elastic Beanstalk**: Deploy Node.js app

Update `frontend/package.json` proxy to point to your production backend URL.

## 🛠️ Development

### Environment Variables

Create `.env` file in root:

```env
PORT=5000
DATA_SOURCE=wikidata
```

### Adding New Features

1. **New Data Source**: Implement service in `backend/services/`
2. **New Validation Rule**: Modify `matchingService.js`
3. **UI Components**: Add to `frontend/src/components/`
4. **Tests**: Add corresponding `.test.js` files

### Code Style

- Backend: CommonJS modules, Express patterns
- Frontend: React functional components with hooks
- Use async/await for asynchronous operations
- Error handling with try-catch blocks

## 📊 Wikidata Properties Used

- **P27** - Country of citizenship (nationality)
- **P54** - Member of sports team (club history)
- **P580** - Start time (qualifier for P54)
- **P582** - End time (qualifier for P54)
- **P31** - Instance of (entity type)
- **P106** - Occupation (to filter for football players)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [Wikidata](https://www.wikidata.org) - Primary data source
- [OpenFootball](https://github.com/openfootball) - Inspiration for local data format
- Community contributors

## 🐛 Known Issues & Limitations

- Wikidata queries can be slow (5-10 seconds) for complex searches
- Some players may have incomplete club history data
- Disambiguation required for common names
- Rate limiting on Wikidata SPARQL endpoint (generally not an issue)

## 📧 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Built with ❤️ for soccer fans**
