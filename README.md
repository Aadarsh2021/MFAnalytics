# Portfolio Advisor - React

Professional portfolio optimization tool with comprehensive tracking and insights.

## Features

- 🔍 **Live Mutual Fund Search** - Search Indian mutual funds via MFAPI.in
- 📊 **Data Quality Analysis** - Automatic quality scoring and validation
- ⚖️ **3 MVP Optimization Methods** - SQP, Convex, Critical Line
- 🎯 **Black-Litterman Model** - Advanced optimization with market views
- 📈 **Real-Time Tracking** - Activity log, progress timeline, insights
- 💡 **Smart Insights** - Automated recommendations and warnings

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Lightning-fast dev server
- **TailwindCSS** - Utility-first styling
- **Lucide React** - Beautiful icons

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   ├── StatusTracker.jsx
│   ├── DataQualityPanel.jsx
│   ├── ProgressTimeline.jsx
│   ├── InsightsPanel.jsx
│   ├── Step1SearchFunds.jsx
│   ├── Step2FetchData.jsx
│   ├── Step3MVPAnalysis.jsx
│   ├── Step4SetViews.jsx
│   ├── Step5BlackLitterman.jsx
│   └── Step6FinalReport.jsx
├── utils/
│   ├── dataProcessing.js
│   ├── dataQuality.js
│   ├── optimization.js
│   └── export.js
├── App.jsx
└── main.jsx
```

## Workflow

1. **Search Funds** - Find mutual funds via live API
2. **Fetch Data** - Download NAV history automatically
3. **MVP Analysis** - Calculate 3 optimization methods
4. **Set Views** - Express market expectations (optional)
5. **Black-Litterman** - Advanced optimization with views
6. **Final Report** - Compare methods and download CSV

## Data Source

Uses [MFAPI.in](https://www.mfapi.in/) - Free API for Indian mutual funds

## License

MIT
