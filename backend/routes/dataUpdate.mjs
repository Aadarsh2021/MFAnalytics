import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * POST /api/update-india-data
 * Triggers manual update of India macro data
 */
router.post('/update-india-data', async (req, res) => {
    console.log('🔄 Manual India data update triggered...');

    try {
        const projectRoot = path.join(__dirname, '..', '..');
        const scriptPath = path.join(projectRoot, 'backend', 'scripts', 'fetchIndianMacroData.mjs');

        // Run the update script
        const { stdout, stderr } = await execAsync(
            `node "${scriptPath}"`,
            {
                cwd: projectRoot,
                env: process.env,
                timeout: 60000 // 60 second timeout
            }
        );

        console.log('✅ India data update completed');

        res.json({
            success: true,
            message: 'India macro data updated successfully',
            output: stdout,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ India data update failed:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to update India macro data',
            error: error.message,
            stderr: error.stderr
        });
    }
});

/**
 * GET /api/update-india-data/status
 * Check last update status
 */
router.get('/update-india-data/status', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const dataPath = path.join(__dirname, '..', '..', 'data', 'processed', 'indiaMacroHistorical.json');

        const stats = await fs.stat(dataPath);
        const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));

        res.json({
            success: true,
            lastModified: stats.mtime,
            totalEntries: data.length,
            latestDate: data[data.length - 1]?.date,
            latestData: data[data.length - 1]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
