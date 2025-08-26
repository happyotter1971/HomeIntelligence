'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error: any) {
      setError(error.message || 'Failed to sign up with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <Card className="bg-white">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <Building2 className="h-12 w-12 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Create Your Account</CardTitle>
            <CardDescription className="text-gray-600">
              Join BuilderIntelligence to access comprehensive home market data
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleGoogleSignIn}
              disabled={loading}
              size="lg"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating account...
                </div>
              ) : (
                'Sign up with Google'
              )}
            </Button>
            
            <div className="text-center">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to Home
              </Link>
            </div>
            
            <div className="text-center pt-4">
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-blue-500 hover:text-blue-600 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}