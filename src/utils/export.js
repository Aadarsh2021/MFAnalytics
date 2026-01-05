export function downloadReport(method, returns, allData, mvpResults, blResult) {
    let weights, vol, methodName

    if (method === 'blacklitterman') {
        weights = blResult.weights
        vol = blResult.vol
        methodName = 'Black-Litterman'
    } else {
        weights = mvpResults[method].weights
        vol = mvpResults[method].vol
        methodName = method.toUpperCase()
    }

    const wHeaders = ['Fund', 'Code', 'Weight', 'Weight_Pct']
    const wRows = returns.codes.map((c, i) => [
        `"${allData[c].name}"`,
        c,
        weights[i].toFixed(6),
        `${(weights[i] * 100).toFixed(2)}%`
    ])
    const wCSV = [
        wHeaders.join(','),
        ...wRows.map(r => r.join(',')),
        '',
        `Portfolio Volatility,${(vol * 100).toFixed(2)}%`
    ].join('\n')

    const blob = new Blob([wCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Portfolio_${methodName}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
}
