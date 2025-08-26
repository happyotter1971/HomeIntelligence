'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getHomes, getBuilders, getCommunities } from '@/lib/firestore';
import { HomeWithRelations, Builder, Community } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatSquareFootage, formatSquareFootageNumber, formatPricePerSquareFoot } from '@/lib/utils';
import { Search, Filter, ArrowLeft, MapPin, Eye, Clock, Zap, Check, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PriceEvaluationBadge from '@/components/PriceEvaluationBadge';
import PriceEvaluationModal from '@/components/PriceEvaluationModal';
import { PriceEvaluation } from '@/lib/openai/types';
import { getEvaluationsForBuilder } from '@/lib/price-evaluation/storage';

function InventoryContent() {
  const [homes, setHomes] = useState<HomeWithRelations[]>([]);
  const [filteredHomes, setFilteredHomes] = useState<HomeWithRelations[]>([]);
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilder, setSelectedBuilder] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [status, setStatus] = useState('');
  const [compareList, setCompareList] = useState<HomeWithRelations[]>([]);
  const [selectedHomeForEval, setSelectedHomeForEval] = useState<HomeWithRelations | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<PriceEvaluation | null>(null);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evaluations, setEvaluations] = useState<{[homeId: string]: PriceEvaluation}>({});
  const [evaluationsLoaded, setEvaluationsLoaded] = useState(false);
  const [evaluatingHomes, setEvaluatingHomes] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle URL search parameters
  useEffect(() => {
    const bedroomsParam = searchParams.get('bedrooms');
    if (bedroomsParam) {
      setBedrooms(bedroomsParam);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [homesData, buildersData, communitiesData] = await Promise.all([
        getHomes(),
        getBuilders(),
        getCommunities()
      ]);
      
      setHomes(homesData);
      setBuilders(buildersData);
      setCommunities(communitiesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = homes;

    if (searchTerm) {
      filtered = filtered.filter(home => 
        home.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        home.builder?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        home.community?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedBuilder) {
      filtered = filtered.filter(home => home.builderId === selectedBuilder);
    }

    if (selectedCommunity) {
      filtered = filtered.filter(home => home.communityId === selectedCommunity);
    }

    if (minPrice) {
      filtered = filtered.filter(home => home.price >= parseInt(minPrice));
    }

    if (maxPrice) {
      filtered = filtered.filter(home => home.price <= parseInt(maxPrice));
    }

    if (bedrooms) {
      filtered = filtered.filter(home => home.bedrooms === parseInt(bedrooms));
    }

    if (status) {
      filtered = filtered.filter(home => home.status === status);
    }

    setFilteredHomes(filtered);
  }, [homes, searchTerm, selectedBuilder, selectedCommunity, minPrice, maxPrice, bedrooms, status]);

  // All homes are now quick move-in, so this function is simplified
  const quickMoveInHomes = useCallback(() => {
    return filteredHomes; // All homes are quick move-in
  }, [filteredHomes]);

  const groupedHomes = useCallback(() => {
    const groups = filteredHomes.reduce((acc, home) => {
      const builderName = home.builder?.name || 'Unknown Builder';
      if (!acc[builderName]) {
        acc[builderName] = [];
      }
      acc[builderName].push(home);
      return acc;
    }, {} as Record<string, HomeWithRelations[]>);

    // Sort homes within each builder group by price (lowest to highest), then by square footage (lowest to highest)
    Object.keys(groups).forEach(builderName => {
      groups[builderName].sort((a, b) => {
        // Primary sort: price (lowest to highest)
        if (a.price !== b.price) {
          return a.price - b.price;
        }
        // Secondary sort: square footage (lowest to highest)
        return a.squareFootage - b.squareFootage;
      });
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredHomes]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleCompare = (home: HomeWithRelations) => {
    const isAlreadyComparing = compareList.some(h => h.id === home.id);
    
    if (isAlreadyComparing) {
      setCompareList(compareList.filter(h => h.id !== home.id));
    } else if (compareList.length < 3) {
      setCompareList([...compareList, home]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBuilder('');
    setSelectedCommunity('');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms('');
    setStatus('');
  };

  const handleEvaluationComplete = (home: HomeWithRelations, evaluation: PriceEvaluation) => {
    setSelectedHomeForEval(home);
    setCurrentEvaluation(evaluation);
    setShowEvalModal(true);
  };

  const evaluateAllDreamFinderHomes = async (homes: HomeWithRelations[]) => {
    const dreamFinderHomes = homes.filter(home => 
      home.builder?.name.includes('Dream Finders')
    );

    if (dreamFinderHomes.length === 0) return;

    // Mark all homes as evaluating
    setEvaluatingHomes(new Set(dreamFinderHomes.map(h => h.id)));

    let completed = 0;
    let errors = 0;

    for (const home of dreamFinderHomes) {
      try {
        const response = await fetch('/api/evaluate-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ homeId: home.id, forceUpdate: true }),
        });

        if (response.ok) {
          const data = await response.json();
          // Update the evaluations state immediately
          setEvaluations(prev => ({
            ...prev,
            [home.id]: data.evaluation
          }));
          completed++;
        } else {
          console.error(`Failed to evaluate ${home.modelName}`);
          errors++;
        }

        // Remove this home from evaluating set
        setEvaluatingHomes(prev => {
          const newSet = new Set(prev);
          newSet.delete(home.id);
          return newSet;
        });

        // Add delay to avoid rate limiting (3 seconds between calls)
        if (home !== dreamFinderHomes[dreamFinderHomes.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

      } catch (error) {
        console.error(`Error evaluating ${home.modelName}:`, error);
        errors++;
        
        // Remove this home from evaluating set
        setEvaluatingHomes(prev => {
          const newSet = new Set(prev);
          newSet.delete(home.id);
          return newSet;
        });
      }
    }

    console.log(`DreamFinder evaluation complete: ${completed} successful, ${errors} errors`);
  };

  // Load stored evaluations for DreamFinder homes
  useEffect(() => {
    const loadStoredEvaluations = async () => {
      if (evaluationsLoaded) return;
      
      try {
        const response = await fetch('/api/get-stored-evaluations?builder=Dream%20Finders%20Homes');
        const data = await response.json();
        
        if (data.success) {
          setEvaluations(data.evaluations);
          console.log(`Loaded ${data.count} stored price evaluations from API`);
        } else {
          console.error('Failed to load stored evaluations:', data.error);
        }
        
        setEvaluationsLoaded(true);
      } catch (error) {
        console.error('Error loading stored evaluations:', error);
        setEvaluationsLoaded(true); // Still mark as loaded to prevent retries
      }
    };

    loadStoredEvaluations();
  }, [evaluationsLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with clean background */}
      <div className="bg-white border-b-2 border-blue-200 shadow-md">
        <div className="container mx-auto px-6 py-8 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="p-3 bg-white rounded-2xl border-2 border-blue-200 shadow-md">
                <Image 
                  src="/new-logo.svg" 
                  alt="BuilderIntelligence Logo" 
                  width={64} 
                  height={64}
                  className="flex-shrink-0"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  <span className="text-blue-600">Quick Move-In</span>
                  <span className="text-gray-700">: Inventory Browser</span>
                </h1>
                <p className="text-sm text-gray-600 mt-2 font-medium bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                  Browse homes ready for immediate move-in
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button 
                  variant="outline"
                  className="bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-xl transition-all duration-200 shadow-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="container mx-auto px-6 pt-8 pb-12">

        <Card className="mb-6 bg-white border-2 border-blue-200 shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Search Bar & Clear Button */}
              <div className="flex gap-3">
                <Input
                  placeholder="🔍 Search by model name, builder, or community..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 h-12 text-lg border-0 bg-white shadow-sm rounded-lg"
                />
                <Button variant="outline" onClick={clearFilters} className="h-12 px-6 bg-white/70 border-0 shadow-sm hover:bg-white whitespace-nowrap">
                  Clear All Filters
                </Button>
              </div>
              
              {/* Filter Groups */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Builder & Community */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Location</h4>
                  <div className="space-y-2">
                    <Select value={selectedBuilder} onChange={(e) => setSelectedBuilder(e.target.value)} className="bg-white border-0 shadow-sm rounded-md">
                      <option value="">All Builders</option>
                      {builders.map(builder => (
                        <option key={builder.id} value={builder.id}>{builder.name}</option>
                      ))}
                    </Select>
                    <Select value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)} className="bg-white border-0 shadow-sm rounded-md">
                      <option value="">All Communities</option>
                      {communities.map(community => (
                        <option key={community.id} value={community.id}>{community.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                
                {/* Price Range */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Price Range</h4>
                  <div className="space-y-2">
                    <Input
                      placeholder="Min Price"
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="bg-white border-0 shadow-sm rounded-md"
                    />
                    <Input
                      placeholder="Max Price"
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="bg-white border-0 shadow-sm rounded-md"
                    />
                  </div>
                </div>
                
                {/* Home Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Home Details</h4>
                  <div className="space-y-2">
                    <Select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="bg-white border-0 shadow-sm rounded-md">
                      <option value="">Any Bedrooms</option>
                      <option value="3">3 Bedrooms</option>
                      <option value="4">4 Bedrooms</option>
                      <option value="5">5+ Bedrooms</option>
                    </Select>
                    <Select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-white border-0 shadow-sm rounded-md">
                      <option value="">All Status</option>
                      <option value="available">Available</option>
                      <option value="quick-move-in">Quick Move-In</option>
                      <option value="pending">Pending</option>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

{/* Floating Compare Button - only show when 2+ homes selected */}
        {compareList.length >= 2 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Link href={`/comparison?homes=${compareList.map(h => h.id).join(',')}`}>
              <Button size="lg" className="shadow-sm bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg border border-blue-700">
                Compare {compareList.length} Home{compareList.length !== 1 ? 's' : ''} Now
              </Button>
            </Link>
          </div>
        )}

        <div className="mb-4 flex justify-between items-center">
          <div>
            <p className="text-gray-600">
              Showing {filteredHomes.length} of {homes.length} quick move-in ready homes
            </p>
            <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
              <Zap className="h-4 w-4" />
              All homes are available for immediate move-in
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {groupedHomes().map(([builderName, homes]) => (
            <Card key={builderName} className="bg-white border-2 border-blue-200 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {builderName}
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                      {homes.length} home{homes.length !== 1 ? 's' : ''}
                    </span>
                    
                    {/* Evaluate All Button for DreamFinder homes only */}
                    {builderName.includes('Dream Finders') && (
                      <div className="flex items-center gap-2">
                        {evaluatingHomes.size > 0 && homes.some(home => evaluatingHomes.has(home.id)) && (
                          <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                            Evaluating {evaluatingHomes.size} home{evaluatingHomes.size !== 1 ? 's' : ''}...
                          </div>
                        )}
                        <button
                          onClick={() => evaluateAllDreamFinderHomes(homes)}
                          disabled={evaluatingHomes.size > 0}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          <TrendingUp className="w-4 h-4" />
                          {evaluatingHomes.size > 0 ? 'Evaluating...' : 'Evaluate All Homes'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Model</th>
                        <th className="text-left py-3 px-2">Community</th>
                        <th className="text-left py-3 px-2">Price</th>
                        {builderName.includes('Dream Finders') && (
                          <th className="text-left py-3 px-2">Evaluation</th>
                        )}
                        <th className="text-left py-3 px-2">Price/Sq Ft</th>
                        <th className="text-left py-3 px-2">Sq Ft</th>
                        <th className="text-left py-3 px-2">Beds</th>
                        <th className="text-left py-3 px-2">Baths</th>
                        <th className="text-left py-3 px-2">Garage</th>
                        <th className="text-left py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {homes.map((home) => (
                        <tr 
                          key={home.id} 
                          className={`hover:bg-accent/50 transition-colors duration-200 ${compareList.some(h => h.id === home.id) ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={compareList.some(h => h.id === home.id)}
                                onChange={() => handleCompare(home)}
                                disabled={!compareList.some(h => h.id === home.id) && compareList.length >= 3}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                title={compareList.length >= 3 && !compareList.some(h => h.id === home.id) ? "Maximum 3 homes can be compared" : "Select to compare"}
                              />
                              <div>
                                <div className="font-semibold text-foreground">{home.modelName}</div>
                                {home.address && (
                                  <div className="text-sm text-muted-foreground">
                                    {home.address.match(/Lot\s+(\d+)/i) ? (
                                      <>
                                        <span className="font-medium text-foreground">Lot {home.address.match(/Lot\s+(\d+)/i)?.[1]}</span>
                                        <span className="ml-1">{home.address.replace(/Lot\s+\d+\s*,?\s*/i, '')}</span>
                                      </>
                                    ) : home.address.match(/^\d+/) ? (
                                      <>
                                        <span className="font-medium text-foreground">{home.address.match(/^\d+/)?.[0]}</span>
                                        <span className="ml-1">{home.address.replace(/^\d+\s*,?\s*/, '')}</span>
                                      </>
                                    ) : (
                                      home.address
                                    )}
                                  </div>
                                )}
                                {home.homesiteNumber && (
                                  <div className="text-sm text-muted-foreground">Homesite: {home.homesiteNumber}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-muted-foreground">{home.community?.name}</td>
                          <td className="py-4 px-2">
                            <div className="font-bold text-foreground">{formatPrice(home.price)}</div>
                          </td>
                          {builderName.includes('Dream Finders') && (
                            <td className="py-4 px-2">
                              {evaluations[home.id] ? (
                                <button
                                  onClick={() => handleEvaluationComplete(home, evaluations[home.id])}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                    backgroundColor: evaluations[home.id].classification === 'below_market' ? '#dcfce7' : 
                                                   evaluations[home.id].classification === 'market_fair' ? '#dbeafe' : 
                                                   evaluations[home.id].classification === 'above_market' ? '#fed7aa' : '#f3f4f6',
                                    color: evaluations[home.id].classification === 'below_market' ? '#15803d' : 
                                           evaluations[home.id].classification === 'market_fair' ? '#1d4ed8' : 
                                           evaluations[home.id].classification === 'above_market' ? '#c2410c' : '#374151'
                                  }}
                                >
                                  {evaluations[home.id].classification === 'below_market' && <TrendingDown className="w-3.5 h-3.5" />}
                                  {evaluations[home.id].classification === 'market_fair' && <Minus className="w-3.5 h-3.5" />}
                                  {evaluations[home.id].classification === 'above_market' && <TrendingUp className="w-3.5 h-3.5" />}
                                  <span className="text-xs font-medium">
                                    {evaluations[home.id].classification === 'below_market' ? 'Good Deal' :
                                     evaluations[home.id].classification === 'market_fair' ? 'Fair Price' :
                                     evaluations[home.id].classification === 'above_market' ? 'Above Market' : 'No Data'}
                                  </span>
                                </button>
                              ) : evaluatingHomes.has(home.id) ? (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-100">
                                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                  <span className="text-xs text-gray-600">Evaluating...</span>
                                </div>
                              ) : evaluationsLoaded ? (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                  <span className="text-xs">Not evaluated</span>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-100">
                                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                  <span className="text-xs text-gray-600">Loading...</span>
                                </div>
                              )}
                            </td>
                          )}
                          <td className="py-4 px-2 text-muted-foreground">{formatPricePerSquareFoot(home.price, home.squareFootage)}</td>
                          <td className="py-4 px-2 text-muted-foreground">{formatSquareFootageNumber(home.squareFootage)}</td>
                          <td className="py-4 px-2 text-muted-foreground">{home.bedrooms}</td>
                          <td className="py-4 px-2 text-muted-foreground">{home.bathrooms}</td>
                          <td className="py-4 px-2 text-muted-foreground">{home.garageSpaces}</td>
                          <td className="py-4 px-2">
                            <Link href={`/home/${home.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

          {filteredHomes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No homes found matching your criteria</p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Price Evaluation Modal */}
      {selectedHomeForEval && currentEvaluation && (
        <PriceEvaluationModal
          isOpen={showEvalModal}
          onClose={() => {
            setShowEvalModal(false);
            setSelectedHomeForEval(null);
            setCurrentEvaluation(null);
          }}
          home={selectedHomeForEval}
          evaluation={currentEvaluation}
        />
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}