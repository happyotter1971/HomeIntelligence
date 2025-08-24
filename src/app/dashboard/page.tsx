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
import { Search, Filter, ArrowLeft, MapPin, Eye, Clock, Zap, Check } from 'lucide-react';
import Link from 'next/link';

function DashboardContent() {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Dashboard background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 gradient-primary rounded-full blur-3xl opacity-8"></div>
        <div className="absolute bottom-20 left-0 w-80 h-80 gradient-accent rounded-full blur-3xl opacity-6"></div>
        <div className="absolute top-1/3 right-1/4 w-56 h-56 gradient-secondary rounded-full blur-3xl opacity-10"></div>
      </div>
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold gradient-accent bg-clip-text text-transparent">Quick Move-In Inventory</h1>
        </div>

        <Card className="mb-6 border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
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
              <Button size="lg" className="shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-full">
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
            <Card key={builderName} className="border-0 shadow-lg bg-card/95 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{builderName}</CardTitle>
                  <span className="gradient-primary text-white px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                    {homes.length} home{homes.length !== 1 ? 's' : ''}
                  </span>
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
                                  <div className="text-sm text-muted-foreground">{home.address}</div>
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
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}