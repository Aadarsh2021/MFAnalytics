// Data quality analysis utility
export function analyzeDataQuality(alignedData, allData) {
    const totalDates = alignedData.dates.length
    const codes = alignedData.codes
    const missingData = []

    codes.forEach(code => {
        let gaps = 0
        alignedData.dates.forEach(date => {
            if (!alignedData.nav[code][date]) gaps++
        })
        if (gaps > 0) {
            missingData.push({ fund: allData[code].name, gaps })
        }
    })

    const completeDates = alignedData.dates.filter(date =>
        codes.every(code => alignedData.nav[code][date])
    ).length

    const qualityScore = totalDates > 0 ? Math.round((completeDates / totalDates) * 100) : 0
    const lastUpdate = totalDates > 0 ? alignedData.dates[0] : 'N/A'
    const start = totalDates > 0 ? alignedData.dates[totalDates - 1] : 'N/A'

    return {
        score: qualityScore,
        completeDates,
        totalDates,
        missingData,
        dateRange: {
            start,
            end: lastUpdate,
            days: totalDates
        },
        lastUpdate
    }
}
