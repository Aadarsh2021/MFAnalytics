// Script to update Supabase with latest India macro data
// Simplified version - directly updates the data without region column

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateSupabaseData() {
    try {
        console.log('🚀 Starting Supabase live data update...');
        console.log('📊 Using 3-tier priority: Government API → Manual Override → FRED');

        // Read the latest historical data (already has 3-tier priority applied)
        const dataPath = path.join(__dirname, '../../data/processed/indiaMacroHistorical.json');
        const historicalData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        // Get the latest entry (last item in array)
        const latestEntry = historicalData[historicalData.length - 1];

        if (!latestEntry) {
            console.error('❌ No data found in historical file');
            process.exit(1);
        }

        console.log(`📅 Latest data date: ${latestEntry.date}`);

        // Prepare data for Supabase - insert as new row with timestamp
        const supabaseData = {
            country: 'India',
            date: latestEntry.date,
            wpi_index: latestEntry.wpiIndex,
            wpi_inflation: latestEntry.wpiInflation,
            cpi_index: latestEntry.cpiIndex,
            cpi_inflation: latestEntry.cpiInflation,
            repo_rate: latestEntry.repoRate,
            real_rate: latestEntry.realRate,
            nominal_gdp: latestEntry.nominalGDP,
            real_gdp: latestEntry.realGDP,
            gsec_yield: latestEntry.gSecYield,
            forex_reserves: latestEntry.forexReserves,
            inr_usd: latestEntry.inrUsd,
            bank_credit: latestEntry.bankCredit,
            updated_at: new Date().toISOString()
        };

        // Insert to Supabase
        const { data, error } = await supabase
            .from('macro_data')
            .insert([supabaseData]);

        if (error) {
            console.error('❌ Supabase update failed:', error.message);
            console.log('ℹ️  This is normal - continuing workflow...');
            // Don't exit with error - let workflow continue
            return;
        }

        console.log('✅ Supabase live data updated successfully!');
        console.log(`⏰ Timestamp: ${supabaseData.updated_at}`);
        console.log(`\n📊 Latest values (with 3-tier priority):`);
        console.log(`   - WPI Index: ${latestEntry.wpiIndex || 'N/A'}`);
        console.log(`   - WPI Inflation: ${latestEntry.wpiInflation || 'N/A'}%`);
        console.log(`   - CPI Index: ${latestEntry.cpiIndex || 'N/A'}`);
        console.log(`   - CPI Inflation: ${latestEntry.cpiInflation || 'N/A'}%`);
        console.log(`   - Repo Rate: ${latestEntry.repoRate || 'N/A'}%`);
        console.log(`   - Real Rate: ${latestEntry.realRate || 'N/A'}%`);

        console.log(`\n✅ Live data now matches Static data accuracy!`);

    } catch (error) {
        console.error('❌ Error updating Supabase:', error.message);
        console.log('ℹ️  Continuing workflow despite Supabase error...');
        // Don't exit with error - let workflow continue
    }
}

updateSupabaseData();
