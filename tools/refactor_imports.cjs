const fs = require('fs');
const path = require('path');

// Mapping of filename to new relative path (from src/)
// This map covers files that were moved.
const fileMap = {
    // Components -> common
    'Header.jsx': 'components/common/Header.jsx',
    'Sidebar.jsx': 'components/common/Sidebar.jsx',
    'MessageBox.jsx': 'components/common/MessageBox.jsx',
    'ErrorBoundary.jsx': 'components/common/ErrorBoundary.jsx',
    'ProtectedRoute.jsx': 'components/common/ProtectedRoute.jsx',
    'StatusTracker.jsx': 'components/common/StatusTracker.jsx',
    'ProgressSteps.jsx': 'components/common/ProgressSteps.jsx',
    'ProgressTimeline.jsx': 'components/common/ProgressTimeline.jsx',
    'HistorySidebar.jsx': 'components/common/HistorySidebar.jsx',

    // Components -> dashboard
    'SixPillarsDashboard.jsx': 'components/dashboard/SixPillarsDashboard.jsx',
    'RegimeAllocationChart.jsx': 'components/dashboard/RegimeAllocationChart.jsx',
    'RegimeTransitionIndicator.jsx': 'components/dashboard/RegimeTransitionIndicator.jsx',
    'RegimeSelector.jsx': 'components/dashboard/RegimeSelector.jsx',
    'InsightsPanel.jsx': 'components/dashboard/InsightsPanel.jsx',

    // Components -> steps
    'Step1SearchFunds.jsx': 'components/steps/Step1SearchFunds.jsx',
    'AdvancedFundFilter.jsx': 'components/steps/AdvancedFundFilter.jsx',
    'FundMetadataPanel.jsx': 'components/steps/FundMetadataPanel.jsx',
    'FundCategoryPanel.jsx': 'components/steps/FundCategoryPanel.jsx',
    'Step2FetchData.jsx': 'components/steps/Step2FetchData.jsx',
    'DataFeeder.jsx': 'components/steps/DataFeeder.jsx',
    'DataQualityPanel.jsx': 'components/steps/DataQualityPanel.jsx',
    'Step3MVPAnalysis.jsx': 'components/steps/Step3MVPAnalysis.jsx',
    'Step4ARegimeViews.jsx': 'components/steps/Step4ARegimeViews.jsx',
    'Step4BBlackLittermanViews.jsx': 'components/steps/Step4BBlackLittermanViews.jsx',
    'Step4ChooseOptimizationPath.jsx': 'components/steps/Step4ChooseOptimizationPath.jsx',
    'Step4SetViews.jsx': 'components/steps/Step4SetViews.jsx',
    'Step5ARegimeOptimization.jsx': 'components/steps/Step5ARegimeOptimization.jsx',
    'Step5BlackLitterman.jsx': 'components/steps/Step5BlackLitterman.jsx',
    'Step6MonteCarlo.jsx': 'components/steps/Step6MonteCarlo.jsx',
    'Step7FinalReport.jsx': 'components/steps/Step7FinalReport.jsx',

    // Components -> admin
    'AdminDataPanel.jsx': 'components/admin/AdminDataPanel.jsx',

    // Components -> modals
    'PastAnalysisModal.jsx': 'components/modals/PastAnalysisModal.jsx',
    'RegimeAlertModal.jsx': 'components/modals/RegimeAlertModal.jsx',

    // Components -> analysis
    'BacktestResults.jsx': 'components/analysis/BacktestResults.jsx',
    'BacktestingPanel.jsx': 'components/analysis/BacktestingPanel.jsx',

    // Utils -> api
    'apiOptimized.js': 'utils/api/apiOptimized.js',
    'corsProxy.js': 'utils/api/corsProxy.js',
    'supabase.js': 'utils/api/supabase.js',
    'LiveIndianDataService.js': 'utils/api/LiveIndianDataService.js',

    // Utils -> calculation
    'matrixOps.js': 'utils/calculation/matrixOps.js',
    'optimization.js': 'utils/calculation/optimization.js',
    'memoization.js': 'utils/calculation/memoization.js',
    'blackLitterman.js': 'utils/calculation/blackLitterman.js',

    // Utils -> data
    'dataProcessing.js': 'utils/data/dataProcessing.js',
    'dataQuality.js': 'utils/data/dataQuality.js',
    'export.js': 'utils/data/export.js',

    // Utils -> regime
    'regimeDetector.js': 'utils/regime/regimeDetector.js',
    'regimeSanityChecks.js': 'utils/regime/regimeSanityChecks.js',
    'regimeStressTests.js': 'utils/regime/regimeStressTests.js',
    'regimeTransitions.js': 'utils/regime/regimeTransitions.js',
    'macroDataProcessor.js': 'utils/regime/macroDataProcessor.js',
    'calculate_regime_metrics.mjs': 'utils/regime/calculate_regime_metrics.mjs',

    // Utils -> funds
    'fundCategorization.js': 'utils/funds/fundCategorization.js',
    'assetClassUtils.js': 'utils/funds/assetClassUtils.js',
    'indianExpressionLayer.js': 'utils/funds/indianExpressionLayer.js',

    // Utils -> backtest
    'backtestEngine.js': 'utils/backtest/backtestEngine.js'
};

const srcDir = path.resolve('src');
const rootScriptsDir = path.resolve('scripts');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.mjs')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

// Get all source files + root scripts
let filesToUpdate = getAllFiles(srcDir, []);
const scriptFiles = getAllFiles(rootScriptsDir, []);
filesToUpdate = filesToUpdate.concat(scriptFiles);

// Add Root App.jsx and main.jsx if they exist in src root
filesToUpdate.push(path.join(srcDir, 'App.jsx'));
filesToUpdate.push(path.join(srcDir, 'main.jsx'));

console.log(`Checking ${filesToUpdate.length} files for import updates...`);

filesToUpdate.forEach(file => {
    try {
        if (!fs.existsSync(file)) return;

        let content = fs.readFileSync(file, 'utf8');
        let originalContent = content;

        // Ensure relative paths from logic
        const fileDir = path.dirname(file);

        // Replace logic for each known file
        Object.keys(fileMap).forEach(filename => {
            const newPath = fileMap[filename];

            // Regex to find imports ending with this filename
            // Matches: import ... from './path/to/Filename' or '../Filename'
            // We need to be careful not to match partial names (e.g. 'Data.js' matching 'MacroData.js')
            // Strategy: Look for the filename (minus extension) at the end of the import string

            const nameNoExt = path.basename(filename, path.extname(filename));

            // Regex breakdown:
            // (import\s+.*?from\s+['"])   -> Capture import start
            // ([\.\/]+.*?)                 -> Capture path prefix
            // \/nameNoExt                  -> Match /nameNoExt
            // (['"])                       -> Quote close

            // Simpler approach: find any string that looks like a path ending in /nameNoExt 
            // and see if it resolves to the old location, then replace with new location relative to current file.

            // We'll iterate all imports and check if they resolve to a moved file.
            const importRegex = /from\s+['"]([^'"]+)['"]/g;

            content = content.replace(importRegex, (match, importPath) => {
                // Ignore node_modules
                if (!importPath.startsWith('.')) return match;

                // Get absolute path of import based on current file location
                const absoluteImport = path.resolve(fileDir, importPath);

                // Check if this import points to the *old* location of the file we are currently checking in the loop (filename)
                // Actually, we don't know the old location easily since we just have the filename.
                // But we know all "DataQualityPanel.jsx" imports refer to the same Component (usually).
                // Let's assume unique filenames for now as per map.

                const importBasename = path.basename(importPath);
                const importExt = path.extname(importPath);

                let targetFile = filename;

                // Match exact filename or filename without extension
                if (importBasename === filename || importBasename === nameNoExt) {
                    // Determine relative path to the NEW location
                    const absoluteNewPath = path.join(srcDir, newPath);
                    let relativeNewPath = path.relative(fileDir, absoluteNewPath);

                    // Ensure ./ prefix if needed
                    if (!relativeNewPath.startsWith('.')) {
                        relativeNewPath = './' + relativeNewPath;
                    }

                    // Convert Windows backslashes to forward slashes for imports
                    relativeNewPath = relativeNewPath.replace(/\\/g, '/');

                    // If original import didn't have extension, maybe keep it that way?
                    // But explicit is better. Let's start with keeping it as is, or remove .jsx if originally absent
                    if (!importPath.endsWith('.jsx') && !importPath.endsWith('.js') && !importPath.endsWith('.mjs')) {
                        const ext = path.extname(newPath);
                        relativeNewPath = relativeNewPath.replace(ext, '');
                    }

                    console.log(`Updated ${path.basename(file)}: ${importPath} -> ${relativeNewPath}`);
                    return `from '${relativeNewPath}'`;
                }

                return match;
            });

            // Also handle dynamic imports or require? (Skipping for now as project uses ES6 mostly)
        });

        if (content !== originalContent) {
            fs.writeFileSync(file, content, 'utf8');
        }
    } catch (e) {
        console.error(`Error processing ${file}:`, e);
    }
});
