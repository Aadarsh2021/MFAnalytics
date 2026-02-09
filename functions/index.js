const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

/**
 * CORS Proxy for MF API
 * Proxies requests to api.mfapi.in to avoid CORS issues
 */
exports.mfApiProxy = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            // Only allow GET requests
            if (req.method !== 'GET') {
                return res.status(405).json({ error: 'Method not allowed' });
            }

            // Fetch from MF API
            const apiUrl = 'https://api.mfapi.in/mf';
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`MF API returned ${response.status}`);
            }

            const data = await response.json();

            // Cache for 24 hours
            res.set('Cache-Control', 'public, max-age=86400');
            return res.status(200).json(data);

        } catch (error) {
            console.error('MF API Proxy Error:', error);
            return res.status(500).json({
                error: 'Failed to fetch MF data',
                message: error.message
            });
        }
    });
});
