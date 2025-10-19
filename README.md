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
