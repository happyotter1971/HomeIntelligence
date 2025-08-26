'use client';

import { useState } from 'react';
import { CheckCircle, TrendingUp, Minus, Loader2, AlertCircle } from 'lucide-react';
import { PriceEvaluation } from '@/lib/openai/types';

interface PriceEvaluationBadgeProps {
  homeId: string;
  initialEvaluation?: PriceEvaluation;
  evaluatedAt?: Date;
  compact?: boolean;
  onEvaluate?: (evaluation: PriceEvaluation) => void;
}

export default function PriceEvaluationBadge({ 
  homeId, 
  initialEvaluation,
  evaluatedAt,
  compact = false,
  onEvaluate 
}: PriceEvaluationBadgeProps) {
  const [evaluation, setEvaluation] = useState<PriceEvaluation | undefined>(initialEvaluation);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(evaluatedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const evaluatePrice = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/evaluate-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          homeId,
          useEnhanced: true,  // Use the enhanced deterministic pricing system
          forceUpdate: true   // Force fresh evaluation (skip cache)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate price');
      }

      const data = await response.json();
      setEvaluation(data.evaluation);
      setLastUpdated(new Date());
      onEvaluate?.(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate');
      console.error('Price evaluation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Evaluating...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Evaluation Error</span>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <button
        onClick={evaluatePrice}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
      >
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm">Evaluate Price</span>
      </button>
    );
  }

  const getClassificationStyles = () => {
    switch (evaluation.classification) {
      case 'below_market':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          icon: CheckCircle,
          label: 'Below Market'
        };
      case 'market_fair':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          icon: Minus,
          label: 'Market Fair'
        };
      case 'above_market':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          icon: TrendingUp,
          label: 'Above Market'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          icon: AlertCircle,
          label: 'Insufficient Data'
        };
    }
  };

  const styles = getClassificationStyles();
  const Icon = styles.icon;

  if (compact) {
    return (
      <div className="space-y-1">
        <button 
          onClick={() => onEvaluate?.(evaluation)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${styles.bg} ${styles.text} hover:opacity-80 transition-opacity cursor-pointer`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{styles.label}</span>
          {evaluation.confidence > 0 && (
            <span className="text-xs opacity-75">({evaluation.confidence}%)</span>
          )}
        </button>
        {lastUpdated && (
          <div className="text-xs text-gray-500 text-center">
            {formatLastUpdated(lastUpdated)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${styles.bg} ${styles.text}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{styles.label}</span>
        {evaluation.confidence > 0 && (
          <span className="text-sm opacity-75">({evaluation.confidence}% confidence)</span>
        )}
      </div>
      
      {evaluation.price_gap && (
        <div className="text-xs text-gray-600">
          {evaluation.price_gap.vs_median_ppsf > 0 ? '+' : ''}
          ${Math.abs(evaluation.price_gap.vs_median_ppsf).toLocaleString()}/sqft vs median
        </div>
      )}
      
      {lastUpdated && (
        <div className="text-xs text-gray-500">
          Updated {formatLastUpdated(lastUpdated)}
        </div>
      )}
    </div>
  );
}