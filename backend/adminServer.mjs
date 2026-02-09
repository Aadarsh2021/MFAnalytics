/**
 * Simple Node.js server to handle data update requests
 * Run this alongside your React app for the admin panel to work
 */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Data update server running' });
});

// Update India data endpoint
app.post('/api/update-india-data', async (req, res) => {
    console.log('🔄 India data update triggered...');

    try {
        const projectRoot = path.join(__dirname, '..');
        const command = 'npm run update-macro-india';

        const { stdout, stderr } = await execAsync(command, {
            cwd: projectRoot,
            timeout: 60000
        });

        console.log('✅ Update completed');

        res.json({
            success: true,
            message: 'India macro data updated successfully',
            output: stdout,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Update failed:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update data',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Data update server running on http://localhost:${PORT}`);
    console.log(`   Admin panel can now trigger updates`);
});
