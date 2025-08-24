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
import { ArrowLeft, Bed, Bath, Car, Home as HomeIcon, MapPin, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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
      const builderIds = Array.from(new Set(validHomes.map(home => home.builderId)));
      const communityIds = Array.from(new Set(validHomes.map(home => home.communityId)));
      
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (homes.length === 0) {
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
                    <span className="text-blue-600">Home Comparison</span>
                    <span className="text-gray-700">: Side by Side</span>
                  </h1>
                  <p className="text-sm text-gray-600 mt-2 font-medium bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    Compare up to 3 homes side-by-side
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/inventory">
                  <Button 
                    variant="outline"
                    className="bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-xl transition-all duration-200 shadow-lg"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Inventory
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <div className="container mx-auto px-6 pt-8 pb-12">

          <Card className="bg-white border-2 border-blue-200 shadow-md">
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
                    Browse homes in the inventory
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">2</span>
                    Click &ldquo;Compare&rdquo; on homes you&rsquo;re interested in
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">3</span>
                    Click &ldquo;Compare Now&rdquo; to see them side-by-side
                  </div>
                </div>
              </div>
              <Link href="/inventory">
                <Button className="mt-6 bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 shadow-md rounded-lg px-6 py-2">
                  Browse Homes
                </Button>
              </Link>
            </CardContent>
          </Card>
          </div>
        </div>
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
                  <span className="text-blue-600">Home Comparison</span>
                  <span className="text-gray-700">: {homes.length} Selected</span>
                </h1>
                <p className="text-sm text-gray-600 mt-2 font-medium bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                  <BarChart3 className="h-4 w-4 inline mr-1" />
                  Side-by-side comparison view
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/inventory">
                <Button 
                  variant="outline"
                  className="bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-xl transition-all duration-200 shadow-lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Inventory
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="container mx-auto px-6 pt-8 pb-12">

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {homes.map((home, index) => (
            <Card key={home.id} className="relative bg-white border-2 border-blue-200 shadow-md">
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
                  <Button className="w-full bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 shadow-md rounded-lg">
                    View Full Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white border-2 border-blue-200 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Quick Comparison
            </CardTitle>
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