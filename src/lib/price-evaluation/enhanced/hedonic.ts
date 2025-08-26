// Hedonic pricing model with ridge regression and cross-validation

import { RecordClean, HedonicModel, FeatureVector, TrainingData } from './types';

export interface RidgeRegressionResult {
  coefficients: number[];
  intercept: number;
  alpha: number;
  rmse: number;
  features: string[];
}

export function trainHedonic(soldRecords: RecordClean[]): HedonicModel {
  // Filter for sold homes only
  const validSold = soldRecords.filter(r => r.status === 'sold' && r.price > 0 && r.sqft > 0);
  
  if (validSold.length < 10) {
    throw new Error(`Insufficient training data: ${validSold.length} sold homes (need at least 10)`);
  }
  
  // Prepare training data
  const trainingData = prepareTrainingData(validSold);
  
  if (trainingData.features.length === 0) {
    throw new Error('No features generated for training');
  }
  
  // Cross-validation for alpha selection
  const alphaGrid = [0.01, 0.1, 1, 5, 10];
  let bestAlpha = alphaGrid[0];
  let bestCvError = Infinity;
  let bestResult: RidgeRegressionResult | null = null;
  
  for (const alpha of alphaGrid) {
    const cvError = crossValidateRidge(trainingData, alpha, 5);
    console.log(`Ridge CV: alpha=${alpha}, RMSE=${cvError.toFixed(4)}`);
    
    if (cvError < bestCvError) {
      bestCvError = cvError;
      bestAlpha = alpha;
    }
  }
  
  // Train final model with best alpha
  bestResult = trainRidgeRegression(trainingData, bestAlpha);
  
  // Convert to coefficient object
  const coef: Record<string, number> = {};
  bestResult.features.forEach((featureName, i) => {
    coef[featureName] = bestResult.coefficients[i];
  });
  
  console.log(`Hedonic model trained: ${validSold.length} samples, alpha=${bestAlpha}, RMSE=${bestResult.rmse.toFixed(4)}`);
  
  return {
    coef,
    intercept: bestResult.intercept,
    rmseLog: bestResult.rmse,
    alpha: bestAlpha,
    features: bestResult.features
  };
}

export function prepareTrainingData(records: RecordClean[]): TrainingData {
  const features: FeatureVector[] = [];
  const targets: number[] = [];
  
  // Get subdivision counts for safe one-hot encoding
  const subdivisionCounts = getSubdivisionCounts(records);
  const safeSubdivisions = Object.keys(subdivisionCounts)
    .filter(sub => subdivisionCounts[sub] >= 5) // At least 5 samples
    .slice(0, 10); // Top 10 most common
  
  for (const record of records) {
    try {
      const featureVec = extractFeatures(record, safeSubdivisions);
      const target = Math.log(record.price);
      
      if (isFinite(target) && target > 0) {
        features.push(featureVec);
        targets.push(target);
      }
    } catch (error) {
      console.warn('Error extracting features:', error);
    }
  }
  
  return {
    records,
    features,
    targets
  };
}

export function extractFeatures(record: RecordClean, safeSubdivisions?: string[], forceMonth?: number): FeatureVector {
  const logSqft = Math.log(Math.max(record.sqft, 100));
  const logLot = record.lot_sqft ? Math.log(Math.max(record.lot_sqft, 1000)) : 0;
  
  // Size buckets (piecewise)
  const sz0_2k = record.sqft <= 2000 ? 1 : 0;
  const sz2_3k = record.sqft > 2000 && record.sqft <= 3000 ? 1 : 0;
  const sz3kPlus = record.sqft > 3000 ? 1 : 0;
  
  // Primary suite on main floor (assume 20% chance if not specified)
  const primaryMain = record.is_new ? 0.2 : 0; // Conservative estimate
  
  const features: FeatureVector = {
    log_sqft: logSqft,
    beds: record.beds,
    baths: record.baths,
    garage: record.garage,
    is_new: record.is_new ? 1 : 0,
    year: record.year_built,
    month: forceMonth || record.month_index,
    sz_0_2k: sz0_2k,
    sz_2_3k: sz2_3k,
    sz_3k_plus: sz3kPlus,
    primary_main: primaryMain
  };
  
  // Add log lot if available
  if (record.lot_sqft && record.lot_sqft > 0) {
    features.log_lot = logLot;
  }
  
  // Add safe subdivision dummies
  if (safeSubdivisions) {
    safeSubdivisions.forEach(sub => {
      const key = `sub_${sub.replace(/[^a-z0-9]/g, '_')}` as keyof FeatureVector;
      (features as any)[key] = record.subdivision === sub ? 1 : 0;
    });
  }
  
  return features;
}

function getSubdivisionCounts(records: RecordClean[]): Record<string, number> {
  const counts: Record<string, number> = {};
  records.forEach(r => {
    if (r.subdivision) {
      counts[r.subdivision] = (counts[r.subdivision] || 0) + 1;
    }
  });
  return counts;
}

function crossValidateRidge(data: TrainingData, alpha: number, kFolds: number = 5): number {
  const n = data.features.length;
  const foldSize = Math.floor(n / kFolds);
  let totalError = 0;
  
  for (let fold = 0; fold < kFolds; fold++) {
    const start = fold * foldSize;
    const end = fold === kFolds - 1 ? n : start + foldSize;
    
    // Split data
    const trainFeatures = [
      ...data.features.slice(0, start),
      ...data.features.slice(end)
    ];
    const trainTargets = [
      ...data.targets.slice(0, start),
      ...data.targets.slice(end)
    ];
    const testFeatures = data.features.slice(start, end);
    const testTargets = data.targets.slice(start, end);
    
    // Train on fold
    const foldData = { records: [], features: trainFeatures, targets: trainTargets };
    const model = trainRidgeRegression(foldData, alpha);
    
    // Test on fold
    let foldError = 0;
    for (let i = 0; i < testFeatures.length; i++) {
      const predicted = predictWithModel(testFeatures[i], model);
      const actual = testTargets[i];
      foldError += Math.pow(predicted - actual, 2);
    }
    
    totalError += foldError / testFeatures.length;
  }
  
  return Math.sqrt(totalError / kFolds);
}

function trainRidgeRegression(data: TrainingData, alpha: number): RidgeRegressionResult {
  if (data.features.length === 0) {
    throw new Error('No training data provided');
  }
  
  // Convert features to matrix form
  const featureNames = Object.keys(data.features[0]);
  const X: number[][] = data.features.map(f => 
    featureNames.map(name => (f as any)[name] || 0)
  );
  const y = data.targets;
  
  // Add intercept column
  X.forEach(row => row.unshift(1));
  const augmentedFeatureNames = ['intercept', ...featureNames];
  
  // Ridge regression: (X^T X + αI)^(-1) X^T y
  const XtX = matrixMultiply(transpose(X), X);
  
  // Add ridge penalty (skip intercept)
  for (let i = 1; i < XtX.length; i++) {
    XtX[i][i] += alpha;
  }
  
  const XtY = matrixVectorMultiply(transpose(X), y);
  const coefficients = solveLinearSystem(XtX, XtY);
  
  if (!coefficients || coefficients.some(c => !isFinite(c))) {
    throw new Error('Ridge regression failed - matrix inversion problem');
  }
  
  // Calculate RMSE on training data
  let totalError = 0;
  for (let i = 0; i < X.length; i++) {
    const predicted = dotProduct(coefficients, X[i]);
    const actual = y[i];
    totalError += Math.pow(predicted - actual, 2);
  }
  const rmse = Math.sqrt(totalError / X.length);
  
  return {
    coefficients: coefficients.slice(1), // Remove intercept
    intercept: coefficients[0],
    alpha,
    rmse,
    features: featureNames
  };
}

function predictWithModel(features: FeatureVector, model: RidgeRegressionResult): number {
  let prediction = model.intercept;
  
  model.features.forEach((featureName, i) => {
    const value = (features as any)[featureName] || 0;
    prediction += model.coefficients[i] * value;
  });
  
  return prediction;
}

export function predictPriceLog(features: FeatureVector, model: HedonicModel): number {
  let prediction = model.intercept;
  
  model.features.forEach(featureName => {
    const value = (features as any)[featureName] || 0;
    const coeff = model.coef[featureName] || 0;
    prediction += coeff * value;
  });
  
  return prediction;
}

// Matrix operations (simplified implementations)
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < A[i].length; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

function matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => dotProduct(row, vector));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  // Gaussian elimination with partial pivoting
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // Check for singular matrix
    if (Math.abs(augmented[i][i]) < 1e-10) {
      return null;
    }
    
    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  // Back substitution
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += augmented[i][j] * x[j];
    }
    x[i] = (augmented[i][n] - sum) / augmented[i][i];
  }
  
  return x;
}