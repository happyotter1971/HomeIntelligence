'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getHomeById } from '@/lib/firestore';
import { HomeWithRelations, PriceChangeWithRelations } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatSquareFootage, formatPricePerSquareFoot } from '@/lib/utils';
import { ArrowLeft, Home, MapPin, Bed, Bath, Car, Square, Calendar, DollarSign, Zap, TrendingDown, TrendingUp, History } from 'lucide-react';
import Link from 'next/link';

interface HomeDetailPageProps {
  params: {
    id: string;
  };
}

export default function HomeDetailPage({ params }: HomeDetailPageProps) {
  const [home, setHome] = useState<HomeWithRelations | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceChangeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backButtonText, setBackButtonText] = useState('Back');
  const router = useRouter();
  
  useEffect(() => {
    // Set the back button text based on referrer
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      if (referrer.includes('/inventory')) {
        setBackButtonText('Back to Inventory');
      } else {
        setBackButtonText('Back to Home');
      }
    }
  }, []);
  
  const handleBack = () => {
    // Check the referrer to determine where to go back
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      if (referrer.includes('/inventory')) {
        router.push('/inventory');
      } else if (referrer === '' || !referrer.includes(window.location.origin)) {
        // If no referrer or external referrer, go to home
        router.push('/');
      } else {
        router.back();
      }
    } else {
      router.back();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchHome = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching home with ID:', params.id);
      
      const homeData = await getHomeById(params.id);
      console.log('Home data:', {
        id: homeData?.id,
        modelName: homeData?.modelName,
        price: homeData?.price,
        builderId: homeData?.builderId,
        communityId: homeData?.communityId,
        address: homeData?.address
      });
      
      if (homeData) {
        setHome(homeData);
        
        // Fetch price history using API endpoint to avoid Firebase index issues
        try {
          console.log(`=== PRICE HISTORY DEBUG for home ${params.id} ===`);
          
          const response = await fetch(`/api/price-changes/${params.id}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Price changes from API:', data);
            
            // Convert the API response to the expected format
            const priceChanges: PriceChangeWithRelations[] = data.priceChanges.map((pc: any) => ({
              ...pc,
              builder: homeData.builder,
              community: homeData.community
            }));
            
            console.log(`Final price history for display (${priceChanges.length} items):`, priceChanges);
            setPriceHistory(priceChanges);
          } else {
            const errorData = await response.json();
            console.error('API error:', errorData);
            setPriceHistory([]);
          }
        } catch (priceError) {
          console.error('Error fetching price history:', priceError);
          console.error('Price history error details:', {
            homeId: params.id,
            modelName: homeData?.modelName,
            builderId: homeData?.builderId,
            communityId: homeData?.communityId,
            error: priceError
          });
          // Don't fail the whole page if price history fails
          setPriceHistory([]);
        }
      } else {
        setError('Home not found with ID: ' + params.id);
      }
    } catch (error) {
      console.error('Error fetching home:', error);
      setError('Failed to load home details: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !home) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backButtonText}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{home.modelName}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{home.modelName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4" />
                      {home.community?.name} by {home.builder?.name}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{formatPrice(home.price)}</div>
                    {home.estimatedMonthlyPayment && (
                      <div className="text-sm text-gray-500">
                        Est. {formatPrice(home.estimatedMonthlyPayment)}/mo
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-gray-400" />
                    <span>{home.bedrooms} Bedrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-gray-400" />
                    <span>{home.bathrooms} Bathrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Square className="h-5 w-5 text-gray-400" />
                    <span>{formatSquareFootage(home.squareFootage)}</span>
                  </div>
                  {home.garageSpaces > 0 && (
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-gray-400" />
                      <span>{home.garageSpaces} Car Garage</span>
                    </div>
                  )}
                </div>

                {home.address && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                    <p className="text-gray-600">{home.address}</p>
                    {home.homesiteNumber && (
                      <p className="text-sm text-gray-500 mt-1">Homesite: {home.homesiteNumber}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features */}
            {home.features && home.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Features & Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {home.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Price History
                </CardTitle>
                <CardDescription>
                  Track price changes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {priceHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No price changes recorded</p>
                    <p className="text-sm text-gray-400 mt-2">Current price: {formatPrice(home.price)}</p>
                  </div>
                ) : (() => {
                  // Calculate total change from original to current
                  console.log('Rendering price history with', priceHistory.length, 'items');
                  const sortedHistory = [...priceHistory].sort((a, b) => 
                    (a.changeDate?.seconds || 0) - (b.changeDate?.seconds || 0)
                  );
                  const oldestChange = sortedHistory[0];
                  console.log('Oldest change:', oldestChange);
                  const originalPrice = oldestChange?.oldPrice || home.price;
                  const totalChange = home.price - originalPrice;
                  const totalChangePercent = ((totalChange / originalPrice) * 100).toFixed(1);
                  
                  return (
                    <div className="space-y-3">
                      {/* Price Summary */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">Current Price</p>
                            <p className="text-2xl font-bold text-blue-600">{formatPrice(home.price)}</p>
                          </div>
                          {totalChange !== 0 && (
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-600">Total Change</p>
                              <p className={`text-lg font-bold ${totalChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalChange < 0 ? '↓' : '↑'} {formatPrice(Math.abs(totalChange))}
                              </p>
                              <p className={`text-sm ${totalChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalChange < 0 ? '' : '+'}{totalChangePercent}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    
                    {/* Price Change Timeline */}
                    <div className="relative">
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                      
                      {/* Original Price Entry - Use the oldest price change */}
                      {priceHistory.length > 0 && (() => {
                        // Sort to get the oldest price change first
                        const sortedHistory = [...priceHistory].sort((a, b) => 
                          (a.changeDate?.seconds || 0) - (b.changeDate?.seconds || 0)
                        );
                        const oldestChange = sortedHistory[0];
                        
                        return (
                          <div className="relative flex items-start gap-4 pb-6">
                            <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white border-gray-400">
                              <DollarSign className="h-4 w-4 text-gray-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Original Price</p>
                                  <p className="text-xs text-gray-500">
                                    {oldestChange.oldPriceDate ? 
                                      new Date(oldestChange.oldPriceDate.seconds * 1000).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      }) : 'Starting price'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-semibold text-gray-700">
                                    {formatPrice(oldestChange.oldPrice)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Price Changes - Show in chronological order (oldest to newest) */}
                      {[...priceHistory].reverse().map((change, index) => {
                        const changeDate = new Date(change.changeDate.seconds * 1000);
                        const formatDate = (date: Date) => {
                          return date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        };
                        
                        const formatTimeAgo = (date: Date) => {
                          const now = new Date();
                          const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
                          
                          if (diffInHours < 24) {
                            return `${diffInHours}h ago`;
                          } else if (diffInHours < 168) {
                            const diffInDays = Math.floor(diffInHours / 24);
                            return `${diffInDays}d ago`;
                          } else {
                            const diffInWeeks = Math.floor(diffInHours / 168);
                            return `${diffInWeeks}w ago`;
                          }
                        };
                        
                        return (
                          <div key={change.id} className="relative flex items-start gap-4 pb-6">
                            <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${
                              change.changeType === 'decrease' 
                                ? 'border-green-500' 
                                : 'border-red-500'
                            }`}>
                              {change.changeType === 'decrease' ? (
                                <TrendingDown className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatDate(changeDate)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatTimeAgo(changeDate)}
                                    {change.daysSinceLastChange && change.daysSinceLastChange > 0 && (
                                      <span className="ml-2">• After {change.daysSinceLastChange} days</span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 line-through">
                                      {formatPrice(change.oldPrice)}
                                    </span>
                                    <span className="text-sm">→</span>
                                    <span className="font-semibold">
                                      {formatPrice(change.newPrice)}
                                    </span>
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    change.changeType === 'decrease' 
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {change.changeType === 'decrease' ? '↓' : '↑'}
                                    {formatPrice(Math.abs(change.changeAmount))}
                                    ({change.changePercentage > 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      home.status === 'available' ? 'bg-green-100 text-green-800' :
                      home.status === 'quick-move-in' ? 'bg-blue-100 text-blue-800' :
                      home.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {home.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  {home.status === 'quick-move-in' && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm font-medium">Ready for immediate move-in!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Builder Info */}
            <Card>
              <CardHeader>
                <CardTitle>Builder Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{home.builder?.name}</h4>
                    {home.builder?.website && (
                      <a 
                        href={home.builder.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Visit Builder Website →
                      </a>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Community</h4>
                    <p className="text-gray-600">{home.community?.name}</p>
                    <p className="text-sm text-gray-500">{home.community?.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href={`/comparison?homes=${home.id}`}>
                    <Button className="w-full">
                      Add to Comparison
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full">
                    Contact Builder
                  </Button>
                  <Button variant="outline" className="w-full">
                    Schedule Tour
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}