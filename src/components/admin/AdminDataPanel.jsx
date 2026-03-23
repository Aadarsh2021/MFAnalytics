import React, { useState } from 'react';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Admin Panel Component
 * Provides one-click data update for non-technical clients
 */
export default function AdminDataPanel() {
    const [updating, setUpdating] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    const handleUpdateData = async () => {
        setUpdating(true);
        setError('');
        setStatus('🔄 Updating India macro data...');

        try {
            // For Electron/Desktop app - direct script execution
            if (window.electron) {
                const result = await window.electron.updateIndiaData();
                setStatus('✅ Data updated successfully!');
                setLastUpdate(new Date().toLocaleString());
            }
            // For Web app - API call
            else {
                const response = await fetch('/api/update-india-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await response.json();

                if (data.success) {
                    setStatus('✅ Data updated successfully!');
                    setLastUpdate(new Date().toLocaleString());
                } else {
                    throw new Error(data.message || 'Update failed');
                }
            }
        } catch (err) {
            setError('❌ Update failed: ' + err.message);
            setStatus('');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="admin-data-panel" style={styles.container}>
            <div style={styles.card}>
                <h3 style={styles.title}>📊 India Macro Data Management</h3>

                <div style={styles.infoBox}>
                    <p style={styles.infoText}>
                        Click the button below to update India macro data with the latest official figures.
                    </p>
                    <p style={styles.hint}>
                        💡 Recommended: Update monthly (around 15th) after new data is released
                    </p>
                </div>

                <button
                    onClick={handleUpdateData}
                    disabled={updating}
                    style={{
                        ...styles.button,
                        ...(updating ? styles.buttonDisabled : styles.buttonActive)
                    }}
                >
                    {updating ? '⏳ Updating...' : '🔄 Update India Data Now'}
                </button>

                {status && (
                    <div style={styles.statusSuccess}>
                        {status}
                    </div>
                )}

                {error && (
                    <div style={styles.statusError}>
                        {error}
                    </div>
                )}

                {lastUpdate && (
                    <div style={styles.lastUpdate}>
                        Last updated: {lastUpdate}
                    </div>
                )}

                <div style={styles.dataSourceInfo}>
                    <h4 style={styles.subtitle}>Data Sources (Priority Order):</h4>
                    <ol style={styles.list}>
                        <li>🏛️ <strong>Government APIs</strong> (data.gov.in) - Official, latest</li>
                        <li>📋 <strong>Manual Overrides</strong> - Your verified entries</li>
                        <li>📊 <strong>FRED</strong> - Historical fallback</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto'
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
    },
    title: {
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#1a1a1a'
    },
    subtitle: {
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '8px',
        color: '#333'
    },
    infoBox: {
        backgroundColor: '#f5f9ff',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #d0e4ff'
    },
    infoText: {
        margin: '0 0 8px 0',
        fontSize: '14px',
        color: '#333',
        lineHeight: '1.5'
    },
    hint: {
        margin: '0',
        fontSize: '13px',
        color: '#666',
        fontStyle: 'italic'
    },
    button: {
        width: '100%',
        padding: '14px 24px',
        fontSize: '16px',
        fontWeight: '600',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginBottom: '16px'
    },
    buttonActive: {
        backgroundColor: '#0066cc',
        color: 'white',
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
        color: '#666',
        cursor: 'not-allowed'
    },
    statusSuccess: {
        padding: '12px',
        backgroundColor: '#e8f5e9',
        color: '#2e7d32',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '14px',
        fontWeight: '500'
    },
    statusError: {
        padding: '12px',
        backgroundColor: '#ffebee',
        color: '#c62828',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '14px',
        fontWeight: '500'
    },
    lastUpdate: {
        fontSize: '13px',
        color: '#666',
        textAlign: 'center',
        marginBottom: '20px'
    },
    dataSourceInfo: {
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid #e0e0e0'
    },
    list: {
        margin: '8px 0',
        paddingLeft: '20px',
        fontSize: '13px',
        lineHeight: '1.8',
        color: '#555'
    }
};
