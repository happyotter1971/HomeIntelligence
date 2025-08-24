'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { getRecentPriceChanges, findHomeByAttributes } from '@/lib/firestore';
import { PriceChangeWithRelations } from '@/types';
import { TrendingUp, TrendingDown, Calendar, Building2, MapPin, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PriceChangesProps {
  maxItems?: number;
}

export default function PriceChanges({ maxItems = 10 }: PriceChangesProps) {
  const [priceChanges, setPriceChanges] = useState<(PriceChangeWithRelations & { actualHomeId?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedByCompany, setGroupedByCompany] = useState<{[key: string]: (PriceChangeWithRelations & { actualHomeId?: string })[]}>({});

  const fetchPriceChanges = useCallback(async () => {
    try {
      setLoading(true);
      const changes = await getRecentPriceChanges(maxItems * 5); // Fetch more to ensure we have enough unique homes
      
      // First, deduplicate price changes by creating a composite key
      // Some homes might have multiple price changes in the database
      const seenHomes = new Set<string>();
      const uniquePriceChanges: PriceChangeWithRelations[] = [];
      
      for (const change of changes) {
        // Create a composite key based on model name and community
        // This should be unique enough for display purposes
        const displayKey = `${change.modelName}-${change.communityId}`;
        
        if (!seenHomes.has(displayKey)) {
          seenHomes.add(displayKey);
          uniquePriceChanges.push(change);
          
          if (uniquePriceChanges.length >= maxItems) {
            break; // We have enough unique homes
          }
        }
      }
      
      // Now find the actual homes for navigation
      const changesWithHomes = await Promise.all(uniquePriceChanges.map(async (change) => {
        try {
          // Try to find a home that matches the price change attributes
          const home = await findHomeByAttributes(
            change.modelName,
            change.builderId,
            change.communityId,
            change.address
          );
          return { ...change, actualHomeId: home?.id };
        } catch (err) {
          console.error('Error finding home for price change:', err);
          return { ...change, actualHomeId: undefined };
        }
      }));
      
      // Filter out changes without matching homes
      const validChanges = changesWithHomes.filter(c => c.actualHomeId);
      
      console.log(`Price changes: Found ${changes.length} total, ${uniquePriceChanges.length} unique models, ${validChanges.length} with matching homes`);
      setPriceChanges(validChanges);
      
      // Group by company
      const grouped = validChanges.reduce((acc, change) => {
        const companyName = change.builder?.name || 'Unknown Builder';
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(change);
        return acc;
      }, {} as {[key: string]: (PriceChangeWithRelations & { actualHomeId?: string })[]});
      
      setGroupedByCompany(grouped);
    } catch (error) {
      console.error('Error fetching price changes:', error);
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    fetchPriceChanges();
  }, [fetchPriceChanges]);


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
            Recent Price Changes by Company
          </CardTitle>
          <CardDescription>
            Track price movements from Dream Finder Homes, KB Home, and Ryan Homes
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
            Recent Price Changes by Company
          </CardTitle>
          <CardDescription>
            Track price movements from Dream Finder Homes, KB Home, and Ryan Homes
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
            Recent Price Changes by Company
          </div>
          <span className="gradient-primary text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
            {priceChanges.length} change{priceChanges.length !== 1 ? 's' : ''} (90 days)
          </span>
        </CardTitle>
        <CardDescription>
          Track price movements from Dream Finder Homes, KB Home, and Ryan Homes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedByCompany)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([companyName, changes]) => (
            <div key={companyName} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {companyName}
                </h3>
                <span className="text-sm text-muted-foreground bg-gray-100 px-2 py-1 rounded-full">
                  {changes.length} change{changes.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-1 pl-4 border-l-2 border-gray-200">
                {changes.map((change: any) => {
                  const homeId = change.actualHomeId || change.homeId;
                  return (
                  <Link
                    key={change.id}
                    href={`/home/${homeId}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors text-sm cursor-pointer group"
                    title={`Home ID: ${homeId}`}
                  >
                    {/* Left side: Model name and trend icon */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <h4 className="font-semibold text-foreground">{change.modelName}</h4>
                      {change.changeType === 'decrease' ? (
                        <TrendingDown className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-red-600" />
                      )}
                    </div>
                    
                    {/* Middle: Community and timing */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-1 min-w-0 mx-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{change.community?.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>{formatTimeAgo(change.changeDate)}</span>
                      </div>
                      {change.daysSinceLastChange !== undefined && change.daysSinceLastChange > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs whitespace-nowrap">
                          {change.daysSinceLastChange}d
                        </span>
                      )}
                    </div>
                    
                    {/* Right side: Price change details */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(change.oldPrice)}
                      </span>
                      <span className="text-sm">→</span>
                      <span className="font-semibold text-foreground">
                        {formatPrice(change.newPrice)}
                      </span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        change.changeType === 'decrease' 
                          ? 'text-green-700 bg-green-50' 
                          : 'text-red-700 bg-red-50'
                      }`}>
                        {change.changeType === 'decrease' ? '-' : '+'}
                        {formatPrice(Math.abs(change.changeAmount))} ({change.changePercentage > 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%)
                      </span>
                      <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                  );
                })}
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