'use client';

import { useState } from 'react';
import { X, CheckCircle, TrendingUp, Minus, Home, DollarSign, BarChart3, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { PriceEvaluation } from '@/lib/openai/types';
import { HomeWithRelations } from '@/types';

interface PriceEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  home: HomeWithRelations;
  evaluation: PriceEvaluation;
}

export default function PriceEvaluationModal({ 
  isOpen, 
  onClose, 
  home, 
  evaluation 
}: PriceEvaluationModalProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  
  if (!isOpen) return null;

  const getClassificationColor = () => {
    switch (evaluation.classification) {
      case 'below_market': return 'text-green-600';
      case 'market_fair': return 'text-blue-600';
      case 'above_market': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getClassificationIcon = () => {
    switch (evaluation.classification) {
      case 'below_market': return <CheckCircle className="w-6 h-6" />;
      case 'market_fair': return <Minus className="w-6 h-6" />;
      case 'above_market': return <TrendingUp className="w-6 h-6" />;
      default: return <BarChart3 className="w-6 h-6" />;
    }
  };

  const getClassificationLabel = () => {
    switch (evaluation.classification) {
      case 'below_market': return 'Below Market';
      case 'market_fair': return 'Market Fair';
      case 'above_market': return 'Above Market';
      default: return 'Insufficient Data';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Price Evaluation Report</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Property Header */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-2">{home.address}</h3>
            <p className="text-gray-600">
              {home.community?.city || 'Indian Trail'}, NC {home.community?.zipCode || '28079'} • {home.community?.name}
            </p>
            <div className="mt-2 flex gap-4 text-sm">
              <span>{home.bedrooms} beds</span>
              <span>{home.bathrooms} baths</span>
              <span>{home.squareFootage.toLocaleString()} sqft</span>
              <span className="font-semibold">${home.price.toLocaleString()}</span>
            </div>
          </div>

          {/* Classification */}
          <div className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 ${getClassificationColor()}`}>
            <div className="flex items-center gap-3">
              {getClassificationIcon()}
              <div>
                <div className="text-lg font-semibold">{getClassificationLabel()}</div>
                <div className="text-sm opacity-90">
                  Confidence: {evaluation.confidence}%
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="flex items-center gap-1.5 text-sm hover:bg-white hover:bg-opacity-50 px-3 py-1.5 rounded-md transition-colors"
            >
              <Info className="w-4 h-4" />
              <span>How is this calculated?</span>
              {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Methodology Explanation (Collapsible) */}
          {showMethodology && (
            <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
              <h4 className="font-semibold mb-3 text-amber-900 flex items-center gap-2">
                <Info className="w-4 h-4" />
                How Our AI Price Evaluation Works
              </h4>
              <div className="space-y-3 text-sm text-amber-800">
                <div>
                  <span className="font-medium">Classification Criteria:</span> Our AI uses ChatGPT to analyze home pricing with these exact thresholds:
                </div>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><span className="font-medium text-green-700">Below Market:</span> Price per sqft is more than 5% below comparable median</li>
                  <li><span className="font-medium text-blue-700">Market Fair:</span> Price per sqft is within ±5% of comparable median</li>
                  <li><span className="font-medium text-orange-700">Above Market:</span> Price per sqft is more than 5% above comparable median</li>
                  <li><span className="font-medium text-gray-700">Insufficient Data:</span> Less than 3 comparable homes found</li>
                </ul>
                
                <div className="mt-4">
                  <span className="font-medium">Comparable Selection:</span> We find similar homes using these filters:
                </div>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Same city/ZIP or nearby Charlotte-Indian Trail area</li>
                  <li>Bedrooms within ±1</li>
                  <li>Square footage within ±15%</li>
                  <li>Preference for sold/pending over active listings</li>
                </ul>

                <div className="mt-4">
                  <span className="font-medium">Price Adjustments:</span> ChatGPT considers these factors:
                </div>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Spec/finish differences: ±$12-20 per sqft</li>
                  <li>New construction premium: +$8-12 per sqft vs resale</li>
                  <li>Garage space: $5K per additional bay</li>
                  <li>Lot size premium: $0.50-$2 per sqft for extra usable lot</li>
                  <li>Primary suite location: $8K-$15K for main floor in 2-story homes</li>
                </ul>

                <div className="mt-4">
                  <span className="font-medium">Confidence Ratings:</span> ChatGPT assigns a 0-100% confidence score based on:
                </div>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Sample size (more comparable homes = higher confidence)</li>
                  <li>Quality of comparable matches (similar features, location, timing)</li>
                  <li>Data completeness and market consistency</li>
                  <li>85%+ = High confidence, 60-80% = Moderate, 30-50% = Low, Under 30% = Very low</li>
                </ul>

                <div className="mt-4">
                  <span className="font-medium">Quality Control:</span> Our system validates ChatGPT&apos;s analysis using mathematical logic to ensure accuracy and corrects any inconsistencies automatically. If corrections are made, confidence is reduced by 20 points.
                </div>
              </div>
            </div>
          )}

          {/* Why This Rating - Clear Explanation */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-semibold mb-3 text-blue-900">Why This Rating?</h4>
            <div className="space-y-3 text-sm text-blue-800">
              {/* Price Comparison */}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Price Analysis:</span> This home costs{' '}
                  <span className="font-semibold">
                    ${evaluation.subject_metrics.price_per_sqft}/sqft
                  </span>{' '}
                  compared to the market median of{' '}
                  <span className="font-semibold">
                    ${evaluation.market_baselines.comp_price_per_sqft.median}/sqft
                  </span>
{(() => {
                    const calculatedGap = evaluation.subject_metrics.price_per_sqft - evaluation.market_baselines.comp_price_per_sqft.median;
                    return calculatedGap > 0 ? (
                      <span className="text-orange-700">
                        {' '}(${Math.abs(calculatedGap).toFixed(0)} above market)
                      </span>
                    ) : (
                      <span className="text-green-700">
                        {' '}(${Math.abs(calculatedGap).toFixed(0)} below market)
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Comparable Homes Count */}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Market Data:</span> This analysis is based on{' '}
                  <span className="font-semibold">
                    {evaluation.market_baselines.filtered_comp_count} similar homes
                  </span>{' '}
                  in the same area with comparable size and features.
                </div>
              </div>

              {/* Price Range Context */}
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Market Range:</span> Similar homes typically sell between{' '}
                  <span className="font-semibold">
                    ${evaluation.market_baselines.comp_price_per_sqft.p25} - ${evaluation.market_baselines.comp_price_per_sqft.p75}/sqft
                  </span>
                  . This home falls{' '}
                  {evaluation.subject_metrics.price_per_sqft < evaluation.market_baselines.comp_price_per_sqft.p25 ? (
                    <span className="text-green-700 font-semibold">below the typical range</span>
                  ) : evaluation.subject_metrics.price_per_sqft > evaluation.market_baselines.comp_price_per_sqft.p75 ? (
                    <span className="text-orange-700 font-semibold">above the typical range</span>
                  ) : (
                    <span className="text-blue-700 font-semibold">within the typical range</span>
                  )}.
                </div>
              </div>

              {/* ChatGPT's Evidence */}
              {evaluation.evidence.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <span className="font-medium">AI Analysis:</span>{' '}
                    {evaluation.evidence.join('. ')}
                  </div>
                </div>
              )}

              {/* Bottom Line */}
              <div className="bg-white rounded-md p-3 border border-blue-200 mt-4">
                <div className="font-semibold text-blue-900 mb-1">Bottom Line:</div>
                <div className="text-blue-800">
                  {evaluation.classification === 'below_market' && (
                    <>This home is priced <span className="font-semibold text-green-700">below market value</span>, making it a potentially good deal compared to similar properties.</>
                  )}
                  {evaluation.classification === 'market_fair' && (
                    <>This home is priced <span className="font-semibold text-blue-700">fairly</span> according to current market conditions for similar properties.</>
                  )}
                  {evaluation.classification === 'above_market' && (
                    <>This home is priced <span className="font-semibold text-orange-700">above market value</span> compared to similar properties. Consider negotiating or waiting for a price adjustment.</>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Home className="w-4 h-4" />
                Subject Property Metrics
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">List Price:</dt>
                  <dd className="font-medium">${evaluation.subject_metrics.list_price.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Effective Price:</dt>
                  <dd className="font-medium">${evaluation.subject_metrics.effective_price.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Price per Sqft:</dt>
                  <dd className="font-medium">${evaluation.subject_metrics.price_per_sqft}</dd>
                </div>
              </dl>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Market Baselines
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Comparable Homes:</dt>
                  <dd className="font-medium">{evaluation.market_baselines.filtered_comp_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Median $/sqft:</dt>
                  <dd className="font-medium">${evaluation.market_baselines.comp_price_per_sqft.median}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Price Range (25-75%):</dt>
                  <dd className="font-medium">
                    ${evaluation.market_baselines.comp_price_per_sqft.p25} - ${evaluation.market_baselines.comp_price_per_sqft.p75}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Suggested Price Range */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Suggested Price Range
            </h4>
            <div className="text-2xl font-bold text-blue-700">
              ${evaluation.suggested_price_range.low.toLocaleString()} - ${evaluation.suggested_price_range.high.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Current gap: {evaluation.price_gap.vs_median_list > 0 ? '+' : ''}
              ${Math.abs(evaluation.price_gap.vs_median_list).toLocaleString()} vs median
            </div>
          </div>

          {/* Key Comparables */}
          {evaluation.key_comparables.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Key Comparable Properties</h4>
              <div className="space-y-2">
                {evaluation.key_comparables.map((comp, idx) => (
                  <div key={idx} className="border rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{comp.address}</div>
                        <div className="text-gray-600">
                          {comp.status} • ${comp.ppsf}/sqft • {comp.distance_miles} miles away
                        </div>
                      </div>
                      {comp.notes && (
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {comp.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluation.assumptions.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <span className="text-amber-600">⚠️</span>
                  Analysis Assumptions
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {evaluation.assumptions.map((item, idx) => (
                    <li key={idx} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="text-blue-600">ℹ️</span>
                Important Notes
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>This analysis is based on current market data and similar properties</li>
                <li>Actual negotiations may vary based on market conditions</li>
                <li>Consider getting a professional appraisal for large investments</li>
                <li>Market conditions can change rapidly in active markets</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}