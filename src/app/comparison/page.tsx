'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Home, Builder, Community, HomeWithRelations } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatSquareFootage } from '@/lib/utils';
import { ArrowLeft, Bed, Bath, Car, Home as HomeIcon, MapPin } from 'lucide-react';
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
      // Fetch all homes in parallel first
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
      
      // Get unique builder and community IDs
      const builderIds = [...new Set(validHomes.map(home => home.builderId))];
      const communityIds = [...new Set(validHomes.map(home => home.communityId))];
      
      // Fetch all builders and communities in parallel
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
      
      // Create lookup maps
      const buildersMap = new Map(buildersData.filter(b => b).map(b => [b!.id, b]));
      const communitiesMap = new Map(communitiesData.filter(c => c).map(c => [c!.id, c]));
      
      // Combine the data
      const homesWithRelations: HomeWithRelations[] = validHomes.map(home => ({
        ...home,
        builder: buildersMap.get(home.builderId),
        community: communitiesMap.get(home.communityId)
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (homes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Home Comparison</h1>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <HomeIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No homes selected for comparison</h2>
              <p className="text-gray-600 mb-6">
                To compare homes, you need to first browse available properties and select up to 3 homes for side-by-side comparison.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">How to compare homes:</p>
                <div className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">1</span>
                    Browse homes on the dashboard
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">2</span>
                    Click "Compare" on homes you're interested in
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">3</span>
                    Click "Compare Now" to see them side-by-side
                  </div>
                </div>
              </div>
              <Link href="/dashboard">
                <Button className="mt-6">
                  Browse Homes
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Compare Homes ({homes.length})
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {homes.map((home, index) => (
            <Card key={home.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{home.modelName}</CardTitle>
                    <CardDescription>
                      {home.builder?.name} • {home.community?.name}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatPrice(home.price)}
                    </div>
                    {home.estimatedMonthlyPayment && (
                      <div className="text-sm text-muted-foreground">
                        Est. {formatPrice(home.estimatedMonthlyPayment)}/mo
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
                    <Bed className="h-5 w-5 text-blue-600 mb-1" />
                    <span className="text-lg font-semibold">{home.bedrooms}</span>
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
                    <Bath className="h-5 w-5 text-green-600 mb-1" />
                    <span className="text-lg font-semibold">{home.bathrooms}</span>
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg">
                    <Car className="h-5 w-5 text-purple-600 mb-1" />
                    <span className="text-lg font-semibold">{home.garageSpaces}</span>
                    <span className="text-sm text-muted-foreground">Garage</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Square Footage:</span>
                    <span className="font-medium">{formatSquareFootage(home.squareFootage)}</span>
                  </div>
                  
                  {home.lotSize && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lot Size:</span>
                      <span className="font-medium">{home.lotSize} acres</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">
                      {home.status.replace('-', ' ')}
                    </span>
                  </div>

                  {home.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{home.address}</span>
                    </div>
                  )}

                  {home.homesiteNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Homesite:</span>
                      <span className="font-medium">{home.homesiteNumber}</span>
                    </div>
                  )}
                </div>

                {home.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {home.features.map((feature, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-xs rounded-md"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button className="w-full">
                    View Full Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Feature</th>
                    {homes.map((home, index) => (
                      <th key={home.id} className="text-center py-2 font-medium">
                        {home.modelName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-3 font-medium">Builder</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center">
                        {home.builder?.name}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Community</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center">
                        {home.community?.name}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Price</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center font-semibold">
                        {formatPrice(home.price)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Square Footage</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center">
                        {formatSquareFootage(home.squareFootage)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Price per Sq Ft</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center">
                        {formatPrice(Math.round(home.price / home.squareFootage))}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Bedrooms</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center">
                        {home.bedrooms}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Bathrooms</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center">
                        {home.bathrooms}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Garage Spaces</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center">
                        {home.garageSpaces}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 font-medium">Status</td>
                    {homes.map(home => (
                      <td key={home.id} className="py-3 text-center capitalize">
                        {home.status.replace('-', ' ')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ComparisonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ComparisonContent />
    </Suspense>
  );
}