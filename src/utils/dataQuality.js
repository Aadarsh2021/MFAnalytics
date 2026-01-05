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

    const qualityScore = Math.round((completeDates / totalDates) * 100)

    return {
        score: qualityScore,
        completeDates,
        totalDates,
        missingData,
        dateRange: {
            start: alignedData.dates[alignedData.dates.length - 1],
            end: alignedData.dates[0],
            days: totalDates
        },
        lastUpdate: alignedData.dates[0]
    }
}
