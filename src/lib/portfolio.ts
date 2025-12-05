export interface PortfolioHolding {
  id: string;
  schemeCode: number;
  schemeName: string;
  purchaseNav: number;
  units: number;
  purchaseDate: string;
  currentNav?: number;
  currentValue?: number;
  investedValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

const STORAGE_KEY = "mf_portfolio";

export function getPortfolio(): PortfolioHolding[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function savePortfolio(holdings: PortfolioHolding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
}

export function addHolding(holding: Omit<PortfolioHolding, "id">): PortfolioHolding {
  const portfolio = getPortfolio();
  const newHolding: PortfolioHolding = {
    ...holding,
    id: crypto.randomUUID(),
  };
  portfolio.push(newHolding);
  savePortfolio(portfolio);
  return newHolding;
}

export function removeHolding(id: string) {
  const portfolio = getPortfolio();
  const filtered = portfolio.filter((h) => h.id !== id);
  savePortfolio(filtered);
}

export function updateHolding(id: string, updates: Partial<PortfolioHolding>) {
  const portfolio = getPortfolio();
  const index = portfolio.findIndex((h) => h.id === id);
  if (index !== -1) {
    portfolio[index] = { ...portfolio[index], ...updates };
    savePortfolio(portfolio);
  }
}

export function calculateHoldingMetrics(
  holding: PortfolioHolding,
  currentNav: number
): PortfolioHolding {
  const investedValue = holding.purchaseNav * holding.units;
  const currentValue = currentNav * holding.units;
  const profitLoss = currentValue - investedValue;
  const profitLossPercent = (profitLoss / investedValue) * 100;

  return {
    ...holding,
    currentNav,
    currentValue,
    investedValue,
    profitLoss,
    profitLossPercent,
  };
}
