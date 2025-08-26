'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { getRecentPriceChanges, findHomeByAttributes, getHomeById } from '@/lib/firestore';
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
      
      // Now find the actual homes for navigation and get full address data
      const changesWithHomes = await Promise.all(uniquePriceChanges.map(async (change) => {
        try {
          // First check if the price change already has a homeId
          if (change.homeId) {
            console.log(`Using homeId from price change: ${change.homeId} for ${change.modelName}`);
            
            // Get the current home to get full address if price change address is incomplete
            const currentHome = await getHomeById(change.homeId);
            if (currentHome) {
              console.log(`Price verification for ${change.modelName}:`, {
                priceChangeNewPrice: change.newPrice,
                currentHomePrice: currentHome.price,
                pricesMatch: currentHome.price === change.newPrice
              });
              
              if (currentHome.price !== change.newPrice) {
                console.warn(`Price mismatch! Home ${change.homeId} has price ${currentHome.price} but price change shows ${change.newPrice}`);
              }
              
              // Use the home's address to get the actual street address with house numbers
              const enhancedChange = {
                ...change,
                actualHomeId: change.homeId,
                // Always use home address to get proper street numbers, not lot numbers
                address: currentHome.address || change.address
              };
              
              return enhancedChange;
            }
            
            return { ...change, actualHomeId: change.homeId };
          }
          
          // If no homeId, try to find a home that matches the price change attributes
          console.log(`No homeId in price change, searching for home: ${change.modelName}`);
          const home = await findHomeByAttributes(
            change.modelName,
            change.builderId,
            change.communityId,
            change.address
          );
          
          if (home) {
            return { 
              ...change, 
              actualHomeId: home.id,
              // Use the found home's address to get street numbers
              address: home.address || change.address
            };
          }
          
          return { ...change, actualHomeId: undefined };
        } catch (err) {
          console.error('Error finding home for price change:', err);
          return { ...change, actualHomeId: undefined };
        }
      }));
      
      // Filter out changes without matching homes AND without proper addresses
      const validChanges = changesWithHomes.filter(c => 
        c.actualHomeId && 
        c.address && 
        c.address.trim() !== '' &&
        !c.address.includes('Address Not Available')
      );
      
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
      <Card className="bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <TrendingDown className="h-5 w-5 text-blue-500" />
            Recent Price Changes by Builder
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            Track price movements from Dream Finder Homes, KB Home, and Ryan Homes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b">
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-100 rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (priceChanges.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <TrendingDown className="h-5 w-5 text-blue-500" />
            Recent Price Changes by Builder
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
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
    <Card className="bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-500" />
            <span className="text-lg font-semibold text-gray-900">Recent Price Changes by Builder</span>
          </div>
          <Link href="/inventory" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
            {priceChanges.length} changes (90 days)
          </Link>
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 mt-1">
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
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  {companyName}
                </h3>
                <span className="text-xs text-gray-500">
                  {changes.length} change{changes.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-2">
                {changes.map((change: any) => {
                  const homeId = change.actualHomeId || change.homeId;
                  return (
                  <Link
                    key={change.id}
                    href={`/home/${homeId}`}
                    className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm cursor-pointer group"
                    title={`Home ID: ${homeId}`}
                  >
                    {/* Left side: Address with trend icon */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {change.changeType === 'decrease' ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      )}
                      <div className="flex flex-col">
                        {change.address ? (
                          <h4 className="font-medium text-gray-900">
                            {change.address}
                          </h4>
                        ) : (
                          <h4 className="font-medium text-gray-400">
                            Address Not Available
                          </h4>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{change.community?.name}</span>
                          <Calendar className="h-3 w-3 ml-2" />
                          <span>{formatTimeAgo(change.changeDate)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side: Price change details */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(change.oldPrice)}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(change.newPrice)}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        change.changeType === 'decrease' 
                          ? 'text-green-700 bg-green-100' 
                          : 'text-red-700 bg-red-100'
                      }`}>
                        {change.changeType === 'decrease' ? '↓' : '↑'}
                        {formatPrice(Math.abs(change.changeAmount))} ({Math.abs(change.changePercentage).toFixed(1)}%)
                      </span>
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