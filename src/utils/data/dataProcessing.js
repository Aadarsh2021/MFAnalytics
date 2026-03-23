export function parseDate(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    const parts = s.split('-');
    if (parts.length !== 3) return null;
    let d, m, y;
    if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]) - 1; d = parseInt(parts[2]); }
    else { d = parseInt(parts[0]); m = parseInt(parts[1]) - 1; y = parseInt(parts[2]); }
    const date = new Date(y, m, d);
    date.setHours(0, 0, 0, 0);
    return isNaN(date.getTime()) ? null : date;
}

export function alignData(allData) {
    const codes = Object.keys(allData);
    if (codes.length === 0) return { dates: [], codes: [], nav: {}, metadata: {} };

    const fundMetadata = {};
    let globalStart = null;
    let globalEnd = null;

    // 1. First Pass: Collect metadata even if overlap fails
    codes.forEach(code => {
        let raw = allData[code].data || [];
        if (raw.length === 0) return;

        // Ensure strictly descending sort
        raw.sort((a, b) => parseDate(b.date) - parseDate(a.date));

        const oldestD = parseDate(raw[raw.length - 1].date);
        const newestD = parseDate(raw[0].date);

        if (!globalStart || oldestD > globalStart) globalStart = oldestD;
        if (!globalEnd || newestD < globalEnd) {
            globalEnd = newestD;
        }


        fundMetadata[code] = {
            name: allData[code].name,
            totalDays: raw.length,
            inceptionDate: raw[raw.length - 1].date,
            latestDate: raw[0].date,
            inceptionDateObj: oldestD,
            latestDateObj: newestD,
            navMap: new Map(raw.map(item => [item.date, parseFloat(item.nav)]))
        };
    });

    const hasOverlap = globalStart && globalEnd && globalStart <= globalEnd;

    // 2. Alignment Logic (runs only if overlap exists)
    let finalDates = [];
    const alignedNav = {};
    codes.forEach(c => alignedNav[c] = {});

    if (hasOverlap) {
        const masterDateSet = new Set();
        codes.forEach(code => {
            allData[code].data.forEach(item => {
                const d = parseDate(item.date);
                if (d && d >= globalStart && d <= globalEnd) masterDateSet.add(item.date);
            });
        });

        const sortedDates = Array.from(masterDateSet).sort((a, b) => parseDate(b) - parseDate(a));
        const currentNavs = {};
        codes.forEach(c => currentNavs[c] = null);

        const chronological = [...sortedDates].reverse();
        const commonDates = [];

        chronological.forEach(dStr => {
            let allReady = true;
            codes.forEach(code => {
                // Update current NAV if available for this date
                if (fundMetadata[code].navMap.has(dStr)) {
                    currentNavs[code] = fundMetadata[code].navMap.get(dStr);
                }
                // Check if we have a value (either from this date or forward-filled)
                if (currentNavs[code] === null) allReady = false;
            });

            // Include date if all funds have values (either actual or forward-filled)
            if (allReady) {
                commonDates.push(dStr);
                codes.forEach(code => alignedNav[code][dStr] = currentNavs[code]);
            }
        });
        finalDates = commonDates.reverse();
    }

    // 3. Finalize metadata for all funds
    codes.forEach(code => {
        const kept = finalDates.length;
        const total = fundMetadata[code].totalDays;
        fundMetadata[code].daysKept = kept;
        fundMetadata[code].daysRemoved = total - kept;
        fundMetadata[code].dataLoss = total > 0 ? ((total - kept) / total * 100).toFixed(1) + '%' : '0%';
    });

    return {
        dates: finalDates,
        codes,
        nav: alignedNav,
        metadata: {
            funds: fundMetadata,
            alignmentStartDate: finalDates.length > 0 ? finalDates[finalDates.length - 1] : 'N/A',
            alignmentEndDate: finalDates.length > 0 ? finalDates[0] : 'N/A',
            totalAlignedDays: finalDates.length,
            latestInceptionDate: globalStart ? globalStart.toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A',
            error: !hasOverlap
                ? `Date Mismatch! Global Start (${globalStart?.toDateString()}) is after Global End (${globalEnd?.toDateString()}). Check console for the specific fund causing this.`
                : null
        }
    };
}

export function calculateReturns(aligned) {
    const codes = aligned.codes;
    const ret = {};
    if (aligned.dates.length < 2) return { dates: [], codes, returns: {} };
    const dates = aligned.dates.slice(0, -1);
    codes.forEach(code => {
        ret[code] = {};
        for (let i = 0; i < dates.length; i++) {
            const today = aligned.dates[i];
            const yesterday = aligned.dates[i + 1];
            const n1 = aligned.nav[code][today];
            const n2 = aligned.nav[code][yesterday];
            if (n1 && n2 && n2 !== 0) ret[code][today] = (n1 - n2) / n2;
        }
    });
    return { dates, codes, returns: ret };
}
