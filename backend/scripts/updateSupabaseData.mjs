// Script to update Supabase with latest India macro data
// This runs after fetchIndianMacroData.mjs to sync live data

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
        console.log('🚀 Starting Supabase data update...');

        // Read the latest historical data
        const dataPath = path.join(__dirname, '../../data/processed/indiaMacroHistorical.json');
        const historicalData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        // Get the latest entry (last item in array)
        const latestEntry = historicalData[historicalData.length - 1];

        if (!latestEntry) {
            console.error('❌ No data found in historical file');
            process.exit(1);
        }

        console.log(`📊 Latest data date: ${latestEntry.date}`);

        // Prepare data for Supabase
        const supabaseData = {
            region: 'India',
            data: latestEntry,
            updated_at: new Date().toISOString()
        };

        // Upsert to Supabase (insert or update)
        const { data, error } = await supabase
            .from('macro_data')
            .upsert(supabaseData, {
                onConflict: 'region'
            });

        if (error) {
            console.error('❌ Supabase update failed:', error.message);
            process.exit(1);
        }

        console.log('✅ Supabase updated successfully!');
        console.log(`📅 Data timestamp: ${supabaseData.updated_at}`);
        console.log(`📊 Latest values:`);
        console.log(`   - WPI Index: ${latestEntry.wpiIndex}`);
        console.log(`   - CPI Index: ${latestEntry.cpiIndex}`);
        console.log(`   - Repo Rate: ${latestEntry.repoRate}%`);

    } catch (error) {
        console.error('❌ Error updating Supabase:', error.message);
        process.exit(1);
    }
}

updateSupabaseData();
