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
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Loading screen background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-32 h-32 gradient-primary rounded-full blur-2xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-40 h-40 gradient-accent rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 gradient-secondary rounded-full blur-3xl opacity-10"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold gradient-accent bg-clip-text text-transparent">Loading BuilderIntelligence</h2>
          <p className="text-muted-foreground mt-2">Setting up your dashboard...</p>
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
      <div className="min-h-screen relative">
        {/* Header with gradient background */}
        <div className="relative">
          <div className="absolute inset-0 bg-grad-hero"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-ink/40 via-bluebrand/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background"></div>
          <div className="container mx-auto px-6 py-12 relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <Image 
                    src="/home-intelligence-logo.svg" 
                    alt="BuilderIntelligence Logo" 
                    width={48} 
                    height={48}
                    className="flex-shrink-0"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg">
                    Dream Finders Homes: BuilderIntelligence
                  </h1>
                  <p className="text-sm text-white mt-2 font-semibold drop-shadow-lg bg-black/20 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">Insight that Builds Results and Makes Jeff Ott a Boat Load of Money</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-white font-medium drop-shadow-md">Welcome back, <span className="text-white font-bold">{getFirstName()}!</span></p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => auth.signOut()}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white rounded-xl"
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
              <Link href="/dashboard">
                <Card variant="branded" className="hover:shadow-xl transition-all cursor-pointer h-full">
                  <CardHeader variant="gradient">
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-bluebrand" />
                      Quick Move-In Inventory
                    </CardTitle>
                    <CardDescription>Browse homes ready for immediate move-in</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/comparison">
                <Card variant="branded" className="hover:shadow-xl transition-all cursor-pointer h-full">
                  <CardHeader variant="gradient">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-rust" />
                      Compare Homes
                    </CardTitle>
                    <CardDescription>Side-by-side home comparisons</CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/admin">
                <Card variant="branded" className="hover:shadow-xl transition-all cursor-pointer h-full">
                  <CardHeader variant="gradient">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-honey" />
                      Admin Panel
                    </CardTitle>
                    <CardDescription>Manage home inventory data</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>

            {/* Price Changes Section */}
            <div className="mb-8">
              <PriceChanges maxItems={10} />
            </div>

            {/* Competitive Analysis Section */}
            <Card className="glass-effect border-0 shadow-lg mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Quick Move-In Inventory Comparison
                  </CardTitle>
                  <CardDescription>
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
                              <th className="text-left py-3 px-2 font-medium">Bedrooms</th>
                              <th className="text-left py-3 px-2 font-medium">Dream Finders</th>
                              <th className="text-left py-3 px-2 font-medium">vs. KB Home</th>
                              <th className="text-left py-3 px-2 font-medium">vs. Ryan Homes</th>
                              <th className="text-left py-3 px-2 font-medium">Market Position</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {[1, 2, 3].map((i) => (
                              <tr key={i}>
                                <td className="py-4 px-2">
                                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="h-6 bg-gray-200 rounded w-24"></div>
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
                              <tr className="border-b">
                                <th className="text-left py-3 px-2 font-medium">Bedrooms</th>
                                <th className="text-left py-3 px-2 font-medium">Dream Finders</th>
                                <th className="text-left py-3 px-2 font-medium">vs. KB Home</th>
                                <th className="text-left py-3 px-2 font-medium">vs. Ryan Homes</th>
                                <th className="text-left py-3 px-2 font-medium">Market Position</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {competitiveAnalysis.map((comp) => (
                                <tr key={comp.bedrooms}>
                                  <td className="py-4 px-2 font-medium">
                                    <Link 
                                      href={`/dashboard?bedrooms=${comp.bedrooms}`}
                                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                      target="_blank"
                                    >
                                      {comp.bedrooms} Bedroom{comp.bedrooms > 1 ? 's' : ''}
                                    </Link>
                                  </td>
                                  <td className="py-4 px-2">
                                    {comp.dreamfindersPrice ? (
                                      <div>
                                        <div className="font-semibold text-blue-600">{formatPrice(comp.dreamfindersPrice)}</div>
                                        <div className="text-sm text-gray-500">{comp.dreamfindersCount} home{comp.dreamfindersCount > 1 ? 's' : ''}</div>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="text-sm text-gray-500">0 homes</div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 px-2">
                                    {comp.kbPrice ? (
                                      <div>
                                        <div className="font-medium">{formatPrice(comp.kbPrice)}</div>
                                        <div className={`text-sm ${comp.kbDiff ? 'flex items-center gap-1' : ''} ${getPriceComparisonColor(comp.kbDiff)}`}>
                                          {comp.kbDiff && getPriceComparisonIcon(comp.kbDiff)}
                                          {comp.kbDiff ? getPriceComparisonText(comp.kbDiff) : `${comp.kbCount} home${comp.kbCount > 1 ? 's' : ''}`}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">No comparable homes</div>
                                    )}
                                  </td>
                                  <td className="py-4 px-2">
                                    {comp.ryanPrice ? (
                                      <div>
                                        <div className="font-medium">{formatPrice(comp.ryanPrice)}</div>
                                        <div className={`text-sm ${comp.ryanDiff ? 'flex items-center gap-1' : ''} ${getPriceComparisonColor(comp.ryanDiff)}`}>
                                          {comp.ryanDiff && getPriceComparisonIcon(comp.ryanDiff)}
                                          {comp.ryanDiff ? getPriceComparisonText(comp.ryanDiff) : `${comp.ryanCount} home${comp.ryanCount > 1 ? 's' : ''}`}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">No comparable homes</div>
                                    )}
                                  </td>
                                  <td className="py-4 px-2">
                                    {(() => {
                                      // If Dream Finders has no homes, show "Not Applicable"
                                      if (!comp.dreamfindersPrice) {
                                        return <span className="text-gray-500">Not Applicable</span>;
                                      }
                                      
                                      const competitorPrices = [comp.kbPrice, comp.ryanPrice].filter(Boolean);
                                      if (competitorPrices.length === 0) {
                                        return <span className="text-gray-500">No competition</span>;
                                      }
                                      const avgCompetitorPrice = competitorPrices.reduce((a, b) => a! + b!, 0)! / competitorPrices.length;
                                      const diff = comp.dreamfindersPrice - avgCompetitorPrice;
                                      if (Math.abs(diff) < 5000) {
                                        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Competitive</span>;
                                      } else if (diff < 0) {
                                        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Below Market</span>;
                                      } else {
                                        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Above Market</span>;
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
            <Card className="glass-effect border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Featured Builders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div 
                    className="text-center p-4 bg-grad-primary text-white rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all transform hover:scale-105 border-2 border-honey"
                    onClick={() => window.open('https://dreamfindershomes.com/new-homes/nc/indian-trail/moore-farms/', '_blank')}
                  >
                    <h3 className="font-bold text-lg">Dream Finders Homes</h3>
                    <p className="text-sm text-white/90">Moore Farms Community</p>
                  </div>
                  <div 
                    className="text-center p-4 bg-cloud border border-slate/20 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all transform hover:scale-105 hover:border-honey"
                    onClick={() => window.open('https://www.kbhome.com/new-homes-charlotte-area/sheffield', '_blank')}
                  >
                    <h3 className="font-semibold text-ink">KB Home</h3>
                    <p className="text-sm text-slate">Sheffield Community</p>
                  </div>
                  <div 
                    className="text-center p-4 bg-cloud border border-slate/20 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all transform hover:scale-105 hover:border-honey"
                    onClick={() => window.open('https://www.ryanhomes.com/new-homes/communities/10222120152769/north-carolina/indian-trail/moorefarm', '_blank')}
                  >
                    <h3 className="font-semibold text-ink">Ryan Homes</h3>
                    <p className="text-sm text-slate">Moore Farm Community</p>
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero gradient background */}
      <div className="absolute inset-0 bg-grad-hero"></div>
      {/* Contrast overlay for text accessibility */}
      <div className="absolute inset-0 bg-ink/35"></div>
      
      <div className="container mx-auto px-6 py-24 relative z-10">
        <div className="max-w-6xl mx-auto text-center text-white">
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              <Image 
                src="/home-intelligence-logo.svg" 
                alt="BuilderIntelligence Logo" 
                width={64} 
                height={64}
                className="flex-shrink-0"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold">
              BuilderIntelligence
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-honey font-bold mb-3 drop-shadow-[0_2px_8px_rgba(209,160,84,0.8)] relative">
            <span className="bg-gradient-to-r from-honey/20 to-transparent h-1 w-full absolute bottom-0 left-0"></span>
            See the market clearly
          </p>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Benchmark competitors, price confidently, build faster.
            Gain competitive insights across leading builders in Indian Trail, NC.
          </p>
          
          <div className="flex justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="px-8 text-base">
                Sign In with Google
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}