import { NavData } from "./api";

export interface PortfolioResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface OptimizationResult {
  portfolios: PortfolioResult[];
  maxSharpePortfolio: PortfolioResult;
  minVolatilityPortfolio: PortfolioResult;
  fundCodes: number[];
  fundNames: string[];
}

// Calculate daily returns from NAV data
function calculateDailyReturns(navData: NavData[]): number[] {
  const returns: number[] = [];
  for (let i = 0; i < navData.length - 1; i++) {
    const currentNav = parseFloat(navData[i].nav);
    const previousNav = parseFloat(navData[i + 1].nav);
    returns.push((currentNav - previousNav) / previousNav);
  }
  return returns;
}

// Calculate mean of array
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Calculate standard deviation
function standardDeviation(arr: number[]): number {
  const avg = mean(arr);
  const squareDiffs = arr.map((value) => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

// Calculate covariance matrix
function covarianceMatrix(returnArrays: number[][]): number[][] {
  const n = returnArrays.length;
  const minLength = Math.min(...returnArrays.map((arr) => arr.length));
  
  // Trim all arrays to same length
  const trimmedArrays = returnArrays.map((arr) => arr.slice(0, minLength));
  const means = trimmedArrays.map(mean);
  
  const covMatrix: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    covMatrix[i] = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < minLength; k++) {
        sum += (trimmedArrays[i][k] - means[i]) * (trimmedArrays[j][k] - means[j]);
      }
      covMatrix[i][j] = sum / (minLength - 1);
    }
  }
  
  return covMatrix;
}

// Generate random weights that sum to 1
function randomWeights(n: number): number[] {
  const weights = Array.from({ length: n }, () => Math.random());
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

// Calculate portfolio metrics
function portfolioMetrics(
  weights: number[],
  meanReturns: number[],
  covMatrix: number[][],
  riskFreeRate: number = 0.05 / 252 // Daily risk-free rate
): { expectedReturn: number; volatility: number; sharpeRatio: number } {
  // Expected return (annualized)
  let expectedReturn = 0;
  for (let i = 0; i < weights.length; i++) {
    expectedReturn += weights[i] * meanReturns[i];
  }
  expectedReturn *= 252; // Annualize

  // Portfolio variance
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  const volatility = Math.sqrt(variance * 252); // Annualize

  // Sharpe ratio
  const sharpeRatio = (expectedReturn - riskFreeRate * 252) / volatility;

  return { expectedReturn, volatility, sharpeRatio };
}

// Run Monte Carlo simulation
export function runMonteCarloSimulation(
  fundNavData: { code: number; name: string; data: NavData[] }[],
  iterations: number = 10000
): OptimizationResult {
  // Calculate returns for each fund
  const returnArrays = fundNavData.map((fund) => calculateDailyReturns(fund.data));
  
  // Calculate mean returns and covariance matrix
  const meanReturns = returnArrays.map(mean);
  const covMatrix = covarianceMatrix(returnArrays);
  
  const portfolios: PortfolioResult[] = [];
  let maxSharpePortfolio: PortfolioResult | null = null;
  let minVolatilityPortfolio: PortfolioResult | null = null;
  
  for (let i = 0; i < iterations; i++) {
    const weights = randomWeights(fundNavData.length);
    const metrics = portfolioMetrics(weights, meanReturns, covMatrix);
    
    const portfolio: PortfolioResult = {
      weights,
      ...metrics,
    };
    
    portfolios.push(portfolio);
    
    // Update optimal portfolios
    if (!maxSharpePortfolio || metrics.sharpeRatio > maxSharpePortfolio.sharpeRatio) {
      maxSharpePortfolio = portfolio;
    }
    
    if (!minVolatilityPortfolio || metrics.volatility < minVolatilityPortfolio.volatility) {
      minVolatilityPortfolio = portfolio;
    }
  }
  
  return {
    portfolios,
    maxSharpePortfolio: maxSharpePortfolio!,
    minVolatilityPortfolio: minVolatilityPortfolio!,
    fundCodes: fundNavData.map((f) => f.code),
    fundNames: fundNavData.map((f) => f.name),
  };
}
