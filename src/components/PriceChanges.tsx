'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { getRecentPriceChanges } from '@/lib/firestore';
import { PriceChangeWithRelations } from '@/types';
import { TrendingUp, TrendingDown, Calendar, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

interface PriceChangesProps {
  maxItems?: number;
}

export default function PriceChanges({ maxItems = 10 }: PriceChangesProps) {
  const [priceChanges, setPriceChanges] = useState<PriceChangeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPriceChanges();
  }, []);

  const fetchPriceChanges = async () => {
    try {
      setLoading(true);
      const changes = await getRecentPriceChanges(maxItems);
      setPriceChanges(changes);
    } catch (error) {
      console.error('Error fetching price changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (timestamp: any) => {
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading) {
    return (
      <Card className="glass-effect border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Recent Competitor Price Changes
          </CardTitle>
          <CardDescription>
            Track price movements from KB Home and Ryan Homes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (priceChanges.length === 0) {
    return (
      <Card className="glass-effect border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Recent Competitor Price Changes
          </CardTitle>
          <CardDescription>
            Track price movements from KB Home and Ryan Homes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No price changes detected in the last 90 days</p>
            <p className="text-sm text-gray-400 mt-2">Check back after the next data refresh</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Recent Competitor Price Changes
          </div>
          <span className="gradient-primary text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
            {priceChanges.length} change{priceChanges.length !== 1 ? 's' : ''} (90 days)
          </span>
        </CardTitle>
        <CardDescription>
          Track price movements from KB Home and Ryan Homes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {priceChanges.map((change) => (
            <div
              key={change.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground">{change.modelName}</h4>
                  {change.changeType === 'decrease' ? (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {change.builder?.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {change.community?.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatTimeAgo(change.changeDate)}
                  </div>
                  {change.daysSinceLastChange !== undefined && change.daysSinceLastChange > 0 && (
                    <div className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                      {change.daysSinceLastChange}d at old price
                    </div>
                  )}
                </div>
                
                {change.address && (
                  <p className="text-xs text-muted-foreground mt-1">{change.address}</p>
                )}
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-sm text-muted-foreground">
                    <span className="line-through">{formatPrice(change.oldPrice)}</span>
                    {change.oldPriceDate && (
                      <div className="text-xs">since {formatDate(change.oldPriceDate)}</div>
                    )}
                  </div>
                  <span className="text-lg">→</span>
                  <div className="font-bold text-foreground">
                    <span>{formatPrice(change.newPrice)}</span>
                    <div className="text-xs font-normal text-muted-foreground">
                      changed {formatDate(change.changeDate)}
                    </div>
                  </div>
                </div>
                
                <div className={`text-sm font-medium ${
                  change.changeType === 'decrease' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {change.changeType === 'decrease' ? '-' : '+'}
                  {formatPrice(Math.abs(change.changeAmount))}
                  <span className="text-xs ml-1">
                    ({change.changePercentage > 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {priceChanges.length >= maxItems && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={fetchPriceChanges}>
              View More Changes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}