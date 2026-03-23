# Data Ingestion Layer Architecture

This document outlines the end-to-end data pipeline for macroeconomic ingestion and normalization within the MFP platform.

![System Architecture Flowchart](/C:/Users/thaku/.gemini/antigravity/brain/2f789fd2-7d86-4394-9c12-8a7b1f29ee70/data_ingestion_flowchart.png)

## 1. High-Level Data Flow

The ingestion layer is responsible for fetching raw data from multiple sources (API, CSV, XLSX), normalizing date formats, calculating missing pillars (like Inflation Volatility), and consolidating them into unified JSON files for the frontend and backtest engine.

```mermaid
graph TD
    subgraph "External Sources"
        A1[FRED API] 
        A2[Static CSVs]
        A3[XLSX Manual Data]
    end

    subgraph "Ingestion Layer (Backend Scripts)"
        B1["fetch_fred_macro.mjs"] 
        B2["consolidate_us_macro.mjs"]
        B3["extract_xlsx.mjs"]
        B4["fetchIndianMacroData.mjs"]
    end

    subgraph "Processing & Transformation"
        C1["Date Normalization (YYYY-MM)"]
        C2["Forward Filling (Missing Values)"]
        C3["Feature Engineering (6 Pillars)"]
    end

    subgraph "Storage / Results"
        D1[usMacroHistorical.json]
        D2[indiaMacroHistorical.json]
    end

    subgraph "Downstream consumers"
        E1[Backtest Engine]
        E2[Frontend Steps 4A/5A]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B3
    B1 --> C1
    B2 --> C1
    B3 --> B2
    B4 --> C1
    
    C1 --> C2
    C2 --> C3
    C3 --> D1
    C3 --> D2
    
    D1 --> E1
    D2 --> E1
    D1 --> E2
    D2 --> E2
```

## 2. Ingestion Steps Detail

### Phase 1: Raw Extraction

- **FRED Integration**: Automated fetch for S&P 500, Yields, and Repo rates.
- **XLSX Extraction**: Manual handling of institutional-grade data (Inflation Volatility and Real Policy Rates) using `XLSX` parser.

### Phase 2: Normalization

- **Date Alignment**: All sources (DD/MM/YYYY, YYYY-MM-DD, or Excel Serials) are normalized to an ISO-standard `YYYY-MM` string.
- **Unit Conversion**: Ensuring interest rates are decimals and GDP/Expenses are correctly scaled.

### Phase 3: Pillar Calculation (Feature Engineering)

- **Debt Stress**: Calculated as `(Interest Expense / GDP) * 100`.
- **Inflation Vol**: 6-month rolling standard deviation of YoY PCE/CPI change.
- **Bond-Equity Correlation**: 12-month rolling Pearson correlation proxy.

### Phase 4: Consolidation

- Single source of truth creation (`usMacroHistorical.json`) allowing the frontend to load thousands of data points instantly without API latency.
