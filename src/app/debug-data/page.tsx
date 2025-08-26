'use client';

import { useEffect, useState } from 'react';
import { getBuilders, getHomes } from '@/lib/firestore';
import { Builder, HomeWithRelations } from '@/types';

export default function DebugDataPage() {
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [homesByBuilder, setHomesByBuilder] = useState<{ [key: string]: HomeWithRelations[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading builders and homes...');
        
        // Load builders
        const builderData = await getBuilders();
        console.log('Loaded builders:', builderData);
        setBuilders(builderData);

        // Load homes for each builder
        const homesByBuilderData: { [key: string]: HomeWithRelations[] } = {};
        
        for (const builder of builderData) {
          const homes = await getHomes({ builderId: builder.id });
          homesByBuilderData[builder.id] = homes;
          console.log(`Loaded ${homes.length} homes for ${builder.name}:`, homes.slice(0, 3));
        }
        
        setHomesByBuilder(homesByBuilderData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading data...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Debug Information</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Builders ({builders.length})</h2>
          <div className="grid gap-4">
            {builders.map((builder) => (
              <div key={builder.id} className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-semibold text-lg">{builder.name}</h3>
                <p className="text-sm text-gray-600">ID: {builder.id}</p>
                <p className="text-sm text-gray-600">
                  Homes: {homesByBuilder[builder.id]?.length || 0}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Sample Homes by Builder</h2>
          <div className="space-y-6">
            {builders.map((builder) => {
              const homes = homesByBuilder[builder.id] || [];
              return (
                <div key={builder.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">
                    {builder.name} ({homes.length} homes)
                  </h3>
                  
                  {homes.length === 0 ? (
                    <p className="text-red-600">No homes found for this builder</p>
                  ) : (
                    <div className="space-y-4">
                      {homes.slice(0, 3).map((home) => (
                        <div key={home.id} className="bg-gray-50 p-3 rounded text-sm">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <span className="font-medium">Model:</span> {home.modelName}
                            </div>
                            <div>
                              <span className="font-medium">Price:</span> ${home.price?.toLocaleString() || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Sqft:</span> {home.sqft || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Beds/Baths:</span> {home.bedrooms || 'N/A'}/{home.bathrooms || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Status:</span> {home.status || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Community:</span> {home.community?.name || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Address:</span> {home.address || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {
                                home.createdAt 
                                  ? new Date(home.createdAt.seconds * 1000).toLocaleDateString()
                                  : 'N/A'
                              }
                            </div>
                          </div>
                          
                          {/* Show all available fields for debugging */}
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-600">View all fields</summary>
                            <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                              {JSON.stringify(home, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))}
                      {homes.length > 3 && (
                        <p className="text-gray-600 text-sm">
                          ... and {homes.length - 3} more homes
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}