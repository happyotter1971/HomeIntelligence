import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatSquareFootage(sqft: number): string {
  return new Intl.NumberFormat("en-US").format(sqft) + " sq ft";
}

export function formatSquareFootageNumber(sqft: number): string {
  return new Intl.NumberFormat("en-US").format(sqft);
}

export function formatPricePerSquareFoot(price: number, squareFootage: number): string {
  const pricePerSqFt = price / squareFootage;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(pricePerSqFt);
}