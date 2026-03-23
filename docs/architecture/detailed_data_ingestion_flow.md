# Data Ingestion Lifecycle: Professional Flowchart

This document provides a comprehensive visualization of the Data Ingestion and Transformation Layer, designed to handle the "6-Pillar" macroeconomic model with 100% accuracy.

![System Architecture Flowchart](/C:/Users/thaku/.gemini/antigravity/brain/2f789fd2-7d86-4394-9c12-8a7b1f29ee70/data_ingestion_flowchart.png)

## 1. System Architecture logic

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': { 'primaryColor': '#007bff', 'edgeLabelBackground':'#ffffff', 'mainBkg': '#f8f9fa'}}}%%
flowchart TB
    subgraph SOURCES ["🌐 Data Acquisition (Raw Sources)"]
        S1["<b>FRED API</b><br/>(Real-time Fetching)"]
        S2["<b>Static CSVs</b><br/>(S&P 500, Yields)"]
        S3["<b>Manual XLSX</b><br/>(Institutional Data)"]
    end

    subgraph INGESTION ["⚙️ Ingestion Engine (Node.js)"]
        direction TB
        I1["<b>fetch_fred_macro.mjs</b><br/>(API Wrapper)"]
        I2["<b>extract_xlsx.mjs</b><br/>(Worksheet Parser)"]
        I3["<b>consolidate_us_macro.mjs</b><br/>(Aggregator)"]
    end

    subgraph VALIDATION ["🛡️ Sanity & Validation"]
        V1{"Data Quality<br/>Check"}
        V2["NaN Detection &<br/>Forward Filling"]
        V3["Unit Normalization<br/>(Basis Points to %)"]
    end

    subgraph TRANSFORMATION ["🧪 Feature Engineering (6 Pillars)"]
        T1["<b>Pillar Calculation</b><br/>(Debt Stress, Inf Vol)"]
        T2["<b>Rolling Analysis</b><br/>(Pearson Correlation)"]
        T3["<b>Date Syncing</b><br/>(Global YYYY-MM)"]
    end

    subgraph STORAGE ["💾 Persistence Layer"]
        P1[("<b>usMacroHistorical.json</b>")]
        P2[("<b>indiaMacroHistorical.json</b>")]
    end

    subgraph APPLICATION ["🚀 Downstream Consumers"]
        A1["<b>Backtest Engine</b><br/>(Historical Simulation)"]
        A2["<b>Regime Detector</b><br/>(Real-time Scoring)"]
        A3["<b>Optimizer (Step 5)</b><br/>(Black-Litterman)"]
    end

    %% Connections
    S1 ----> I1
    S3 ----> I2
    S2 ----> I3
    
    I1 & I2 & I3 ----> V1
    V1 -- "Valid" --> V2
    V2 ----> V3
    
    V3 ----> T1
    T1 ----> T2
    T2 ----> T3
    
    T3 ----> P1 & P2
    
    P1 & P2 ----> A1
    P1 & P2 ----> A2
    A2 ----> A3

    %% Styling
    style SOURCES fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style INGESTION fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
    style VALIDATION fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style TRANSFORMATION fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style STORAGE fill:#fce4ec,stroke:#e91e63,stroke-width:2px
    style APPLICATION fill:#eceff1,stroke:#607d8b,stroke-width:2px
```

## 2. Component Logic Breakdown

### 🛠️ Ingestion Engine

The engine uses the `xlsx` and `fs` modules to bridge the gap between manually updated institutional research and automated API feeds.

- **Async Execution**: Scripts run in parallel to minimize build-time delays.
- **Excel Serials**: The `extract_xlsx` module converts proprietary Excel date formats into standard Unix-compatible timestamps.

### 🛡️ Validation Layer

Crucial for 100% accuracy.

- **Forward Fill**: If FRED has a missing month (common in holiday seasons), the system automatically locks onto the previous known value to prevent Portfolio Simulation breaks.
- **Boundaries**: Validation triggers alerts if 10Y yields exceed historical extremes (e.g., >20%) to catch corrupted manual entries.

### 🧪 Pillar Transformation

This is where raw data becomes a **Market Regime**.

- **Inflation Volatility**: Uses a 6-month window to calculate the "Monetary Grip" score.
- **Debt Stress**: Joins the Interest Expense dataset with the Real GDP dataset to derive the "Financial Repression" metric.

### 🚀 Consumption

The final `json` artifacts are optimized for **zero-latency** delivery. The frontend SPA (Step 4A) reads these directly, allowing users to scroll through 30+ years of transitions without a single loader icon.
