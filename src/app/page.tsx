'use client';

import { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData } from '@/lib/auth';
import { getHomes } from '@/lib/firestore';
import { User, HomeWithRelations } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import PriceChanges from '@/components/PriceChanges';
import { Home, Users, BarChart3, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [homes, setHomes] = useState<HomeWithRelations[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data || null);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Defer the homes data fetching to avoid blocking initial render
      const timeoutId = setTimeout(() => {
        fetchHomesData();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user]);

  const fetchHomesData = async () => {
    try {
      const homesData = await getHomes();
      setHomes(homesData);
      // Set loading to false immediately after homes are loaded
      setAnalysisLoading(false);
    } catch (error) {
      console.error('Error fetching homes data:', error);
      setAnalysisLoading(false);
    }
  };

  const competitiveAnalysis = useMemo(() => {
    if (!homes.length) return [];

    // Pre-group homes by builder for efficiency
    const homesByBuilder = homes.reduce((acc, home) => {
      const builderName = home.builder?.name?.toLowerCase() || '';
      if (builderName.includes('dream')) {
        acc.dreamfinders.push(home);
      } else if (builderName.includes('kb')) {
        acc.kb.push(home);
      } else if (builderName.includes('ryan')) {
        acc.ryan.push(home);
      }
      return acc;
    }, { dreamfinders: [] as HomeWithRelations[], kb: [] as HomeWithRelations[], ryan: [] as HomeWithRelations[] });

    // Get unique bedroom counts and pre-group by bedrooms
    const bedroomGroups = new Map<number, { dreamfinders: HomeWithRelations[], kb: HomeWithRelations[], ryan: HomeWithRelations[] }>();
    
    [homesByBuilder.dreamfinders, homesByBuilder.kb, homesByBuilder.ryan].flat().forEach(home => {
      if (!bedroomGroups.has(home.bedrooms)) {
        bedroomGroups.set(home.bedrooms, { dreamfinders: [], kb: [], ryan: [] });
      }
      
      const group = bedroomGroups.get(home.bedrooms)!;
      const builderName = home.builder?.name?.toLowerCase() || '';
      if (builderName.includes('dream')) {
        group.dreamfinders.push(home);
      } else if (builderName.includes('kb')) {
        group.kb.push(home);
      } else if (builderName.includes('ryan')) {
        group.ryan.push(home);
      }
    });

    // Calculate averages efficiently
    const getAverage = (homes: HomeWithRelations[]) => 
      homes.length > 0 ? homes.reduce((sum, h) => sum + h.price, 0) / homes.length : null;

    return Array.from(bedroomGroups.entries())
      .sort(([a], [b]) => a - b)
      .map(([bedrooms, groups]) => {
        const dfAvgPrice = getAverage(groups.dreamfinders);
        const kbAvgPrice = getAverage(groups.kb);
        const ryanAvgPrice = getAverage(groups.ryan);

        return {
          bedrooms,
          dreamfindersPrice: dfAvgPrice,
          dreamfindersCount: groups.dreamfinders.length,
          kbPrice: kbAvgPrice,
          kbCount: groups.kb.length,
          kbDiff: (dfAvgPrice && kbAvgPrice) ? dfAvgPrice - kbAvgPrice : null,
          ryanPrice: ryanAvgPrice,
          ryanCount: groups.ryan.length,
          ryanDiff: (dfAvgPrice && ryanAvgPrice) ? dfAvgPrice - ryanAvgPrice : null
        };
      });
  }, [homes]);

  const getPriceComparisonIcon = (diff: number | null) => {
    if (!diff) return <Minus className="h-4 w-4 text-gray-400" />;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  const getPriceComparisonText = (diff: number | null) => {
    if (!diff) return 'No comparable homes';
    const absString = formatPrice(Math.abs(diff));
    if (diff > 0) return `${absString} above`;
    return `${absString} below`;
  };

  const getPriceComparisonColor = (diff: number | null) => {
    if (!diff) return 'text-gray-500';
    if (diff > 0) return 'text-red-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900">Loading BuilderIntelligence</h2>
          <p className="text-gray-600 mt-2">Setting up your inventory browser...</p>
        </div>
      </div>
    );
  }

  if (user) {
    const getFirstName = () => {
      if (userData?.displayName) {
        return userData.displayName.split(' ')[0];
      }
      return user.email?.split('@')[0] || 'User';
    };

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header with clean background */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-700"></div>
          <div className="container mx-auto px-6 py-12 relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 shadow-sm">
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
                    <span className="text-blue-600">Dream Finders Homes</span>
                    <span className="text-gray-700">: BuilderIntelligence</span>
                  </h1>
                  <p className="text-sm text-gray-600 mt-2 font-medium bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    Insight that Builds Results and Makes Jeff Ott a Boat Load of Money
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-gray-700 font-medium">
                    Welcome back, <span className="text-gray-900 font-bold">{getFirstName()}!</span>
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => auth.signOut()}
                  className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg shadow-sm"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <div className="container mx-auto px-6 pt-8 pb-12">

            {/* Navigation Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Link href="/inventory">
                <Card className="bg-white border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer h-full shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Home className="h-5 w-5 text-blue-600" />
                      Quick Move-In Inventory
                    </CardTitle>
                    <CardDescription className="text-gray-600">Browse homes ready for immediate move-in</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/comparison">
                <Card className="bg-white border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer h-full shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Compare Homes
                    </CardTitle>
                    <CardDescription className="text-gray-600">Side-by-side home comparisons</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/admin">
                <Card className="bg-white border-2 border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer h-full shadow-md">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Users className="h-5 w-5 text-blue-600" />
                      Admin Panel
                    </CardTitle>
                    <CardDescription className="text-gray-600">Manage home inventory data</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>

            {/* Price Changes Section */}
            <div className="mb-8">
              <PriceChanges maxItems={10} />
            </div>

            {/* Competitive Analysis Section */}
            <Card className="bg-white border-2 border-blue-200 shadow-md mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Quick Move-In Inventory Comparison
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Price comparison analysis for similar home configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="animate-pulse">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium text-sm">Bedrooms</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">DFH</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">KB Home</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">Ryan Homes</th>
                              <th className="text-left py-2 px-3 font-medium text-sm">Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[1, 2, 3].map((i) => (
                              <tr key={i}>
                                <td className="py-3 px-3">
                                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="h-5 bg-gray-200 rounded w-20"></div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      if (!competitiveAnalysis || competitiveAnalysis.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No competitive analysis data available</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-medium text-sm text-gray-700">Bedrooms</th>
                                <th className="text-left py-2 px-3 font-medium text-sm text-blue-700">DFH</th>
                                <th className="text-left py-2 px-3 font-medium text-sm text-gray-700">KB Home</th>
                                <th className="text-left py-2 px-3 font-medium text-sm text-gray-700">Ryan Homes</th>
                                <th className="text-left py-2 px-3 font-medium text-sm text-gray-700">Position</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {competitiveAnalysis.map((comp) => (
                                <tr key={comp.bedrooms} className="hover:bg-gray-50">
                                  <td className="py-2 px-3">
                                    <Link 
                                      href={`/inventory?bedrooms=${comp.bedrooms}`}
                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                    >
                                      {comp.bedrooms}BR
                                    </Link>
                                  </td>
                                  <td className="py-2 px-3">
                                    {comp.dreamfindersPrice ? (
                                      <div>
                                        <div className="font-semibold text-blue-700">{formatPrice(comp.dreamfindersPrice)}</div>
                                        <div className="text-xs text-gray-500">{comp.dreamfindersCount} home{comp.dreamfindersCount > 1 ? 's' : ''}</div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-400">No homes</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {comp.kbPrice ? (
                                      <div>
                                        <div className="font-medium text-gray-800">{formatPrice(comp.kbPrice)}</div>
                                        <div className={`text-xs flex items-center gap-1 ${getPriceComparisonColor(comp.kbDiff)}`}>
                                          {comp.kbDiff && getPriceComparisonIcon(comp.kbDiff)}
                                          <span className="truncate">{comp.kbDiff ? getPriceComparisonText(comp.kbDiff) : `${comp.kbCount} home${comp.kbCount > 1 ? 's' : ''}`}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-400">No homes</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {comp.ryanPrice ? (
                                      <div>
                                        <div className="font-medium text-gray-800">{formatPrice(comp.ryanPrice)}</div>
                                        <div className={`text-xs flex items-center gap-1 ${getPriceComparisonColor(comp.ryanDiff)}`}>
                                          {comp.ryanDiff && getPriceComparisonIcon(comp.ryanDiff)}
                                          <span className="truncate">{comp.ryanDiff ? getPriceComparisonText(comp.ryanDiff) : `${comp.ryanCount} home${comp.ryanCount > 1 ? 's' : ''}`}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-400">No homes</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    {(() => {
                                      if (!comp.dreamfindersPrice) {
                                        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">N/A</span>;
                                      }
                                      
                                      const competitorPrices = [comp.kbPrice, comp.ryanPrice].filter(Boolean);
                                      if (competitorPrices.length === 0) {
                                        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">No Comp</span>;
                                      }
                                      const avgCompetitorPrice = competitorPrices.reduce((a, b) => a! + b!, 0)! / competitorPrices.length;
                                      const diff = comp.dreamfindersPrice - avgCompetitorPrice;
                                      if (Math.abs(diff) < 5000) {
                                        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Competitive</span>;
                                      } else if (diff < 0) {
                                        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Below Market</span>;
                                      } else {
                                        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Above Market</span>;
                                      }
                                    })()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </CardContent>
              </Card>

            {/* Featured Builders Section */}
            <Card className="bg-white border-2 border-blue-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Featured Builders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className="text-center p-4 bg-white border-2 border-blue-200 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
                    onClick={() => window.open('https://dreamfindershomes.com/new-homes/nc/indian-trail/moore-farms/', '_blank')}
                  >
                    <h3 className="font-bold text-lg text-gray-900">Dream Finders Homes</h3>
                    <p className="text-sm text-gray-600">Moore Farms Community</p>
                  </div>
                  <div 
                    className="text-center p-4 bg-white border-2 border-blue-200 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
                    onClick={() => window.open('https://www.kbhome.com/new-homes-charlotte-area/sheffield', '_blank')}
                  >
                    <h3 className="font-bold text-lg text-gray-900">KB Home</h3>
                    <p className="text-sm text-gray-600">Sheffield Community</p>
                  </div>
                  <div 
                    className="text-center p-4 bg-white border-2 border-blue-200 rounded-lg shadow-md cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
                    onClick={() => window.open('https://www.ryanhomes.com/new-homes/communities/10222120152769/north-carolina/indian-trail/moorefarm', '_blank')}
                  >
                    <h3 className="font-bold text-lg text-gray-900">Ryan Homes</h3>
                    <p className="text-sm text-gray-600">Moore Farm Community</p>
                  </div>
                </div>
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
          <div className="flex justify-center items-center">
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
                  <span className="text-blue-600">BuilderIntelligence</span>
                </h1>
                <p className="text-sm text-gray-600 mt-2 font-medium bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                  See the market clearly, build smarter
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="container mx-auto px-6 pt-16 pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Benchmark competitors, price confidently, build faster
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Gain competitive insights across leading builders in Indian Trail, NC.
              Access real-time inventory data, pricing trends, and market intelligence.
            </p>
            
            <div className="flex justify-center">
              <Link href="/auth/login">
                <Button size="lg" className="px-12 py-4 text-lg bg-blue-600 text-white border-2 border-blue-700 hover:bg-blue-700 shadow-md rounded-lg">
                  Sign in with Google
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}