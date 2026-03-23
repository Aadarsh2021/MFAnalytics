# HD Data Ingestion Flowchart (Mermaid Code)

This code provides a "High-Definition" visual representation of the Data Ingestion Layer. It uses custom CSS variables for high contrast, distinct node shapes for different roles, and clear hierarchical grouping.

## 🛠️ Performance Optimized Mermaid Code

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#ffffff',
    'primaryTextColor': '#1e293b',
    'primaryBorderColor': '#3b82f6',
    'lineColor': '#64748b',
    'secondaryColor': '#f8fafc',
    'tertiaryColor': '#ffffff',
    'fontFamily': 'Inter, system-ui, sans-serif'
  }
}}%%

flowchart TD
    %% Node Definitions
    subgraph SOURCES ["🌐 DATA ACQUISITION LAYER"]
        S1(["<b>FRED Database</b><br/>(API v3)"])
        S2(["<b>CSV Historicals</b><br/>(S&P 500, Bond Yields)"])
        S3(["<b>Research XLSX</b><br/>(Inf Vol, Real Rates)"])
    end

    subgraph INGESTION ["⚙️ PROCESSING ENGINE (Node.js)"]
        direction TB
        subgraph SCRIPTS ["Backend Modules"]
            P1["<b>FRED Fetcher</b><br/><i>fetch_fred_macro.mjs</i>"]
            P2["<b>XLSX Parser</b><br/><i>extract_xlsx.mjs</i>"]
            P3["<b>Regional Sync</b><br/><i>fetchIndianMacroData.mjs</i>"]
        end
        
        AG["<b>AGGREGATOR</b><br/><i>consolidate_us_macro.mjs</i>"]
    end

    subgraph LOGIC ["🧪 DATA TRANSFORMATION & PILLARS"]
        direction LR
        L1{"<b>Quality Gate</b><br/>NaN Check"}
        L2["<b>Normalization</b><br/>ISO 8601 Date Sync"]
        L3["<b>Pillar Engine</b><br/>6-Pillar Metric Calc"]
    end

    subgraph PERSISTENCE ["💾 SYSTEM STATE (JSON)"]
        DB1[("<b>usMacroHistorical.json</b><br/>(1990 - 2026)")]
        DB2[("<b>indiaMacroHistorical.json</b><br/>(2000 - 2026)")]
    end

    subgraph CONSUMERS ["🚀 CONSUMPTION LAYER"]
        C1["<b>Backtest Engine</b><br/>(High-Fidelity Simulation)"]
        C2["<b>Regime Detector</b><br/>(Bayesian Probabilities)"]
        C3["<b>Optimization</b><br/>(Black-Litterman Logic)"]
    end

    %% Connection Logic
    S1 --> P1
    S3 --> P2
    P1 & P2 & P3 --> AG
    
    S2 --> AG
    
    AG ==> L1
    L1 -- "Data Passed" --> L2
    L2 --> L3
    
    L3 ==> DB1 & DB2
    
    DB1 & DB2 ==> C1
    DB1 & DB2 ==> C2
    C2 --> C3

    %% Advanced Styling
    style SOURCES fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    style INGESTION fill:#fdf4ff,stroke:#c026d3,stroke-width:2px,color:#701a75
    style LOGIC fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
    style PERSISTENCE fill:#fff7ed,stroke:#ea580c,stroke-width:2px
    style CONSUMERS fill:#f8fafc,stroke:#475569,stroke-width:2px

    %% Link Styling
    linkStyle default stroke:#94a3b8,stroke-width:2px
    linkStyle 6,10,11,12 stroke:#10b981,stroke-width:3px
```

## 📐 Design Principles for this Diagram

1. **Semantic Grouping**: Different colors (Blue for Sources, Purple for Code, Green for Logic) allow for instant mental mapping.
2. **Explicit File Names**: Direct references to `.mjs` scripts ensure developers know exactly where the logic resides.
3. **Thick Flow (==>)**: Used for the "Hot Path" representing processed data moving into persistence and consumption.
4. **Base Styling**: High contrast backgrounds and clean typography (Inter) selected for maximum legibility.
