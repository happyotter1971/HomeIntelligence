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
import { Search, Filter, ArrowLeft, MapPin, Eye, Clock, Zap, Check, Building2, TrendingUp, CheckCircle, Minus, Home, Bath, Bed, Car } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import PriceEvaluationBadge from '@/components/PriceEvaluationBadge';
import PriceEvaluationModal from '@/components/PriceEvaluationModal';
import { PriceEvaluation } from '@/lib/openai/types';
import { getEvaluationsForBuilder, getAllStoredEvaluations, StoredEvaluation } from '@/lib/price-evaluation/storage';

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

  const groupedHomes = useCallback(() => {
    const groups = filteredHomes.reduce((acc, home) => {
      const builderName = home.builder?.name || 'Unknown Builder';
      if (!acc[builderName]) {
        acc[builderName] = [];
      }
      acc[builderName].push(home);
      return acc;
    }, {} as Record<string, HomeWithRelations[]>);

    Object.keys(groups).forEach(builderName => {
      groups[builderName].sort((a, b) => {
        if (a.price !== b.price) {
          return a.price - b.price;
        }
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

  const evaluateAllHomes = async () => {
    // Get all quick-move-in homes from all builders
    const quickMoveInHomes = filteredHomes.filter(home => 
      home.status === 'quick-move-in'
    );

    if (quickMoveInHomes.length === 0) return;

    setEvaluatingHomes(new Set(quickMoveInHomes.map(h => h.id)));

    let completed = 0;
    let errors = 0;

    for (const home of quickMoveInHomes) {
      try {
        const response = await fetch('/api/evaluate-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ homeId: home.id })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.evaluation) {
            setEvaluations(prev => ({
              ...prev,
              [home.id]: result.evaluation
            }));
            completed++;
          } else {
            console.log(`Skipping ${home.modelName} - ${result.message || 'No evaluation returned'}`);
          }
        } else {
          errors++;
          console.error(`Failed to evaluate home ${home.id}`);
        }
      } catch (error) {
        errors++;
        console.error(`Error evaluating home ${home.id}:`, error);
      }

      setEvaluatingHomes(prev => {
        const newSet = new Set(prev);
        newSet.delete(home.id);
        return newSet;
      });
    }

    console.log(`Evaluation complete: ${completed} successful, ${errors} errors`);
  };

  const loadStoredEvaluations = useCallback(async () => {
    if (evaluationsLoaded) return;

    if (homes.length === 0) {
      setEvaluationsLoaded(true);
      return;
    }

    try {
      // Get all stored evaluations at once
      const allStoredEvaluations = await getAllStoredEvaluations();
      
      const evaluationMap: {[homeId: string]: PriceEvaluation} = {};
      
      // Match evaluations by homeId first, then by address and model name
      homes.forEach(home => {
        // Try exact homeId match first
        if (allStoredEvaluations[home.id]) {
          evaluationMap[home.id] = allStoredEvaluations[home.id].evaluation;
          return;
        }
        
        // Fall back to matching by address and model name for any builder
        const storedEvaluation = Object.values(allStoredEvaluations).find(e => 
          e.homeData.address === home.address &&
          e.homeData.modelName === home.modelName
        );
        
        if (storedEvaluation) {
          evaluationMap[home.id] = storedEvaluation.evaluation;
        }
      });

      console.log(`Loaded ${Object.keys(evaluationMap).length} evaluations for ${homes.length} homes`);
      setEvaluations(evaluationMap);
      setEvaluationsLoaded(true);
    } catch (error) {
      console.error('Error loading stored evaluations:', error);
      setEvaluationsLoaded(true);
    }
  }, [homes, evaluationsLoaded]);

  useEffect(() => {
    if (homes.length > 0) {
      loadStoredEvaluations();
    }
  }, [homes, loadStoredEvaluations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900">Loading Inventory</h2>
          <p className="text-gray-600 mt-2">Fetching the latest homes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Price Evaluation</h1>
                <p className="text-xs text-gray-500">AI-powered analysis of home pricing vs. market comparables</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-8">
        {/* Filters */}
        <Card className="mb-6 bg-white">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search by model name, builder, or community..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 border-gray-200"
                  />
                </div>
                <Button variant="outline" onClick={clearFilters} className="h-10">
                  Clear Filters
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={selectedBuilder} onChange={(e) => setSelectedBuilder(e.target.value)} className="h-10 bg-gray-50 border-gray-200">
                  <option value="">All Builders</option>
                  {builders.map(builder => (
                    <option key={builder.id} value={builder.id}>{builder.name}</option>
                  ))}
                </Select>
                
                <Select value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)} className="h-10 bg-gray-50 border-gray-200">
                  <option value="">All Communities</option>
                  {communities.map(community => (
                    <option key={community.id} value={community.id}>{community.name}</option>
                  ))}
                </Select>
                
                <Select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="h-10 bg-gray-50 border-gray-200">
                  <option value="">Any Bedrooms</option>
                  <option value="3">3 Bedrooms</option>
                  <option value="4">4 Bedrooms</option>
                  <option value="5">5+ Bedrooms</option>
                </Select>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Min Price"
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="h-10 bg-gray-50 border-gray-200"
                  />
                  <Input
                    placeholder="Max Price"
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="h-10 bg-gray-50 border-gray-200"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluate All Button */}
        <div className="mb-6">
          <Card className="bg-white">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">AI Price Evaluation</h3>
                  <p className="text-sm text-gray-600">
                    Analyze pricing for all {filteredHomes.filter(home => home.status === 'quick-move-in').length} quick-move-in homes using AI
                  </p>
                </div>
                <button
                  onClick={evaluateAllHomes}
                  disabled={evaluatingHomes.size > 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  {evaluatingHomes.size > 0 ? 'Evaluating...' : 'Evaluate All Prices'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Summary */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            Showing {filteredHomes.length} of {homes.length} homes
          </p>
          {compareList.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {compareList.length} selected for comparison
              </span>
              {compareList.length >= 2 && (
                <Link href={`/comparison?homes=${compareList.map(h => h.id).join(',')}`}>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                    Compare Now
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Home Listings */}
        <div className="space-y-6">
          {groupedHomes().map(([builderName, homes]) => (
            <Card key={builderName} className="bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg font-semibold text-gray-900">{builderName}</CardTitle>
                    <span className="text-sm text-gray-500">
                      ({homes.length} homes)
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homes.map((home) => (
                    <div
                      key={home.id}
                      className={`bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors ${
                        compareList.some(h => h.id === home.id) ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Link href={`/home/${home.id}`}>
                            <h3 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                              {home.modelName}
                            </h3>
                          </Link>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {home.community?.name}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={compareList.some(h => h.id === home.id)}
                          onChange={() => handleCompare(home)}
                          disabled={!compareList.some(h => h.id === home.id) && compareList.length >= 3}
                          className="w-4 h-4 text-blue-500"
                        />
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-2xl font-bold text-gray-900">{formatPrice(home.price)}</p>
                            <p className="text-sm text-gray-500">
                              {formatPricePerSquareFoot(home.price, home.squareFootage)} per sq ft
                            </p>
                          </div>
                          {evaluations[home.id] && (
                            <div className="flex-shrink-0">
                              <PriceEvaluationBadge
                                homeId={home.id}
                                initialEvaluation={evaluations[home.id]}
                                compact={true}
                                onEvaluate={(evaluation) => handleEvaluationComplete(home, evaluation)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {home.bedrooms} beds
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {home.bathrooms} baths
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="h-4 w-4" />
                          {formatSquareFootageNumber(home.squareFootage)} sq ft
                        </span>
                      </div>
                      
                      
                      <div className="flex gap-2 mt-3">
                        <Link href={`/home/${home.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredHomes.length === 0 && (
          <Card className="bg-white">
            <CardContent className="py-12">
              <div className="text-center">
                <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No homes found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showEvalModal && selectedHomeForEval && currentEvaluation && (
        <PriceEvaluationModal
          isOpen={showEvalModal}
          onClose={() => setShowEvalModal(false)}
          evaluation={currentEvaluation}
          home={selectedHomeForEval}
        />
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900">Loading Inventory</h2>
        </div>
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}