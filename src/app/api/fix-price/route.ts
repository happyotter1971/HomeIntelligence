import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { homeId, newPrice } = await request.json();
    
    if (!homeId || !newPrice) {
      return NextResponse.json({ error: 'Missing homeId or newPrice' }, { status: 400 });
    }
    
    // Update the home's price
    const homeRef = doc(db, 'homes', homeId);
    await updateDoc(homeRef, {
      price: newPrice,
      lastUpdated: Timestamp.now()
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated home ${homeId} to price ${newPrice}` 
    }, { status: 200 });
  } catch (error) {
    console.error('Fix price error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}