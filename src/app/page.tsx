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
import { Home, Users, BarChart3, Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [homes, setHomes] = useState<HomeWithRelations[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

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
      setAnalysisLoading(true);
      const homesData = await getHomes();
      setHomes(homesData);
    } catch (error) {
      console.error('Error fetching homes data:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const competitiveAnalysis = useMemo(() => {
    if (!homes.length) return null;

    // Group homes by builder and bedroom count
    const dreamfindersHomes = homes.filter(h => h.builder?.name?.toLowerCase().includes('dream'));
    const kbHomes = homes.filter(h => h.builder?.name?.toLowerCase().includes('kb'));
    const ryanHomes = homes.filter(h => h.builder?.name?.toLowerCase().includes('ryan'));

    // Get unique bedroom counts for comparison from all builders
    const allBedroomCounts = [
      ...dreamfindersHomes.map(h => h.bedrooms),
      ...kbHomes.map(h => h.bedrooms),
      ...ryanHomes.map(h => h.bedrooms)
    ];
    const bedroomCounts = Array.from(new Set(allBedroomCounts)).sort();

    const comparisons = bedroomCounts.map(bedrooms => {
      const dfHomes = dreamfindersHomes.filter(h => h.bedrooms === bedrooms);
      const kbHomesFiltered = kbHomes.filter(h => h.bedrooms === bedrooms);
      const ryanHomesFiltered = ryanHomes.filter(h => h.bedrooms === bedrooms);

      // Show comparison even if Dream Finders has no homes for this bedroom count
      // This gives visibility into competitor offerings we don't currently have

      // Calculate average prices
      const dfAvgPrice = dfHomes.length > 0 ? 
        dfHomes.reduce((sum, h) => sum + h.price, 0) / dfHomes.length : null;
      const kbAvgPrice = kbHomesFiltered.length > 0 ? 
        kbHomesFiltered.reduce((sum, h) => sum + h.price, 0) / kbHomesFiltered.length : null;
      const ryanAvgPrice = ryanHomesFiltered.length > 0 ? 
        ryanHomesFiltered.reduce((sum, h) => sum + h.price, 0) / ryanHomesFiltered.length : null;

      // Calculate price differences (only if both prices exist)
      const kbDiff = (dfAvgPrice && kbAvgPrice) ? dfAvgPrice - kbAvgPrice : null;
      const ryanDiff = (dfAvgPrice && ryanAvgPrice) ? dfAvgPrice - ryanAvgPrice : null;

      return {
        bedrooms,
        dreamfindersPrice: dfAvgPrice,
        dreamfindersCount: dfHomes.length,
        kbPrice: kbAvgPrice,
        kbCount: kbHomesFiltered.length,
        kbDiff,
        ryanPrice: ryanAvgPrice,
        ryanCount: ryanHomesFiltered.length,
        ryanDiff
      };
    }).filter(Boolean);

    return comparisons;
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
          <h2 className="text-2xl font-bold gradient-accent bg-clip-text text-transparent">Loading Home Intelligence</h2>
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background decorative elements for authenticated users */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-64 h-64 gradient-accent rounded-full blur-3xl opacity-10"></div>
          <div className="absolute bottom-40 left-20 w-80 h-80 gradient-primary rounded-full blur-3xl opacity-8"></div>
          <div className="absolute top-1/2 right-1/3 w-48 h-48 gradient-secondary rounded-full blur-3xl opacity-15"></div>
        </div>
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Image 
                src="/home-intelligence-logo.svg" 
                alt="Home Intelligence Logo" 
                width={60} 
                height={60}
                className="flex-shrink-0"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-4xl font-bold gradient-accent bg-clip-text text-transparent leading-tight">
                  Dream Finders Homes: BuilderIntelligence
                  <span className="text-muted-foreground font-normal text-xl ml-4">Welcome back, {getFirstName()}</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1 italic">Insight That Builds Results</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => auth.signOut()}>
              Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/dashboard">
              <Card className="glass-effect hover:shadow-xl transition-all cursor-pointer h-full border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-blue-600" />
                    Quick Move-In Inventory
                  </CardTitle>
                  <CardDescription>Browse homes ready for immediate move-in</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/comparison">
              <Card className="glass-effect hover:shadow-xl transition-all cursor-pointer h-full border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Compare Homes
                  </CardTitle>
                  <CardDescription>Side-by-side home comparisons</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin">
              <Card className="glass-effect hover:shadow-xl transition-all cursor-pointer h-full border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Admin Panel
                  </CardTitle>
                  <CardDescription>Manage home inventory data</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Competitive Analysis Section */}
          <Card className="mb-8 glass-effect border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Dream Finders vs. Competition - Quick Move-In Inventory Comparison
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

          <Card className="glass-effect border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Featured Builders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 gradient-primary text-white rounded-lg shadow-lg">
                  <h3 className="font-semibold">Dream Finders Homes</h3>
                  <p className="text-sm opacity-90">Moore Farms Community</p>
                </div>
                <div className="text-center p-4 gradient-secondary rounded-lg shadow-lg">
                  <h3 className="font-semibold text-foreground">KB Home</h3>
                  <p className="text-sm text-muted-foreground">Sheffield Community</p>
                </div>
                <div className="text-center p-4 gradient-accent text-white rounded-lg shadow-lg">
                  <h3 className="font-semibold">Ryan Homes</h3>
                  <p className="text-sm opacity-90">Moore Farm Community</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-dots"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 gradient-primary rounded-full blur-3xl opacity-20"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 gradient-accent rounded-full blur-3xl opacity-15"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 gradient-secondary rounded-full blur-3xl opacity-25"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] gradient-primary rounded-full blur-3xl opacity-5"></div>
      </div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold gradient-accent bg-clip-text text-transparent mb-6">
            Home Intelligence
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Compare new home inventory across leading builders in Indian Trail, NC. 
            Find your perfect home with comprehensive data and insights.
          </p>
          
          <div className="flex justify-center mb-12">
            <Link href="/auth/login">
              <Button size="lg" className="px-8">
                Sign In with Google
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center">
                  <Home className="h-6 w-6 text-blue-600" />
                  Browse Homes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  View available homes from Dream Finders, KB Home, and Ryan Homes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                  Compare Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Side-by-side comparisons of price, size, and features
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center">
                  <Building2 className="h-6 w-6 text-purple-600" />
                  Market Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Real-time inventory updates and market trends
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}