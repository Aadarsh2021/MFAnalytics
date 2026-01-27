import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://aqlomkilvvsvdrfwcspm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbG9ta2lsdnZzdmRyZndjc3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDYwNzUsImV4cCI6MjA4MTk4MjA3NX0.pxCKmd_48CyhH8XuoCWY95lKPLZFSrTkl076YK0iwBg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced categorization for the report
function getGranularCategory(fundName, sebiCategory = '') {
    const name = fundName.toLowerCase();
    const sc = (sebiCategory || '').toLowerCase();

    // 1. Gold Funds
    if (name.includes('gold') || name.includes('silver') || sc.includes('gold') || sc.includes('silver')) {
        return 'Gold Fund';
    }

    // 2. FOF (Fund of Funds)
    if (name.includes('fund of fund') || name.includes(' fof') || sc.includes('fund of funds')) {
        return 'FOF';
    }

    // 3. ETF
    if (name.includes(' etf') || sc.includes('etf')) {
        return 'ETF';
    }

    // 4. Equity
    if (sc.includes('equity scheme') || name.includes('equity') || name.includes('index') || name.includes('nifty') || name.includes('sensex') || name.includes('cap')) {
        // Exclude debt/hybrid keywords if equity not dominant
        if (!name.includes('debt') && !name.includes('hybrid') && !name.includes('balanced')) {
            return 'Equity';
        }
    }

    // 5. Debt - Short Term / Long Term
    if (sc.includes('debt scheme') || name.includes('debt') || name.includes('bond') || name.includes('liquid') || name.includes('gilt') || name.includes('treasury')) {
        const shortTermKeywords = ['liquid', 'overnight', 'ultra short', 'low duration', 'short duration', 'money market', 'short term', 'floater'];
        if (shortTermKeywords.some(k => name.includes(k))) {
            return 'Debt - Short Term';
        }
        return 'Debt - Long Term';
    }

    // 6. Hybrid
    if (sc.includes('hybrid scheme') || name.includes('hybrid') || name.includes('balanced') || name.includes('arbitrage') || name.includes('asset allocation')) {
        return 'Hybrid Fund';
    }

    // Fallback Equity check
    if (name.includes('growth') || name.includes('elss') || name.includes('tax saver')) {
        return 'Equity';
    }

    return 'Other / Unknown';
}

async function generateReport() {
    console.log('🚀 Starting Fund Report Generation...');

    try {
        // Fetch funds from fund_master
        let { data: funds, error } = await supabase
            .from('fund_master')
            .select('scheme_code, scheme_name, aum')
            .order('scheme_name', { ascending: true });

        if (error) throw error;

        if (!funds || funds.length === 0) {
            console.log('⚠️ No funds found in database. Fetching from api.mfapi.in as fallback...');
            const response = await fetch('https://api.mfapi.in/mf');
            funds = await response.json();
        }

        console.log(`📊 Processing ${funds.length} funds. 🚀 Starting Categorization...`);

        const reportData = funds.map(fund => {
            const name = fund.scheme_name || fund.schemeName;
            const code = fund.scheme_code || fund.schemeCode;

            if (!name) return null;

            const granularCategory = getGranularCategory(name, '');
            return {
                'Scheme Code': code,
                'Scheme Name': name,
                'AUM': fund.aum || '0',
                'System Category': granularCategory
            };
        }).filter(f => f !== null);

        // Convert to CSV
        const headers = Object.keys(reportData[0]);
        const csvContent = [
            headers.join(','),
            ...reportData.map(row =>
                headers.map(header => {
                    const val = String(row[header]).replace(/"/g, '""');
                    return `"${val}"`;
                }).join(',')
            )
        ].join('\n');

        const outputPath = path.join(process.cwd(), 'fund_report.csv');
        fs.writeFileSync(outputPath, csvContent);

        console.log(`✅ Report generated successfully: ${outputPath}`);

        // Count stats
        const stats = reportData.reduce((acc, curr) => {
            acc[curr['System Category']] = (acc[curr['System Category']] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📈 Category Breakdown:');
        Object.entries(stats).forEach(([cat, count]) => {
            console.log(`- ${cat}: ${count}`);
        });

    } catch (err) {
        console.error('❌ Error generating report:', err.message);
    }
}

generateReport();
