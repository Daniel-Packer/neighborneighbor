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
