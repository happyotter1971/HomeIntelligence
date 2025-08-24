'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData } from '@/lib/auth';
import { getHomes, addHome, updateHome, deleteHome, getBuilders, getCommunities } from '@/lib/firestore';
import { refreshHomesFromWebsites } from '@/lib/scrape-and-update';
import { HomeWithRelations, Home, Builder, Community } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, Plus, Edit, Trash2, Shield, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHome, setEditingHome] = useState<HomeWithRelations | null>(null);
  const [scraping, setScraping] = useState(false);
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setLoading(true);
      await refreshHomesFromWebsites();
      // Refresh the displayed data
      await fetchData();
      alert('Successfully refreshed home data from builder websites!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to refresh data. Please try again.');
    }
  };

  const handleManualScrape = async () => {
    try {
      setScraping(true);
      
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
        alert(`Manual scrape completed! Updated ${result.homesUpdated} homes.`);
      } else {
        alert(`Scrape failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error during manual scrape:', error);
      alert('Manual scrape failed. Please try again.');
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
    setShowAddForm(false);
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
    setShowAddForm(true);
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
      } else {
        await addHome(homeData);
      }

      await fetchData();
      resetForm();
    } catch (error) {
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          </div>

          <Card>
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
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <div className="ml-auto flex gap-2">
            <Button 
              variant="outline"
              onClick={handleManualScrape}
              disabled={scraping || loading}
              className="flex items-center gap-2"
            >
              {scraping ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Scrape Now
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={handleRefreshData}
              disabled={loading || scraping}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Refresh from Websites
            </Button>
            <Button 
              onClick={() => setShowAddForm(true)}
              disabled={scraping}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Home
            </Button>
          </div>
        </div>

        {/* Scraping Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Automated Scraping
            </CardTitle>
            <CardDescription>
              Home data is automatically scraped from builder websites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-900">Schedule</div>
                <div className="text-blue-700">Daily at 2:00 AM</div>
                <div className="text-xs text-blue-600 mt-1">Automatic updates from all builders</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-900">Manual Control</div>
                <div className="text-green-700">Click &quot;Scrape Now&quot; above</div>
                <div className="text-xs text-green-600 mt-1">Immediate data refresh available</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {editingHome ? 'Edit Home' : 'Add New Home'}
              </CardTitle>
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
                    {editingHome ? 'Update Home' : 'Add Home'}
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Manage Homes ({homes.length})</h2>
            <p className="text-gray-600">Add, edit, or delete home listings</p>
          </div>

          {homes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No homes found. Add some homes to get started.</p>
              </CardContent>
            </Card>
          ) : (
            groupedHomes().map(([builderName, builderHomes]) => (
              <Card key={builderName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{builderName}</CardTitle>
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                      {builderHomes.length} home{builderHomes.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Model</th>
                          <th className="text-left py-2">Community</th>
                          <th className="text-left py-2">Price</th>
                          <th className="text-left py-2">Beds/Baths</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {builderHomes.map((home) => (
                          <tr key={home.id}>
                            <td className="py-3 font-medium">{home.modelName}</td>
                            <td className="py-3">{home.community?.name}</td>
                            <td className="py-3 font-medium">{formatPrice(home.price)}</td>
                            <td className="py-3">{home.bedrooms}bd/{home.bathrooms}ba</td>
                            <td className="py-3">
                              <span className={`capitalize px-2 py-1 rounded-full text-xs font-medium ${
                                home.status === 'available' ? 'bg-green-100 text-green-800' :
                                home.status === 'quick-move-in' ? 'bg-blue-100 text-blue-800' :
                                home.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {home.status.replace('-', ' ')}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEdit(home)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleDelete(home.id)}
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