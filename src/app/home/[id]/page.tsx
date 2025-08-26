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
import { ArrowLeft, Home, MapPin, Bed, Bath, Car, Square, Calendar, DollarSign, Zap, TrendingDown, TrendingUp, History, CheckCircle, Minus, AlertCircle, Target, Users, BarChart3 } from 'lucide-react';
import { PriceEvaluation } from '@/lib/openai/types';
import { getStoredEvaluation } from '@/lib/price-evaluation/storage';
import PriceEvaluationBadge from '@/components/PriceEvaluationBadge';
import Link from 'next/link';

interface HomeDetailPageProps {
  params: {
    id: string;
  };
}

export default function HomeDetailPage({ params }: HomeDetailPageProps) {
  const [home, setHome] = useState<HomeWithRelations | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceChangeWithRelations[]>([]);
  const [evaluation, setEvaluation] = useState<PriceEvaluation | null>(null);
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
        
        // Load price evaluation if it's a Dream Finders home
        if (homeData.builder?.name.includes('Dream Finders')) {
          try {
            const storedEvaluation = await getStoredEvaluation(params.id);
            if (storedEvaluation) {
              setEvaluation(storedEvaluation.evaluation);
            }
          } catch (evalError) {
            console.error('Error loading price evaluation:', evalError);
          }
        }
        
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

            {/* Price Evaluation */}
            {home.builder?.name.includes('Dream Finders') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Price Evaluation
                    </div>
                    {!evaluation && (
                      <PriceEvaluationBadge
                        homeId={home.id}
                        onEvaluate={(newEvaluation) => setEvaluation(newEvaluation)}
                      />
                    )}
                  </CardTitle>
                  <CardDescription>
                    AI-powered analysis of this home's pricing vs. market comparables
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {evaluation ? (
                    <div className="space-y-6">
                      {/* Overall Assessment */}
                      <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          {evaluation.classification === 'below_market' && (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                          )}
                          {evaluation.classification === 'market_fair' && (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                              <Minus className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                          {evaluation.classification === 'above_market' && (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                              <TrendingUp className="h-6 w-6 text-orange-600" />
                            </div>
                          )}
                          {evaluation.classification === 'insufficient_data' && (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                              <AlertCircle className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {evaluation.classification === 'below_market' && 'Good Deal'}
                            {evaluation.classification === 'market_fair' && 'Fair Price'}
                            {evaluation.classification === 'above_market' && 'Above Market'}
                            {evaluation.classification === 'insufficient_data' && 'Insufficient Data'}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            Confidence: {evaluation.confidence}% • Based on {evaluation.market_baselines.filtered_comp_count} comparable homes
                          </p>
                          {evaluation.evidence && evaluation.evidence.length > 0 && (
                            <ul className="text-sm text-gray-700 space-y-1">
                              {evaluation.evidence.map((item, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Price Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">This Home</h4>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatPrice(evaluation.subject_metrics.list_price)}
                          </div>
                          <div className="text-sm text-gray-500">
                            ${evaluation.subject_metrics.price_per_sqft}/sqft
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Market Median</h4>
                          <div className="text-2xl font-bold text-blue-600">
                            {formatPrice(evaluation.market_baselines.comp_list_price.median)}
                          </div>
                          <div className="text-sm text-gray-500">
                            ${evaluation.market_baselines.comp_price_per_sqft.median}/sqft
                          </div>
                        </div>
                        
                        <div className={`p-4 rounded-lg ${
                          evaluation.price_gap.vs_median_list < 0 ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <h4 className="font-medium text-gray-900 mb-2">Price Gap</h4>
                          <div className={`text-2xl font-bold ${
                            evaluation.price_gap.vs_median_list < 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {evaluation.price_gap.vs_median_list < 0 ? '-' : '+'}
                            {formatPrice(Math.abs(evaluation.price_gap.vs_median_list))}
                          </div>
                          <div className={`text-sm ${
                            evaluation.price_gap.vs_median_ppsf < 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {evaluation.price_gap.vs_median_ppsf < 0 ? '-' : '+'}
                            ${Math.abs(evaluation.price_gap.vs_median_ppsf)}/sqft
                          </div>
                        </div>
                      </div>

                      {/* Suggested Price Range */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Suggested Price Range
                        </h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-blue-600">
                            {formatPrice(evaluation.suggested_price_range.low)} - {formatPrice(evaluation.suggested_price_range.high)}
                          </span>
                          <span className="text-gray-600">
                            Based on comparable homes in the area
                          </span>
                        </div>
                      </div>

                      {/* Key Comparables */}
                      {evaluation.key_comparables && evaluation.key_comparables.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Key Comparable Homes
                          </h4>
                          <div className="space-y-3">
                            {evaluation.key_comparables.map((comp, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{comp.address}</div>
                                  <div className="text-sm text-gray-500">
                                    {comp.distance_miles.toFixed(1)} miles • {comp.status}
                                  </div>
                                  {comp.notes && (
                                    <div className="text-xs text-gray-600 mt-1">{comp.notes}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    ${comp.ppsf}/sqft
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assumptions */}
                      {evaluation.assumptions && evaluation.assumptions.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h4 className="font-medium text-gray-900 mb-2">Analysis Assumptions</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {evaluation.assumptions.map((assumption, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-yellow-600 mt-1">•</span>
                                <span>{assumption}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Price Evaluation Available</h3>
                      <p className="text-gray-600 mb-4">Click "Evaluate Price" to get an AI-powered market analysis</p>
                    </div>
                  )}
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
                  // Get original price from the oldest price change
                  const sortedHistory = [...priceHistory].sort((a, b) => 
                    (a.changeDate?.seconds || 0) - (b.changeDate?.seconds || 0)
                  );
                  const oldestChange = sortedHistory[0];
                  const originalPrice = oldestChange?.oldPrice || home.price;
                  const currentPrice = home.price;
                  
                  // Calculate total change from original to current
                  const totalChange = currentPrice - originalPrice;
                  const totalChangePercent = originalPrice > 0 ? ((totalChange / originalPrice) * 100).toFixed(1) : '0';
                  
                  return (
                    <div className="space-y-3">
                      {/* Current Price Summary */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">Current Price</p>
                            <p className="text-2xl font-bold text-blue-600">{formatPrice(currentPrice)}</p>
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
                    
                      {/* Simple Timeline: Original → Current */}
                      <div className="relative">
                        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200"></div>
                        
                        {/* Original Price */}
                        <div className="relative flex items-start gap-4 pb-6">
                          <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white border-gray-400">
                            <DollarSign className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Original Price</p>
                                <p className="text-xs text-gray-500">
                                  {oldestChange?.oldPriceDate ? 
                                    new Date(oldestChange.oldPriceDate.seconds * 1000).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    }) : 'Starting price'}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-semibold text-gray-700">
                                  {formatPrice(originalPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Current Price (only show if different from original) */}
                        {totalChange !== 0 && (
                          <div className="relative flex items-start gap-4">
                            <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${
                              totalChange < 0 ? 'border-green-500' : 'border-red-500'
                            }`}>
                              {totalChange < 0 ? (
                                <TrendingDown className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Current Price</p>
                                  <p className="text-xs text-gray-500">
                                    As of {new Date().toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric', 
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 line-through">
                                      {formatPrice(originalPrice)}
                                    </span>
                                    <span className="text-sm">→</span>
                                    <span className="text-lg font-semibold">
                                      {formatPrice(currentPrice)}
                                    </span>
                                  </div>
                                  <span className={`text-xs font-medium ${
                                    totalChange < 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {totalChange < 0 ? '↓' : '↑'}
                                    {formatPrice(Math.abs(totalChange))}
                                    ({totalChange < 0 ? '' : '+'}{totalChangePercent}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
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