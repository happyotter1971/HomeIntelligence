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
import { Search, Filter, ArrowLeft, MapPin, Eye, Clock, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Quick Move-In Inventory</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search homes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              
              <Select value={selectedBuilder} onChange={(e) => setSelectedBuilder(e.target.value)}>
                <option value="">All Builders</option>
                {builders.map(builder => (
                  <option key={builder.id} value={builder.id}>{builder.name}</option>
                ))}
              </Select>
              
              <Select value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)}>
                <option value="">All Communities</option>
                {communities.map(community => (
                  <option key={community.id} value={community.id}>{community.name}</option>
                ))}
              </Select>
              
              <Input
                placeholder="Min Price"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              
              <Input
                placeholder="Max Price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
              
              <Select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
                <option value="">Any Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4 Bedrooms</option>
                <option value="5">5+ Bedrooms</option>
              </Select>
              
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="quick-move-in">Quick Move-In</option>
                <option value="pending">Pending</option>
              </Select>
              
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {compareList.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Compare Homes ({compareList.length}/3)</CardTitle>
              <CardDescription>
                Selected homes for comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="flex gap-2 flex-1">
                  {compareList.map(home => (
                    <div key={home.id} className="bg-primary/10 px-3 py-1 rounded-md text-sm">
                      {home.modelName} - {home.builder?.name}
                      <button
                        onClick={() => handleCompare(home)}
                        className="ml-2 text-primary hover:text-primary/70"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <Link href={`/comparison?homes=${compareList.map(h => h.id).join(',')}`}>
                  <Button>
                    Compare Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
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
            <Card key={builderName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{builderName}</CardTitle>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
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
                        <tr key={home.id} className="hover:bg-green-50">
                          <td className="py-4 px-2">
                            <div className="font-medium text-gray-900">{home.modelName}</div>
                            {home.address && (
                              <div className="text-sm text-gray-500">{home.address}</div>
                            )}
                            {home.homesiteNumber && (
                              <div className="text-sm text-gray-500">Homesite: {home.homesiteNumber}</div>
                            )}
                          </td>
                          <td className="py-4 px-2 text-gray-600">{home.community?.name}</td>
                          <td className="py-4 px-2">
                            <div className="font-semibold text-gray-900">{formatPrice(home.price)}</div>
                          </td>
                          <td className="py-4 px-2 text-gray-600">{formatPricePerSquareFoot(home.price, home.squareFootage)}</td>
                          <td className="py-4 px-2 text-gray-600">{formatSquareFootageNumber(home.squareFootage)}</td>
                          <td className="py-4 px-2 text-gray-600">{home.bedrooms}</td>
                          <td className="py-4 px-2 text-gray-600">{home.bathrooms}</td>
                          <td className="py-4 px-2 text-gray-600">{home.garageSpaces}</td>
                          <td className="py-4 px-2">
                            <div className="flex gap-2">
                              <Link href={`/home/${home.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </Link>
                              <Button 
                                size="sm" 
                                variant={compareList.some(h => h.id === home.id) ? "secondary" : "outline"}
                                onClick={() => handleCompare(home)}
                              >
                                {compareList.some(h => h.id === home.id) ? 'Remove' : 'Compare'}
                              </Button>
                            </div>
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