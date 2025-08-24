'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getHomes, getBuilders, getCommunities } from '@/lib/firestore';
import { HomeWithRelations, Builder, Community } from '@/types';
import { HomeCard } from '@/components/home-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
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
    applyFilters();
  }, [applyFilters]);

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
          <h1 className="text-3xl font-bold text-gray-900">Home Dashboard</h1>
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
          <p className="text-gray-600">
            Showing {filteredHomes.length} of {homes.length} homes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHomes.map(home => (
            <HomeCard
              key={home.id}
              home={home}
              onCompare={handleCompare}
              isComparing={compareList.some(h => h.id === home.id)}
            />
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