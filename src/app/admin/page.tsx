'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData } from '@/lib/auth';
import { getHomes, updateHome, deleteHome, getBuilders, getCommunities } from '@/lib/firestore';
import { HomeWithRelations, Home, Builder, Community } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, Edit, Trash2, Shield, Download, RefreshCw, AlertTriangle, Building2, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';

interface HomeFormData {
  modelName: string;
  builderId: string;
  communityId: string;
  address: string;
  homesiteNumber: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  squareFootage: string;
  garageSpaces: string;
  status: string;
  features: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [homes, setHomes] = useState<HomeWithRelations[]>([]);
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [editingHome, setEditingHome] = useState<HomeWithRelations | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [formData, setFormData] = useState<HomeFormData>({
    modelName: '',
    builderId: '',
    communityId: '',
    address: '',
    homesiteNumber: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    squareFootage: '',
    garageSpaces: '',
    status: 'available',
    features: ''
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth/login');
      } else {
        setUser(user);
        const userData = await getUserData(user.uid);
        setIsAuthorized(userData?.role === 'admin');
        if (userData?.role === 'admin') {
          fetchData();
        } else {
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const formatLastUpdateTime = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const fetchData = async () => {
    try {
      const [homesData, buildersData, communitiesData] = await Promise.all([
        getHomes(),
        getBuilders(),
        getCommunities()
      ]);
      
      setHomes(homesData);
      setBuilders(buildersData);
      setCommunities(communitiesData);
      
      // Find the most recent update time from all homes
      if (homesData.length > 0) {
        const mostRecentUpdate = homesData.reduce((latest, home) => {
          const homeUpdateTime = home.lastUpdated?.toDate ? home.lastUpdated.toDate() : new Date(0);
          return homeUpdateTime > latest ? homeUpdateTime : latest;
        }, new Date(0));
        setLastUpdateTime(mostRecentUpdate);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleManualScrape = async () => {
    try {
      setScraping(true);
      setScrapeResult(null);
      
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh the displayed data
        await fetchData();
        setScrapeResult({
          success: true,
          message: `Successfully updated ${result.homesUpdated} homes.`
        });
        // Clear the message after 5 seconds
        setTimeout(() => setScrapeResult(null), 5000);
      } else {
        setScrapeResult({
          success: false,
          message: `Scrape failed: ${result.error}`
        });
      }
    } catch (error) {
      console.error('Error during manual scrape:', error);
      setScrapeResult({
        success: false,
        message: 'Manual scrape failed. Please try again.'
      });
    } finally {
      setScraping(false);
    }
  };

  const resetForm = () => {
    setFormData({
      modelName: '',
      builderId: '',
      communityId: '',
      address: '',
      homesiteNumber: '',
      price: '',
      bedrooms: '',
      bathrooms: '',
      squareFootage: '',
      garageSpaces: '',
      status: 'available',
      features: ''
    });
    setEditingHome(null);
  };

  const handleEdit = (home: HomeWithRelations) => {
    setFormData({
      modelName: home.modelName,
      builderId: home.builderId,
      communityId: home.communityId,
      address: home.address || '',
      homesiteNumber: home.homesiteNumber || '',
      price: home.price.toString(),
      bedrooms: home.bedrooms.toString(),
      bathrooms: home.bathrooms.toString(),
      squareFootage: home.squareFootage.toString(),
      garageSpaces: home.garageSpaces.toString(),
      status: home.status,
      features: home.features.join(', ')
    });
    setEditingHome(home);
    
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.getElementById('home-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const homeData: Omit<Home, 'id'> = {
        modelName: formData.modelName,
        builderId: formData.builderId,
        communityId: formData.communityId,
        address: formData.address || undefined,
        homesiteNumber: formData.homesiteNumber || undefined,
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        squareFootage: parseInt(formData.squareFootage),
        garageSpaces: parseInt(formData.garageSpaces),
        status: formData.status as any,
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
        lastUpdated: Timestamp.now(),
        createdAt: editingHome ? editingHome.createdAt : Timestamp.now()
      };

      if (editingHome) {
        await updateHome(editingHome.id, homeData);
      }

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Error saving home:', error);
      console.error('Error saving home:', error);
    }
  };

  const handleDelete = async (homeId: string) => {
    if (window.confirm('Are you sure you want to delete this home?')) {
      try {
        await deleteHome(homeId);
        await fetchData();
      } catch (error) {
        console.error('Error deleting home:', error);
      }
    }
  };

  const groupedHomes = () => {
    const groups = homes.reduce((acc, home) => {
      const builderName = home.builder?.name || 'Unknown Builder';
      if (!acc[builderName]) {
        acc[builderName] = [];
      }
      acc[builderName].push(home);
      return acc;
    }, {} as Record<string, HomeWithRelations[]>);

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const findAllDuplicates = () => {
    const duplicateGroups: HomeWithRelations[][] = [];
    const processed = new Set<string>();

    homes.forEach(home => {
      if (processed.has(home.id)) return;

      const potentialDuplicates = homes.filter(otherHome => {
        if (otherHome.id === home.id || processed.has(otherHome.id)) return false;

        // Same address check
        if (home.address && otherHome.address) {
          return home.address.toLowerCase() === otherHome.address.toLowerCase();
        }

        // Same homesite number in same community
        if (home.homesiteNumber && otherHome.homesiteNumber) {
          return home.homesiteNumber === otherHome.homesiteNumber && 
                 home.communityId === otherHome.communityId;
        }

        // Same model with identical specs
        return home.modelName.toLowerCase() === otherHome.modelName.toLowerCase() &&
               home.builderId === otherHome.builderId &&
               home.communityId === otherHome.communityId &&
               home.price === otherHome.price &&
               home.bedrooms === otherHome.bedrooms &&
               home.bathrooms === otherHome.bathrooms &&
               home.squareFootage === otherHome.squareFootage;
      });

      if (potentialDuplicates.length > 0) {
        const group = [home, ...potentialDuplicates];
        duplicateGroups.push(group);
        group.forEach(h => processed.add(h.id));
      }
    });

    return duplicateGroups;
  };

  const isDuplicateHome = (homeId: string) => {
    const duplicateGroups = findAllDuplicates();
    return duplicateGroups.some(group => group.some(home => home.id === homeId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-blue-500 mr-2" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
                    <p className="text-xs text-gray-500">Access Denied</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-6 py-8">
          <Card className="bg-white">
            <CardContent className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto text-red-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You don&apos;t have admin privileges to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500">Manage home inventory and builder data</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleManualScrape} 
                disabled={scraping}
                className="text-gray-600 hover:text-gray-900"
              >
                {scraping ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-8">

        {/* Scrape Result Message */}
        {scrapeResult && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            scrapeResult.success 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {scrapeResult.success ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="font-medium">{scrapeResult.message}</span>
          </div>
        )}

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Total Homes</h3>
                  <p className="text-2xl font-bold text-gray-900">{homes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Builders</h3>
                  <p className="text-2xl font-bold text-gray-900">{builders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Last Updated</h3>
                  <p className="text-sm text-gray-900">
                    {formatLastUpdateTime(lastUpdateTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            lastUpdateTime && (new Date().getTime() - lastUpdateTime.getTime()) < 3600000
              ? 'bg-green-100 text-green-800'
              : lastUpdateTime && (new Date().getTime() - lastUpdateTime.getTime()) < 86400000
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <RefreshCw className="h-4 w-4" />
            Data is {lastUpdateTime && (new Date().getTime() - lastUpdateTime.getTime()) < 3600000
              ? 'Fresh'
              : lastUpdateTime && (new Date().getTime() - lastUpdateTime.getTime()) < 86400000
              ? 'Recent'
              : 'Stale'}
 • Auto-refresh daily at 2:00 AM UTC
          </div>
        </div>

        {editingHome && (
          <Card id="home-form" className="bg-white mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Edit className="h-5 w-5 text-blue-500" />
                Edit Home: {formData.modelName}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Editing home in {homes.find(h => h.id === editingHome.id)?.community?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Model Name</label>
                    <Input
                      value={formData.modelName}
                      onChange={(e) => setFormData({...formData, modelName: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Builder</label>
                    <Select
                      value={formData.builderId}
                      onChange={(e) => setFormData({...formData, builderId: e.target.value})}
                      required
                    >
                      <option value="">Select Builder</option>
                      {builders.map(builder => (
                        <option key={builder.id} value={builder.id}>
                          {builder.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Community</label>
                    <Select
                      value={formData.communityId}
                      onChange={(e) => setFormData({...formData, communityId: e.target.value})}
                      required
                    >
                      <option value="">Select Community</option>
                      {communities.map(community => (
                        <option key={community.id} value={community.id}>
                          {community.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Price</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Bedrooms</label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Bathrooms</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Square Footage</label>
                    <Input
                      type="number"
                      value={formData.squareFootage}
                      onChange={(e) => setFormData({...formData, squareFootage: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Garage Spaces</label>
                    <Input
                      type="number"
                      value={formData.garageSpaces}
                      onChange={(e) => setFormData({...formData, garageSpaces: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      required
                    >
                      <option value="available">Available</option>
                      <option value="quick-move-in">Quick Move-In</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-2">Address (Optional)</label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Homesite Number (Optional)</label>
                    <Input
                      value={formData.homesiteNumber}
                      onChange={(e) => setFormData({...formData, homesiteNumber: e.target.value})}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Features (comma-separated)</label>
                    <Input
                      value={formData.features}
                      onChange={(e) => setFormData({...formData, features: e.target.value})}
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button type="submit">
                    Update Home
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quick Move-In Inventory</h2>
            <p className="text-gray-600">Manage homes ready for immediate move-in</p>
          </div>

          {/* Builder Summary Section */}
          <Card className="bg-white mb-8">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Building2 className="h-5 w-5 text-blue-500" />
                Builder Summary
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Total homes by builder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {groupedHomes().map(([builderName, builderHomes]) => (
                  <div key={builderName} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{builderName}</h3>
                      <span className="text-2xl font-bold text-blue-600">{builderHomes.length}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {builderHomes.length === 1 ? 'home' : 'homes'} listed
                    </p>
                    {/* Show breakdown by status */}
                    <div className="flex gap-3 mt-3 text-xs">
                      {(() => {
                        const statusCounts = builderHomes.reduce((acc, home) => {
                          acc[home.status] = (acc[home.status] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        
                        return Object.entries(statusCounts).map(([status, count]) => (
                          <span key={status} className={`px-2 py-1 rounded-full ${
                            status === 'available' ? 'bg-green-100 text-green-700' :
                            status === 'quick-move-in' ? 'bg-blue-100 text-blue-700' :
                            status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {count} {status.replace('-', ' ')}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {(() => {
            const duplicateGroups = findAllDuplicates();
            if (duplicateGroups.length > 0) {
              return (
                <Card className="bg-red-50 border border-red-200 mb-8">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-5 w-5" />
                      Duplicate Homes Detected ({duplicateGroups.length} group{duplicateGroups.length > 1 ? 's' : ''})
                    </CardTitle>
                    <CardDescription className="text-sm text-red-700">
                      The following homes appear to be duplicates. Review and remove duplicates to maintain data quality.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {duplicateGroups.map((group, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-2">Duplicate Group {index + 1}:</h4>
                          <ul className="space-y-1 text-sm">
                            {group.map(home => (
                              <li key={home.id} className="text-gray-600">
                                • {home.modelName} - {home.builder?.name} - {home.address || home.homesiteNumber || 'No address'} - {formatPrice(home.price)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}

          {homes.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No homes found</h3>
                <p className="text-gray-500">Add some homes to get started.</p>
              </CardContent>
            </Card>
          ) : (
            groupedHomes().map(([builderName, builderHomes]) => (
              <Card key={builderName} className="bg-white mb-8">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg font-semibold text-gray-900">{builderName}</CardTitle>
                      <span className="text-sm text-gray-500">({builderHomes.length} homes)</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Address</th>
                          <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Community</th>
                          <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Price</th>
                          <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Bedrooms</th>
                          <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Bathrooms</th>
                          <th className="text-left py-3 px-3 font-medium text-sm text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {builderHomes.map((home) => (
                          <tr key={home.id} className={isDuplicateHome(home.id) ? "bg-red-50 border-l-4 border-red-400" : ""}>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{home.address || 'No Address'}</span>
                                {isDuplicateHome(home.id) && (
                                  <div title="Potential duplicate detected">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                  </div>
                                )}
                              </div>
                              {home.homesiteNumber && (
                                <div className="text-sm text-gray-500">Homesite: {home.homesiteNumber}</div>
                              )}
                            </td>
                            <td className="py-3">{home.community?.name}</td>
                            <td className="py-3 font-medium">{formatPrice(home.price)}</td>
                            <td className="py-3 text-center">{home.bedrooms}</td>
                            <td className="py-3 text-center">{home.bathrooms}</td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEdit(home)}
                                  className="bg-white border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleDelete(home.id)}
                                  className="bg-red-600 text-white border-2 border-red-700 hover:bg-red-700 shadow-sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}