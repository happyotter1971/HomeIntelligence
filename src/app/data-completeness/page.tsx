'use client';

import { useEffect, useState } from 'react';
import { getBuilders, getHomes } from '@/lib/firestore';
import { Builder, HomeWithRelations } from '@/types';
import { sanitize, loadAndClean } from '@/lib/price-evaluation/enhanced/hygiene';
import type { RecordRaw } from '@/lib/price-evaluation/enhanced/types';

interface FieldStats {
  total: number;
  hasPrice: number;
  hasSquareFootage: number;
  hasBedrooms: number;
  hasBathrooms: number;
  hasStatus: number;
  hasAddress: number;
  hasGarageSpaces: number;
  hasLotSize: number;
  passesValidation: number;
}

interface BuilderStats {
  builder: Builder;
  homes: HomeWithRelations[];
  stats: FieldStats;
  sampleValidRecords: any[];
  sampleInvalidRecords: any[];
}

export default function DataCompletenessPage() {
  const [builderStats, setBuilderStats] = useState<BuilderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeData = async () => {
      try {
        const builders = await getBuilders();
        const stats: BuilderStats[] = [];

        for (const builder of builders) {
          console.log(`Analyzing ${builder.name}...`);
          const homes = await getHomes({ builderId: builder.id });
          
          const fieldStats: FieldStats = {
            total: homes.length,
            hasPrice: 0,
            hasSquareFootage: 0,
            hasBedrooms: 0,
            hasBathrooms: 0,
            hasStatus: 0,
            hasAddress: 0,
            hasGarageSpaces: 0,
            hasLotSize: 0,
            passesValidation: 0
          };

          const sampleValidRecords: any[] = [];
          const sampleInvalidRecords: any[] = [];

          homes.forEach((home) => {
            // Check field presence
            if (home.price && home.price > 0) fieldStats.hasPrice++;
            if (home.squareFootage && home.squareFootage > 0) fieldStats.hasSquareFootage++;
            if (home.bedrooms && home.bedrooms > 0) fieldStats.hasBedrooms++;
            if (home.bathrooms && home.bathrooms > 0) fieldStats.hasBathrooms++;
            if (home.status) fieldStats.hasStatus++;
            if (home.address) fieldStats.hasAddress++;
            if (home.garageSpaces !== undefined) fieldStats.hasGarageSpaces++;
            if (home.lotSize !== undefined) fieldStats.hasLotSize++;

            // Test enhanced system validation
            const recordRaw: RecordRaw = {
              id: home.id,
              price: home.price,
              sqft: home.squareFootage,
              beds: home.bedrooms,
              baths_full: Math.floor(home.bathrooms),
              baths_half: (home.bathrooms % 1) >= 0.5 ? 1 : 0,
              garage: home.garageSpaces || 0,
              lot_sqft: home.lotSize,
              year_built: new Date().getFullYear(),
              status: home.status,
              address: home.address,
              subdivision: home.community?.name,
              school_zone: 'Union County Public Schools',
              mls_id: home.id,
              plan_name: home.modelName,
              lat: home.community?.coordinates?.lat,
              lng: home.community?.coordinates?.lng,
              list_date: home.createdAt?.toDate(),
              property_type: 'single-family',
              builder: home.builder?.name,
              community: home.community?.name
            };

            const sanitized = sanitize(recordRaw);
            
            if (sanitized) {
              fieldStats.passesValidation++;
              if (sampleValidRecords.length < 3) {
                sampleValidRecords.push({
                  id: home.id,
                  modelName: home.modelName,
                  price: home.price,
                  sqft: home.squareFootage,
                  beds: home.bedrooms,
                  baths: home.bathrooms,
                  status: home.status,
                  address: home.address,
                  sanitized: true
                });
              }
            } else {
              if (sampleInvalidRecords.length < 3) {
                sampleInvalidRecords.push({
                  id: home.id,
                  modelName: home.modelName,
                  price: home.price,
                  sqft: home.squareFootage,
                  beds: home.bedrooms,
                  baths: home.bathrooms,
                  status: home.status,
                  address: home.address,
                  sanitized: false,
                  rawRecord: recordRaw
                });
              }
            }
          });

          stats.push({
            builder,
            homes,
            stats: fieldStats,
            sampleValidRecords,
            sampleInvalidRecords
          });
        }

        setBuilderStats(stats);
      } catch (error) {
        console.error('Error analyzing data:', error);
      } finally {
        setLoading(false);
      }
    };

    analyzeData();
  }, []);

  if (loading) {
    return <div className="p-8">Analyzing data completeness...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Data Completeness Analysis</h1>
      <p className="text-gray-600 mb-6">
        This analysis shows data completeness for each builder and identifies why homes might fail 
        the enhanced pricing system validation.
      </p>

      <div className="space-y-6">
        {builderStats.map((builderStat, index) => {
          const { builder, stats, sampleValidRecords, sampleInvalidRecords } = builderStat;
          const passRate = stats.total > 0 ? (stats.passesValidation / stats.total * 100) : 0;
          
          return (
            <div key={index} className="border rounded-lg p-6 bg-white shadow">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold">{builder.name}</h2>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    passRate >= 80 ? 'text-green-600' : 
                    passRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {passRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Pass Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{stats.total}</div>
                  <div className="text-gray-600">Total Homes</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">{stats.passesValidation}</div>
                  <div className="text-gray-600">Valid Records</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-red-600">{stats.total - stats.passesValidation}</div>
                  <div className="text-gray-600">Invalid Records</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{stats.hasPrice}</div>
                  <div className="text-gray-600">Has Price</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{stats.hasSquareFootage}</div>
                  <div className="text-gray-600">Has Sqft</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div className="text-center">
                  <div className="font-bold">{stats.hasBedrooms}</div>
                  <div className="text-gray-600">Has Bedrooms</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{stats.hasBathrooms}</div>
                  <div className="text-gray-600">Has Bathrooms</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{stats.hasStatus}</div>
                  <div className="text-gray-600">Has Status</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{stats.hasAddress}</div>
                  <div className="text-gray-600">Has Address</div>
                </div>
              </div>

              {sampleInvalidRecords.length > 0 && (
                <div className="bg-red-50 p-4 rounded mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">Sample Invalid Records:</h3>
                  <div className="space-y-2">
                    {sampleInvalidRecords.map((record, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="font-medium">{record.modelName || 'Unknown Model'}</div>
                        <div className="text-red-700">
                          Issues: {[
                            !record.price || record.price <= 0 ? 'Invalid price' : null,
                            !record.sqft || record.sqft <= 0 ? 'Invalid sqft' : null,
                            !record.beds || record.beds <= 0 ? 'Invalid bedrooms' : null
                          ].filter(Boolean).join(', ')}
                        </div>
                        <div className="text-gray-600">
                          Price: {record.price}, Sqft: {record.sqft}, Beds: {record.beds}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sampleValidRecords.length > 0 && (
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-semibold text-green-800 mb-2">Sample Valid Records:</h3>
                  <div className="space-y-2">
                    {sampleValidRecords.map((record, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="font-medium">{record.modelName}</div>
                        <div className="text-green-700">
                          ${record.price?.toLocaleString()}, {record.sqft} sqft, {record.beds} bed/{record.baths} bath
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}