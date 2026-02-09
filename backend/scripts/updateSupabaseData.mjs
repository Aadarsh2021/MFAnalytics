// Updated Supabase sync script with upsert logic
// Uses ON CONFLICT to update existing records or insert new ones

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

        // Prepare data for Supabase
        const supabaseData = {
            country: 'India',
            date: latestEntry.date,
            wpi_index: latestEntry.wpiIndex || null,
            wpi_inflation: latestEntry.wpiInflation || null,
            cpi_index: latestEntry.cpiIndex || null,
            cpi_inflation: latestEntry.cpiInflation || null,
            repo_rate: latestEntry.repoRate || null,
            real_rate: latestEntry.realRate || null,
            nominal_gdp: latestEntry.nominalGDP || null,
            real_gdp: latestEntry.realGDP || null,
            gsec_yield: latestEntry.gSecYield || null,
            forex_reserves: latestEntry.forexReserves || null,
            inr_usd: latestEntry.inrUsd || null,
            bank_credit: latestEntry.bankCredit || null,
            updated_at: new Date().toISOString()
        };

        // Upsert to Supabase (insert or update based on country+date unique constraint)
        const { data, error } = await supabase
            .from('macro_data')
            .upsert(supabaseData, {
                onConflict: 'country,date'
            })
            .select();

        if (error) {
            console.error('❌ Supabase update failed:', error.message);
            console.log('ℹ️  Please run the SQL migration first:');
            console.log('   supabase/migrations/create_macro_data_table.sql');
            console.log('ℹ️  Continuing workflow...');
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
        console.log(`   - Forex Reserves: $${latestEntry.forexReserves || 'N/A'}B`);

        console.log(`\n✅ Live data now matches Static data accuracy!`);
        console.log(`✅ Upsert successful - data updated in Supabase`);

    } catch (error) {
        console.error('❌ Error updating Supabase:', error.message);
        console.log('ℹ️  Continuing workflow despite Supabase error...');
    }
}

updateSupabaseData();
