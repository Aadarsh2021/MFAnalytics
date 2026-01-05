// Optimization algorithms

export function calcCovariance(returns) {
    const n = returns.codes.length
    const cov = []

    for (let i = 0; i < n; i++) {
        cov[i] = []
        for (let j = 0; j < n; j++) {
            const c1 = returns.codes[i]
            const c2 = returns.codes[j]
            let sum = 0, count = 0, m1 = 0, m2 = 0

            returns.dates.forEach(d => {
                if (returns.returns[c1][d] !== undefined && returns.returns[c2][d] !== undefined) {
                    m1 += returns.returns[c1][d]
                    m2 += returns.returns[c2][d]
                    count++
                }
            })
            m1 /= count
            m2 /= count

            returns.dates.forEach(d => {
                if (returns.returns[c1][d] !== undefined && returns.returns[c2][d] !== undefined) {
                    sum += (returns.returns[c1][d] - m1) * (returns.returns[c2][d] - m2)
                }
            })

            cov[i][j] = sum / (count - 1)
        }
    }

    return cov
}

function calcVariance(w, cov) {
    let var_ = 0
    for (let i = 0; i < w.length; i++) {
        for (let j = 0; j < w.length; j++) {
            var_ += w[i] * cov[i][j] * w[j]
        }
    }
    return var_
}

function projectSimplex(w) {
    const n = w.length
    const sorted = w.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
    let cumSum = 0, rho = 0

    for (let i = 0; i < n; i++) {
        cumSum += sorted[i].v
        const theta = (cumSum - 1) / (i + 1)
        if (i === n - 1 || sorted[i].v - theta > sorted[i + 1].v - theta) {
            rho = i
            break
        }
    }

    cumSum = 0
    for (let i = 0; i <= rho; i++) cumSum += sorted[i].v
    const theta = (cumSum - 1) / (rho + 1)

    const proj = new Array(n)
    for (let i = 0; i < n; i++) {
        proj[sorted[i].i] = Math.max(0, sorted[i].v - theta)
    }

    return proj
}

function invertMatrix(m) {
    const n = m.length
    const aug = m.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)])

    for (let i = 0; i < n; i++) {
        let maxRow = i
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k
        }
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]]

        const div = aug[i][i]
        for (let j = 0; j < 2 * n; j++) aug[i][j] /= div

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = aug[k][i]
                for (let j = 0; j < 2 * n; j++) {
                    aug[k][j] -= factor * aug[i][j]
                }
            }
        }
    }

    return aug.map(row => row.slice(n))
}

export function calculateAllMVP(returns) {
    const n = returns.codes.length
    const cov = calcCovariance(returns)

    const sqp = optimizeSQP(cov, n)
    const convex = optimizeConvex(cov, n)
    const critical = optimizeCritical(cov, n)

    return { sqp, convex, critical }
}

function optimizeSQP(cov, n) {
    let w = new Array(n).fill(1 / n)
    let bestW = [...w]
    let bestVar = calcVariance(w, cov)

    for (let iter = 0; iter < 3000; iter++) {
        let grad = new Array(n).fill(0)
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                grad[i] += 2 * cov[i][j] * w[j]
            }
        }

        const lr = 0.02 / Math.sqrt(iter + 1)
        let newW = new Array(n)
        for (let i = 0; i < n; i++) {
            newW[i] = w[i] - lr * grad[i]
        }

        newW = projectSimplex(newW)

        const newVar = calcVariance(newW, cov)
        if (newVar < bestVar) {
            bestVar = newVar
            bestW = [...newW]
        }

        const change = w.reduce((acc, wi, i) => acc + Math.abs(wi - newW[i]), 0)
        w = [...newW]

        if (change < 1e-9 && iter > 100) break
    }

    w = [...bestW]
    w = w.map(wi => wi < 0.001 ? 0 : wi)
    const sum = w.reduce((a, b) => a + b, 0)
    w = w.map(wi => wi / sum)

    return { weights: w, vol: Math.sqrt(calcVariance(w, cov) * 252) }
}

function optimizeConvex(cov, n) {
    let w = new Array(n).fill(1 / n)
    let mu = 1.0
    let bestW = [...w]
    let bestVar = calcVariance(w, cov)

    for (let outer = 0; outer < 10; outer++) {
        for (let iter = 0; iter < 500; iter++) {
            let grad = new Array(n).fill(0)

            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    grad[i] += 2 * cov[i][j] * w[j]
                }
                grad[i] -= mu / Math.max(w[i], 1e-8)
            }

            const avgGrad = grad.reduce((a, b) => a + b, 0) / n
            grad = grad.map(g => g - avgGrad)

            const lr = 0.01 / Math.sqrt(iter + 1)
            let newW = w.map((wi, i) => wi - lr * grad[i])

            newW = newW.map(wi => Math.max(1e-8, wi))
            const sum = newW.reduce((a, b) => a + b, 0)
            newW = newW.map(wi => wi / sum)

            const newVar = calcVariance(newW, cov)
            if (newVar < bestVar) {
                bestVar = newVar
                bestW = [...newW]
            }

            const change = w.reduce((acc, wi, i) => acc + Math.abs(wi - newW[i]), 0)
            w = [...newW]

            if (change < 1e-9) break
        }

        mu *= 0.5
    }

    w = [...bestW]
    w = w.map(wi => wi < 0.001 ? 0 : wi)
    const sum = w.reduce((a, b) => a + b, 0)
    w = w.map(wi => wi / sum)

    return { weights: w, vol: Math.sqrt(calcVariance(w, cov) * 252) }
}

function optimizeCritical(cov, n) {
    try {
        const invCov = invertMatrix(cov)
        let w = new Array(n).fill(0)

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                w[i] += invCov[i][j]
            }
        }

        let activeSet = new Array(n).fill(true)
        let maxIter = n

        for (let iter = 0; iter < maxIter; iter++) {
            const hasNegative = w.some((wi, i) => activeSet[i] && wi < 0)
            if (!hasNegative) break

            let minIdx = -1
            let minVal = 0
            for (let i = 0; i < n; i++) {
                if (activeSet[i] && w[i] < minVal) {
                    minVal = w[i]
                    minIdx = i
                }
            }

            if (minIdx >= 0) {
                activeSet[minIdx] = false
                w[minIdx] = 0

                const activeIndices = []
                for (let i = 0; i < n; i++) {
                    if (activeSet[i]) activeIndices.push(i)
                }

                if (activeIndices.length > 0) {
                    const m = activeIndices.length
                    const covReduced = []
                    for (let i = 0; i < m; i++) {
                        covReduced[i] = []
                        for (let j = 0; j < m; j++) {
                            covReduced[i][j] = cov[activeIndices[i]][activeIndices[j]]
                        }
                    }

                    const invCovRed = invertMatrix(covReduced)
                    const wReduced = new Array(m).fill(0)
                    for (let i = 0; i < m; i++) {
                        for (let j = 0; j < m; j++) {
                            wReduced[i] += invCovRed[i][j]
                        }
                    }

                    for (let i = 0; i < m; i++) {
                        w[activeIndices[i]] = wReduced[i]
                    }
                }
            }
        }

        w = w.map(wi => Math.max(0, wi))
        const sum = w.reduce((a, b) => a + b, 0)
        if (sum > 0) {
            w = w.map(wi => wi / sum)
        } else {
            w = new Array(n).fill(1 / n)
        }

        w = w.map(wi => wi < 0.001 ? 0 : wi)
        const finalSum = w.reduce((a, b) => a + b, 0)
        w = w.map(wi => wi / finalSum)

        return { weights: w, vol: Math.sqrt(calcVariance(w, cov) * 252) }
    } catch (e) {
        const w = new Array(n).fill(1 / n)
        return { weights: w, vol: Math.sqrt(calcVariance(w, cov) * 252) }
    }
}

export function calculateBlackLitterman(returns, views) {
    const cov = calcCovariance(returns)
    const n = returns.codes.length

    const means = new Array(n).fill(0)
    for (let i = 0; i < n; i++) {
        const code = returns.codes[i]
        let sum = 0, count = 0
        returns.dates.forEach(d => {
            if (returns.returns[code][d] !== undefined) {
                sum += returns.returns[code][d]
                count++
            }
        })
        means[i] = sum / count
    }

    let posteriorReturns = [...means]

    if (views.length > 0) {
        views.forEach(view => {
            posteriorReturns[view.assetIdx] = view.return / 252
        })
    }

    const invCov = invertMatrix(cov)
    let w = new Array(n).fill(0)

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            w[i] += invCov[i][j] * posteriorReturns[j]
        }
    }

    w = w.map(wi => Math.max(0, wi))
    const sum = w.reduce((a, b) => a + b, 0)
    if (sum > 0) {
        w = w.map(wi => wi / sum)
    } else {
        w = new Array(n).fill(1 / n)
    }

    const expectedReturn = w.reduce((acc, wi, i) => acc + wi * means[i], 0) * 252
    const vol = Math.sqrt(calcVariance(w, cov) * 252)

    return { weights: w, expectedReturn, vol }
}
