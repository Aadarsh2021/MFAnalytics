export function parseDate(s) {
    const [d, m, y] = s.split('-')
    return new Date(y, m - 1, d)
}

export function alignData(allData) {
    const codes = Object.keys(allData)
    let latestStart = null

    codes.forEach(code => {
        const dates = allData[code].data
        const start = parseDate(dates[dates.length - 1].date)
        if (!latestStart || start > latestStart) latestStart = start
    })

    const nav = {}
    const dateSet = new Set()

    codes.forEach(code => {
        nav[code] = {}
        allData[code].data.forEach(item => {
            const d = parseDate(item.date)
            if (d >= latestStart) {
                nav[code][item.date] = parseFloat(item.nav)
                dateSet.add(item.date)
            }
        })
    })

    const allDates = Array.from(dateSet).sort((a, b) => parseDate(b) - parseDate(a))
    const common = allDates.filter(d => codes.every(c => nav[c][d]))

    return { dates: common, codes, nav }
}

export function calculateReturns(aligned) {
    const ret = {}
    const dates = aligned.dates.slice(0, -1)

    aligned.codes.forEach(code => {
        ret[code] = {}
        for (let i = 0; i < dates.length; i++) {
            const today = dates[i]
            const yesterday = aligned.dates[i + 1]
            const nav1 = aligned.nav[code][today]
            const nav2 = aligned.nav[code][yesterday]
            if (nav1 && nav2 && nav2 !== 0) {
                ret[code][today] = (nav1 - nav2) / nav2
            }
        }
    })

    return { dates, codes: aligned.codes, returns: ret }
}
