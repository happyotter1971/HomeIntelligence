'use client';

import { useState } from 'react';
import { seedDatabase } from '@/lib/sample-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);

  const handleSeed = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await seedDatabase();
      setStats(result);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to seed database');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Database className="h-16 w-16 mx-auto text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Seed Database
            </h1>
            <p className="text-gray-600">
              Populate your Firebase database with sample home inventory data
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sample Data</CardTitle>
              <CardDescription>
                This will add sample builders, communities, and homes to your database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">3</div>
                  <div className="text-sm text-blue-700">Builders</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Dream Finders, KB Home, Ryan Homes
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <div className="text-sm text-green-700">Communities</div>
                  <div className="text-xs text-green-600 mt-1">
                    Moore Farms, Sheffield, Moore Farm
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">12</div>
                  <div className="text-sm text-purple-700">Home Models</div>
                  <div className="text-xs text-purple-600 mt-1">
                    Various floor plans and prices
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              {success && stats && (
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span>
                    Successfully added {stats.builders} builders, {stats.communities} communities, 
                    and {stats.homes} homes!
                  </span>
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  onClick={handleSeed} 
                  disabled={loading || success}
                  className="flex-1"
                >
                  {loading ? 'Seeding Database...' : success ? 'Database Seeded' : 'Seed Database'}
                </Button>
                
                {success && (
                  <Link href="/dashboard">
                    <Button variant="outline">
                      View Dashboard
                    </Button>
                  </Link>
                )}
              </div>

              <div className="text-center pt-4">
                <Link href="/" className="text-blue-600 hover:underline">
                  ← Back to Home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}