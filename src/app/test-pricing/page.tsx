'use client';

import { useEffect, useState } from 'react';
import { getBuilders, getHomes } from '@/lib/firestore';
import { Builder, HomeWithRelations } from '@/types';

interface TestResult {
  builder: string;
  homeId: string;
  modelName: string;
  price: number;
  sqft: number;
  result: any;
  error?: string;
}

export default function TestPricingPage() {
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadBuilders = async () => {
      const builderData = await getBuilders();
      setBuilders(builderData);
    };
    loadBuilders();
  }, []);

  const testEnhancedPricing = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      const results: TestResult[] = [];
      
      for (const builder of builders) {
        console.log(`Testing pricing for ${builder.name}...`);
        
        // Get first home from this builder
        const homes = await getHomes({ builderId: builder.id });
        const testHome = homes[0];
        
        if (!testHome) {
          results.push({
            builder: builder.name,
            homeId: 'N/A',
            modelName: 'N/A',
            price: 0,
            sqft: 0,
            result: null,
            error: 'No homes found for this builder'
          });
          continue;
        }
        
        // Test enhanced pricing API
        try {
          console.log(`Testing home ${testHome.id} for ${builder.name}`);
          console.log('Home data:', {
            id: testHome.id,
            price: testHome.price,
            squareFootage: testHome.squareFootage,
            bedrooms: testHome.bedrooms,
            bathrooms: testHome.bathrooms,
            status: testHome.status
          });
          
          const response = await fetch('/api/evaluate-price', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              homeId: testHome.id,
              useEnhanced: true,
              forceUpdate: true
            }),
          });
          
          const data = await response.json();
          console.log(`Result for ${builder.name}:`, data);
          
          results.push({
            builder: builder.name,
            homeId: testHome.id,
            modelName: testHome.modelName,
            price: testHome.price,
            sqft: testHome.squareFootage,
            result: data,
            error: response.ok ? undefined : data.error || 'API call failed'
          });
          
        } catch (error) {
          console.error(`Error testing ${builder.name}:`, error);
          results.push({
            builder: builder.name,
            homeId: testHome.id,
            modelName: testHome.modelName,
            price: testHome.price,
            sqft: testHome.squareFootage,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setTestResults(results);
      
    } catch (error) {
      console.error('Error in test:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enhanced Pricing System Test</h1>
      
      <div className="mb-6">
        <button
          onClick={testEnhancedPricing}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test Enhanced Pricing for All Builders'}
        </button>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Available Builders ({builders.length})</h2>
          <div className="grid gap-2">
            {builders.map((builder) => (
              <div key={builder.id} className="border rounded p-2 bg-gray-50">
                <span className="font-medium">{builder.name}</span>
                <span className="text-sm text-gray-600 ml-2">ID: {builder.id}</span>
              </div>
            ))}
          </div>
        </section>

        {testResults.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{result.builder}</h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.error 
                        ? 'bg-red-100 text-red-700' 
                        : result.result?.evaluation?.classification === 'insufficient_data'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {result.error 
                        ? 'ERROR'
                        : result.result?.evaluation?.classification === 'insufficient_data'
                        ? 'INSUFFICIENT DATA'
                        : 'SUCCESS'
                      }
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                    <div><span className="font-medium">Home:</span> {result.homeId}</div>
                    <div><span className="font-medium">Model:</span> {result.modelName}</div>
                    <div><span className="font-medium">Price:</span> ${result.price?.toLocaleString() || 'N/A'}</div>
                    <div><span className="font-medium">Sqft:</span> {result.sqft || 'N/A'}</div>
                  </div>
                  
                  {result.error && (
                    <div className="bg-red-50 p-3 rounded text-red-700 text-sm mb-3">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                  
                  {result.result && (
                    <div className="space-y-2">
                      {result.result.evaluation?.classification && (
                        <div className="text-sm">
                          <span className="font-medium">Classification:</span> {result.result.evaluation.classification}
                          {result.result.evaluation.confidence && (
                            <span className="text-gray-600"> ({result.result.evaluation.confidence}% confidence)</span>
                          )}
                        </div>
                      )}
                      
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600">View full response</summary>
                        <pre className="mt-2 bg-white p-2 rounded overflow-auto text-xs">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}