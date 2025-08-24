'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getHomeById } from '@/lib/firestore';
import { HomeWithRelations } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatSquareFootage } from '@/lib/utils';
import { ArrowLeft, Home, MapPin, Bed, Bath, Car, Square, Calendar, DollarSign, Zap } from 'lucide-react';
import Link from 'next/link';

interface HomeDetailPageProps {
  params: {
    id: string;
  };
}

export default function HomeDetailPage({ params }: HomeDetailPageProps) {
  const [home, setHome] = useState<HomeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/auth/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchHome = useCallback(async () => {
    try {
      setLoading(true);
      const homeData = await getHomeById(params.id);
      if (homeData) {
        setHome(homeData);
      } else {
        setError('Home not found');
      }
    } catch (error) {
      console.error('Error fetching home:', error);
      setError('Failed to load home details');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !home) {
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
          </div>
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">{error}</p>
          </div>
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
          <h1 className="text-3xl font-bold text-gray-900">{home.modelName}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{home.modelName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4" />
                      {home.community?.name} by {home.builder?.name}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{formatPrice(home.price)}</div>
                    {home.estimatedMonthlyPayment && (
                      <div className="text-sm text-gray-500">
                        Est. {formatPrice(home.estimatedMonthlyPayment)}/mo
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-gray-400" />
                    <span>{home.bedrooms} Bedrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-gray-400" />
                    <span>{home.bathrooms} Bathrooms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Square className="h-5 w-5 text-gray-400" />
                    <span>{formatSquareFootage(home.squareFootage)}</span>
                  </div>
                  {home.garageSpaces > 0 && (
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-gray-400" />
                      <span>{home.garageSpaces} Car Garage</span>
                    </div>
                  )}
                </div>

                {home.address && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                    <p className="text-gray-600">{home.address}</p>
                    {home.homesiteNumber && (
                      <p className="text-sm text-gray-500 mt-1">Homesite: {home.homesiteNumber}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Features */}
            {home.features && home.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Features & Amenities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {home.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      home.status === 'available' ? 'bg-green-100 text-green-800' :
                      home.status === 'quick-move-in' ? 'bg-blue-100 text-blue-800' :
                      home.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {home.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  {home.status === 'quick-move-in' && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                      <Zap className="h-4 w-4" />
                      <span className="text-sm font-medium">Ready for immediate move-in!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Builder Info */}
            <Card>
              <CardHeader>
                <CardTitle>Builder Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{home.builder?.name}</h4>
                    {home.builder?.website && (
                      <a 
                        href={home.builder.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Visit Builder Website →
                      </a>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Community</h4>
                    <p className="text-gray-600">{home.community?.name}</p>
                    <p className="text-sm text-gray-500">{home.community?.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href={`/comparison?homes=${home.id}`}>
                    <Button className="w-full">
                      Add to Comparison
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full">
                    Contact Builder
                  </Button>
                  <Button variant="outline" className="w-full">
                    Schedule Tour
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}