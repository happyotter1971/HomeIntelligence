'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Home, Users, BarChart3, Building2 } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Home Intelligence</h1>
              <p className="text-gray-600 mt-2">Welcome back, {user.email}</p>
            </div>
            <Button variant="outline" onClick={() => auth.signOut()}>
              Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/dashboard">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-blue-600" />
                    Home Listings
                  </CardTitle>
                  <CardDescription>Browse and compare available homes</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/comparison">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Featured Builders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900">Dream Finders Homes</h3>
                  <p className="text-sm text-blue-700">Moore Farms Community</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900">KB Home</h3>
                  <p className="text-sm text-green-700">Sheffield Community</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-purple-900">Ryan Homes</h3>
                  <p className="text-sm text-purple-700">Moore Farm Community</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Home Intelligence
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Compare new home inventory across leading builders in Indian Trail, NC. 
            Find your perfect home with comprehensive data and insights.
          </p>
          
          <div className="flex gap-4 justify-center mb-12">
            <Link href="/auth/login">
              <Button size="lg" className="px-8">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" size="lg" className="px-8">
                Register
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