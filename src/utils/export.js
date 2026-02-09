export function downloadReport(method, returns, allData, mvpResults, blResult, regimeResult, regimeContext) {
    let weights, vol, methodName

    if (method === 'blacklitterman') {
        weights = blResult.weights
        vol = blResult.vol
        methodName = 'Black-Litterman'
    } else if (method === 'regime') {
        // Convert weight object {code: weight} to aligned array
        weights = returns.codes.map(c => regimeResult.weights[c] || 0)
        vol = regimeResult.vol
        methodName = 'Regime-Optimized'
    } else {
        weights = mvpResults[method].weights
        vol = mvpResults[method].vol
        methodName = method.toUpperCase()
    }

    // 1. Prepare Daily Returns Section (Mirroring Standalone Tool)
    const retHeaders = ['Date', ...returns.codes.map(c => `"${allData[c].name}_Return"`)]
    const retRows = returns.dates.map(date => {
        return [date, ...returns.codes.map(c => (returns.returns[c][date] || 0).toFixed(6))]
    })
    const retCSV = [
        '=== Daily Returns ===',
        retHeaders.join(','),
        ...retRows.map(r => r.join(','))
    ].join('\n')

    // 2. Prepare Weights Section
    const wHeaders = ['Fund', 'Code', 'Weight', 'Weight_Pct']
    const wRows = returns.codes.map((c, i) => [
        `"${allData[c].name}"`,
        c,
        weights[i].toFixed(6),
        `${(weights[i] * 100).toFixed(2)}%`
    ])
    const wCSV = [
        `=== ${methodName} Portfolio Weights ===`,
        wHeaders.join(','),
        ...wRows.map(r => r.join(',')),
        '',
        `Portfolio Volatility,${(vol * 100).toFixed(2)}%`
    ].join('\n')

    // 3. Prepare Macro Summary Section (Authenticated Context)
    let macroCSV = ''
    if (regimeContext && regimeContext.detection) {
        const det = regimeContext.detection
        macroCSV = [
            '=== Authenticated Macro Context ===',
            `Region,${det.region || 'India'}`,
            `Dominant Regime,${det.dominant}`,
            `Detection Confidence,${(det.confidence * 100).toFixed(0)}%`,
            `Risk-Free Rate (G-Sec),${(regimeContext.riskFreeRate * 100).toFixed(2)}%`,
            `Analysis Timestamp,${regimeContext.timestamp}`,
            ''
        ].join('\n')
    }

    // 4. Combined Export
    const combinedData = macroCSV + '\n' + retCSV + '\n\n\n' + wCSV
    const blob = new Blob([combinedData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Portfolio_${methodName}_Full_Report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
}
