import { Signal } from "@preact/signals";

// Define types for our KV data
export interface LocationPoint {
  city: string;
  coordinates: [number, number]; // [latitude, longitude]
}

// Make the LocationPairing interface more specific with city keys
export interface LocationPairing {
  [cityKey: string]: LocationPoint | string;
  createdAt: string;
}
// Define types for our pairings data
export interface CityLocation {
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  zoom: number;
}

export interface PairingRecord {
  id: string;
  pairing: LocationPairing;
}


export interface CityMapsProps {
    cities: [CityLocation, CityLocation];
    cityKeys: [string, string]; // API keys for the cities (e.g., ["seattle", "portland"])
}

export interface MatchedPointsParams {
    hoverPoint: Signal<[number, number] | null>;
    pairings: Signal<LocationPairing[]>;
    sourceCity: string;
    targetCity: string;
    sourceCityName: string;
    targetCityName: string;
    showSourcePoints?: boolean; // Optional parameter to show source points
}

export interface MatchedPoint {
    coordinates: [number, number];
    distance: number;
    color: string;
    pairingId?: string;
}