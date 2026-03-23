import fs from 'fs';
import path from 'path';

const CSV_PATH = 'c:/Users/thaku/Desktop/Work/MFP/data/new data/S&P 500 Historical Data.csv';

function calculateRiskMetrics() {
    if (!fs.existsSync(CSV_PATH)) {
        console.error("CSV not found");
        return;
    }

    const content = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    const csvRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    const returns = [];
    let prevPrice = null;

    // The CSV is likely in reverse chronological order (newest first)
    // We need to either reverse it or handle the order.
    // Let's parse all prices first.
    const prices = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(csvRegex).map(v => v.replace(/"/g, '').trim());
        const price = parseFloat(cols[1].replace(/,/g, ''));
        if (!isNaN(price)) {
            prices.push(price);
        }
    }

    // Since most investing.com exports are newest first, we reverse to get chronologically.
    prices.reverse();

    for (let i = 1; i < prices.length; i++) {
        const ret = (prices[i] / prices[i - 1]) - 1;
        returns.push(ret);
    }

    if (returns.length === 0) return;

    // Sort returns (lowest to highest)
    const sortedReturns = [...returns].sort((a, b) => a - b);

    function getVaR(confidence) {
        const alpha = 1 - confidence;
        const index = Math.floor(alpha * sortedReturns.length);
        return -sortedReturns[index]; // Return as positive loss
    }

    function getCVaR(confidence) {
        const alpha = 1 - confidence;
        const index = Math.floor(alpha * sortedReturns.length);
        const tail = sortedReturns.slice(0, index);
        const avgTail = tail.reduce((a, b) => a + b, 0) / tail.length;
        return -avgTail;
    }

    console.log(`Sample size: ${returns.length} days`);
    console.log(`Daily VaR (95%): ${(getVaR(0.95) * 100).toFixed(2)}%`);
    console.log(`Daily VaR (99%): ${(getVaR(0.99) * 100).toFixed(2)}%`);
    console.log(`Daily CVaR (95%): ${(getCVaR(0.95) * 100).toFixed(2)}%`);
    console.log(`Daily CVaR (99%): ${(getCVaR(0.99) * 100).toFixed(2)}%`);
}

calculateRiskMetrics();
