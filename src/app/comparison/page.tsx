'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Home, Builder, Community, HomeWithRelations } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatSquareFootage, formatPricePerSquareFoot } from '@/lib/utils';
import { ArrowLeft, Bed, Bath, Car, Home as HomeIcon, MapPin, BarChart3, Building2, DollarSign } from 'lucide-react';
import Link from 'next/link';

function ComparisonContent() {
  const [homes, setHomes] = useState<HomeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
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
    const homeIds = searchParams.get('homes')?.split(',') || [];
    if (homeIds.length > 0) {
      fetchHomes(homeIds);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchHomes = async (homeIds: string[]) => {
    try {
      const homePromises = homeIds.map(id => 
        getDoc(doc(db, 'homes', id)).then(docSnap => 
          docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Home : null
        )
      );
      
      const homesData = await Promise.all(homePromises);
      const validHomes = homesData.filter(home => home !== null) as Home[];
      
      if (validHomes.length === 0) {
        setHomes([]);
        return;
      }
      
      const builderIds = Array.from(new Set(validHomes.map(home => home.builderId)));
      const communityIds = Array.from(new Set(validHomes.map(home => home.communityId)));
      
      const [buildersData, communitiesData] = await Promise.all([
        Promise.all(builderIds.map(id => 
          getDoc(doc(db, 'builders', id)).then(docSnap =>
            docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Builder : null
          )
        )),
        Promise.all(communityIds.map(id =>
          getDoc(doc(db, 'communities', id)).then(docSnap =>
            docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Community : null
          )
        ))
      ]);
      
      const buildersMap = new Map(buildersData.filter(b => b).map(b => [b!.id, b]));
      const communitiesMap = new Map(communitiesData.filter(c => c).map(c => [c!.id, c]));
      
      const homesWithRelations: HomeWithRelations[] = validHomes.map(home => ({
        ...home,
        builder: buildersMap.get(home.builderId) || undefined,
        community: communitiesMap.get(home.communityId) || undefined
      }));
      
      setHomes(homesWithRelations);
    } catch (error) {
      console.error('Error fetching homes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900">Loading Comparison</h2>
          <p className="text-gray-600 mt-2">Preparing home details...</p>
        </div>
      </div>
    );
  }

  if (homes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Inventory
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Home Comparison</h1>
                <p className="text-xs text-gray-500">Compare homes side-by-side</p>
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-6 py-16">
          <Card className="bg-white max-w-md mx-auto">
            <CardContent className="py-12">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Homes Selected</h3>
                <p className="text-gray-600 mb-4">Select homes from the inventory to compare them here.</p>
                <Link href="/inventory">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                    Browse Inventory
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/inventory">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Inventory
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Compare Homes</h1>
                <p className="text-xs text-gray-500">Side-by-side home comparison ({homes.length} homes)</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-8">
        {/* Comparison Table */}
        <Card className="bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg font-semibold text-gray-900">Home Comparison</CardTitle>
            </div>
            <CardDescription className="text-sm text-gray-600">
              Detailed comparison of selected homes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700 bg-gray-50">Property</th>
                    {homes.map((home) => (
                      <th key={home.id} className="text-left py-3 px-4 min-w-[200px]">
                        <div>
                          <h3 className="font-semibold text-gray-900">{home.modelName}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {home.builder?.name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {home.community?.name}
                          </p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Price */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Price</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <div className="text-2xl font-bold text-gray-900">{formatPrice(home.price)}</div>
                        <div className="text-sm text-gray-500">
                          {formatPricePerSquareFoot(home.price, home.squareFootage)} per sq ft
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Square Footage */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Square Footage</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <div className="font-semibold text-gray-900">{formatSquareFootage(home.squareFootage)}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Bedrooms */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Bedrooms</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{home.bedrooms}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Bathrooms */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Bathrooms</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Bath className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{home.bathrooms}</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Garage */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Garage</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{home.garageSpaces} car</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Address */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Address</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <div className="text-sm text-gray-600">{home.address || 'Not specified'}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Lot Size */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Lot Size</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <div className="text-sm text-gray-600">{home.lotSize || 'Not specified'}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Status */}
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-700 bg-gray-50">Status</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {home.status || 'Available'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Actions */}
                  <tr>
                    <td className="py-4 px-4 font-medium text-gray-700 bg-gray-50">Actions</td>
                    {homes.map((home) => (
                      <td key={home.id} className="py-4 px-4">
                        <Link href={`/home/${home.id}`}>
                          <Button size="sm" variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Price Range</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(Math.min(...homes.map(h => h.price)))} - {formatPrice(Math.max(...homes.map(h => h.price)))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <HomeIcon className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Size Range</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {Math.min(...homes.map(h => h.squareFootage)).toLocaleString()} - {Math.max(...homes.map(h => h.squareFootage)).toLocaleString()} sq ft
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Builders</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {Array.from(new Set(homes.map(h => h.builder?.name))).filter(Boolean).length} different
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900">Loading Comparison</h2>
        </div>
      </div>
    }>
      <ComparisonContent />
    </Suspense>
  );
}