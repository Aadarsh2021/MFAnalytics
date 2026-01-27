// Robust Matrix Operations Library

// ============================================
// MATRIX UTILITIES
// ============================================

export function matrixMultiply(A, B) {
  // Handle vector × matrix or matrix × vector
  const isAVector = !Array.isArray(A[0])
  const isBVector = !Array.isArray(B[0])
  
  if (isAVector && isBVector) {
    // Dot product
    return A.reduce((sum, a, i) => sum + a * B[i], 0)
  }
  
  if (isAVector) {
    // Vector × Matrix
    const m = B[0].length
    const result = new Array(m).fill(0)
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < A.length; i++) {
        result[j] += A[i] * B[i][j]
      }
    }
    return result
  }
  
  if (isBVector) {
    // Matrix × Vector
    const n = A.length
    const result = new Array(n).fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < B.length; j++) {
        result[i] += A[i][j] * B[j]
      }
    }
    return result
  }
  
  // Matrix × Matrix
  const n = A.length
  const m = B[0].length
  const p = B.length
  const result = Array(n).fill(0).map(() => Array(m).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < p; k++) {
        result[i][j] += A[i][k] * B[k][j]
      }
    }
  }
  
  return result
}

export function transpose(matrix) {
  const isVector = !Array.isArray(matrix[0])
  if (isVector) {
    return matrix.map(x => [x])
  }
  
  const n = matrix.length
  const m = matrix[0].length
  const result = Array(m).fill(0).map(() => Array(n).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      result[j][i] = matrix[i][j]
    }
  }
  
  return result
}

export function matrixAdd(A, B) {
  const isAVector = !Array.isArray(A[0])
  const isBVector = !Array.isArray(B[0])
  
  if (isAVector && isBVector) {
    return A.map((a, i) => a + B[i])
  }
  
  const n = A.length
  const m = A[0].length
  const result = Array(n).fill(0).map(() => Array(m).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      result[i][j] = A[i][j] + B[i][j]
    }
  }
  
  return result
}

export function matrixScale(matrix, scalar) {
  const isVector = !Array.isArray(matrix[0])
  
  if (isVector) {
    return matrix.map(x => x * scalar)
  }
  
  return matrix.map(row => row.map(x => x * scalar))
}

export function matrixIdentity(n) {
  const I = Array(n).fill(0).map(() => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    I[i][i] = 1
  }
  return I
}

export function matrixDiag(vector) {
  const n = vector.length
  const D = Array(n).fill(0).map(() => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    D[i][i] = vector[i]
  }
  return D
}

// ============================================
// MATRIX INVERSION (Gauss-Jordan with Pivoting)
// ============================================

export function matrixInverse(matrix) {
  const n = matrix.length
  
  // Create augmented matrix [A | I]
  const aug = matrix.map((row, i) => [
    ...row,
    ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
  ])
  
  // Forward elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k
      }
    }
    
    // Swap rows
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]]
    
    // Check for singularity
    if (Math.abs(aug[i][i]) < 1e-10) {
      throw new Error('Matrix is singular or nearly singular')
    }
    
    // Scale pivot row
    const pivot = aug[i][i]
    for (let j = 0; j < 2 * n; j++) {
      aug[i][j] /= pivot
    }
    
    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i]
        for (let j = 0; j < 2 * n; j++) {
          aug[k][j] -= factor * aug[i][j]
        }
      }
    }
  }
  
  // Extract inverse from right half
  return aug.map(row => row.slice(n))
}

// ============================================
// CHOLESKY DECOMPOSITION
// ============================================

export function choleskyDecomposition(matrix) {
  const n = matrix.length
  const L = Array(n).fill(0).map(() => Array(n).fill(0))
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0
      
      if (i === j) {
        for (let k = 0; k < j; k++) {
          sum += L[j][k] * L[j][k]
        }
        const val = matrix[j][j] - sum
        if (val < 1e-10) {
          throw new Error('Matrix is not positive definite')
        }
        L[j][j] = Math.sqrt(val)
      } else {
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k]
        }
        L[i][j] = (matrix[i][j] - sum) / L[j][j]
      }
    }
  }
  
  return L
}

// ============================================
// VALIDATION
// ============================================

export function validateMatrix(matrix, options = {}) {
  const { symmetric = false, positiveDef = false } = options
  
  // Check dimensions
  const n = matrix.length
  if (n === 0) throw new Error('Empty matrix')
  
  const m = matrix[0].length
  if (!matrix.every(row => row.length === m)) {
    throw new Error('Inconsistent matrix dimensions')
  }
  
  // Check for NaN/Inf
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (!isFinite(matrix[i][j])) {
        throw new Error(`Non-finite value at [${i}][${j}]`)
      }
    }
  }
  
  // Check symmetry
  if (symmetric && n === m) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
          throw new Error(`Matrix not symmetric at [${i}][${j}]`)
        }
      }
    }
  }
  
  // Check positive definiteness (via Cholesky)
  if (positiveDef) {
    try {
      choleskyDecomposition(matrix)
    } catch (e) {
      throw new Error('Matrix is not positive definite')
    }
  }
  
  return true
}

export function validateWeights(weights, tol = 1e-6) {
  const sum = weights.reduce((a, b) => a + b, 0)
  const allPositive = weights.every(w => w >= -tol)
  const sumCorrect = Math.abs(sum - 1.0) < tol
  
  if (!allPositive) {
    const negWeights = weights.filter(w => w < -tol)
    throw new Error(`Negative weights: ${negWeights.join(', ')}`)
  }
  
  if (!sumCorrect) {
    throw new Error(`Weights sum to ${sum.toFixed(6)}, not 1.0`)
  }
  
  return true
}

// ============================================
// NUMERICAL STABILITY
// ============================================

export function conditionNumber(matrix) {
  // Estimate condition number (simplified)
  // κ(A) = ||A|| ||A^-1||
  
  const n = matrix.length
  let normA = 0
  
  // Frobenius norm
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      normA += matrix[i][j] * matrix[i][j]
    }
  }
  normA = Math.sqrt(normA)
  
  try {
    const invA = matrixInverse(matrix)
    let normInvA = 0
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        normInvA += invA[i][j] * invA[i][j]
      }
    }
    normInvA = Math.sqrt(normInvA)
    
    return normA * normInvA
  } catch (e) {
    return Infinity
  }
}

export function isNumericallyStable(matrix, threshold = 1e10) {
  const cond = conditionNumber(matrix)
  return cond < threshold
}
