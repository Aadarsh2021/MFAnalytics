const BASE_URL = "https://api.mfapi.in/mf";

export interface FundScheme {
  schemeCode: number;
  schemeName: string;
}

export interface NavData {
  date: string;
  nav: string;
}

export interface FundDetails {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
  };
  data: NavData[];
}

// Cache for fund list
let fundListCache: FundScheme[] | null = null;

export async function getAllFunds(): Promise<FundScheme[]> {
  if (fundListCache) return fundListCache;
  
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error("Failed to fetch fund list");
  
  const data = await response.json();
  fundListCache = data;
  return data;
}

export async function getFundDetails(schemeCode: number | string): Promise<FundDetails> {
  const response = await fetch(`${BASE_URL}/${schemeCode}`);
  if (!response.ok) throw new Error("Failed to fetch fund details");
  return response.json();
}

export async function searchFunds(query: string): Promise<FundScheme[]> {
  const funds = await getAllFunds();
  const lowerQuery = query.toLowerCase();
  return funds.filter(
    (fund) =>
      fund.schemeName.toLowerCase().includes(lowerQuery) ||
      fund.schemeCode.toString().includes(query)
  );
}

export function getRiskLevel(category: string): { level: string; color: string } {
  const lowRisk = ["liquid", "overnight", "money market", "ultra short", "low duration"];
  const highRisk = ["small cap", "mid cap", "sectoral", "thematic", "flexi cap"];
  
  const lowerCategory = category.toLowerCase();
  
  if (lowRisk.some((r) => lowerCategory.includes(r))) {
    return { level: "Low Risk", color: "success" };
  }
  if (highRisk.some((r) => lowerCategory.includes(r))) {
    return { level: "High Risk", color: "destructive" };
  }
  return { level: "Moderate Risk", color: "warning" };
}

export function calculateReturns(navData: NavData[], days: number): number | null {
  if (navData.length < days) return null;
  
  const currentNav = parseFloat(navData[0].nav);
  const oldNav = parseFloat(navData[Math.min(days, navData.length - 1)].nav);
  
  return ((currentNav - oldNav) / oldNav) * 100;
}

export function generateCSV(navData: NavData[], schemeName: string): string {
  const header = "Date,NAV\n";
  const rows = navData.map((d) => `${d.date},${d.nav}`).join("\n");
  return header + rows;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
