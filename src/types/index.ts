import { Timestamp } from "firebase/firestore";

export interface Builder {
  id: string;
  name: string;
  website: string;
  primaryColor: string;
  logo?: string;
}

export interface Community {
  id: string;
  builderId: string;
  name: string;
  location: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Home {
  id: string;
  builderId: string;
  communityId: string;
  modelName: string;
  address?: string;
  homesiteNumber?: string;
  price: number;
  priceRange?: {
    min: number;
    max: number;
  };
  bedrooms: number;
  bathrooms: number;
  halfBaths?: number;
  squareFootage: number;
  garageSpaces: number;
  lotSize?: number;
  status: "available" | "sold" | "pending" | "quick-move-in";
  features: string[];
  images?: string[];
  floorPlan?: string;
  estimatedMonthlyPayment?: number;
  lastUpdated: Timestamp;
  createdAt: Timestamp;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: "admin" | "user";
  createdAt: Timestamp;
  lastLogin: Timestamp;
}

export interface HomeWithRelations extends Home {
  builder?: Builder;
  community?: Community;
}