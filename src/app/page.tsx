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
import { Home, Users, BarChart3, Building2, TrendingUp, TrendingDown, Minus, Settings, LogOut } from 'lucide-react';

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
      setAnalysisLoading(false);
    } catch (error) {
      console.error('Error fetching homes data:', error);
      setAnalysisLoading(false);
    }
  };

  const competitiveAnalysis = useMemo(() => {
    if (!homes.length) return [];

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900">Loading BuilderIntelligence</h2>
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-blue-500 mr-2" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">BuilderIntelligence</h1>
                    <p className="text-xs text-gray-500">Insight that Builds Results</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm text-gray-600">Welcome back, {getFirstName()}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => auth.signOut()}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-6 py-8">
          {/* Dashboard Overview */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboard Overview</h2>
            <p className="text-gray-600">Monitor market trends, compare inventory, and track price changes across builders</p>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link href="/inventory" className="block">
              <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <Home className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">Price Evaluation</CardTitle>
                      <CardDescription className="text-sm text-gray-600">AI-powered analysis of home prices vs. market comparables</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/comparison" className="block">
              <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <BarChart3 className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">Compare Homes</CardTitle>
                      <CardDescription className="text-sm text-gray-600">Side-by-side home comparisons</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin" className="block">
              <Card className="bg-white hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                      <Settings className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900">Admin Panel</CardTitle>
                      <CardDescription className="text-sm text-gray-600">Manage home inventory data</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Price Changes Section */}
          <div className="mb-8">
            <PriceChanges maxItems={10} />
          </div>

          {/* Competitive Analysis Section */}
          <Card className="bg-white mb-8">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Quick Move-In Inventory Comparison
                </CardTitle>
              </div>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Price comparison analysis for similar home configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <div className="animate-pulse">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : competitiveAnalysis.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No competitive analysis data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Bedrooms</th>
                        <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">DFH</th>
                        <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">KB Home</th>
                        <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Ryan Homes</th>
                        <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {competitiveAnalysis.map((comp) => (
                        <tr key={comp.bedrooms} className="hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <span className="font-medium text-gray-900">{comp.bedrooms}BR</span>
                          </td>
                          <td className="py-3 px-3">
                            {comp.dreamfindersPrice ? (
                              <div>
                                <div className="font-semibold text-gray-900">{formatPrice(comp.dreamfindersPrice)}</div>
                                <div className="text-xs text-gray-500">{comp.dreamfindersCount} homes</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No homes</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {comp.kbPrice ? (
                              <div>
                                <div className="font-medium text-gray-900">{formatPrice(comp.kbPrice)}</div>
                                <div className="text-xs text-gray-500">{comp.kbCount} homes</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No homes</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {comp.ryanPrice ? (
                              <div>
                                <div className="font-medium text-gray-900">{formatPrice(comp.ryanPrice)}</div>
                                <div className="text-xs text-gray-500">{comp.ryanCount} homes</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No homes</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              if (!comp.dreamfindersPrice) {
                                return <span className="text-xs text-gray-500">N/A</span>;
                              }
                              
                              const competitorPrices = [comp.kbPrice, comp.ryanPrice].filter(Boolean);
                              if (competitorPrices.length === 0) {
                                return <span className="text-xs text-gray-500">No Comp</span>;
                              }
                              const avgCompetitorPrice = competitorPrices.reduce((a, b) => a! + b!, 0)! / competitorPrices.length;
                              const diff = comp.dreamfindersPrice - avgCompetitorPrice;
                              if (Math.abs(diff) < 5000) {
                                return <span className="text-xs text-amber-600 font-medium">Above Market</span>;
                              } else if (diff < 0) {
                                return <span className="text-xs text-green-600 font-medium">Below Market</span>;
                              } else {
                                return <span className="text-xs text-red-600 font-medium">Above Market</span>;
                              }
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Featured Builders Section */}
          <Card className="bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg font-semibold text-gray-900">Featured Builders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => window.open('https://dreamfindershomes.com/new-homes/nc/indian-trail/moore-farms/', '_blank')}>
                  <Building2 className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Dream Finders Homes</h3>
                  <p className="text-xs text-gray-500 mb-3">Moore Farms Community</p>
                  <p className="text-sm text-gray-600">Premium homes with modern designs and energy-efficient features</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => window.open('https://www.kbhome.com/new-homes-charlotte-area/sheffield', '_blank')}>
                  <Building2 className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">KB Home</h3>
                  <p className="text-xs text-gray-500 mb-3">Sheffield Community</p>
                  <p className="text-sm text-gray-600">Customizable homes with innovative technology and smart home features</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => window.open('https://www.ryanhomes.com/new-homes/communities/10222120152769/north-carolina/indian-trail/moorefarm', '_blank')}>
                  <Building2 className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Ryan Homes</h3>
                  <p className="text-xs text-gray-500 mb-3">Moore Farm Community</p>
                  <p className="text-sm text-gray-600">Quality construction with flexible floor plans and contemporary styling</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BuilderIntelligence</h1>
          <p className="text-gray-600 mb-8">See the market clearly, build smarter</p>
          
          <Link href="/auth/login">
            <Button size="lg" className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              Sign in to continue
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}