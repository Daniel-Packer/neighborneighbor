// filepath: /home/daniel/Documents/neighborneighbor/islands/PairingList.tsx
import { useState } from "preact/hooks";
import type { LocationPairing } from "../src/interfaces.ts";
import { isLocationPoint } from "../src/validation.ts";
import { AVAILABLE_CITIES } from "./CitySelector.tsx";
import DeleteButton from "./DeleteButton.tsx";

interface PairingListProps {
  initialPairings: Array<{
    id: string;
    pairing: LocationPairing;
  }>;
}

export default function PairingList({ initialPairings }: PairingListProps) {
  const [pairings, setPairings] = useState(initialPairings);
  
  // Helper function to get the city name from key
  const getCityNameFromKey = (key: string): string => {
    const city = AVAILABLE_CITIES.find(city => city.key === key);
    return city ? city.name : key;
  };
  
  // Handle successful deletion
  const handleDeletePairing = (id: string) => {
    setPairings(pairings => pairings.filter(pairing => pairing.id !== id));
  };
  
  if (pairings.length === 0) {
    return (
      <div class="bg-white p-6 rounded-lg shadow text-center">
        <p>No paired locations found. Go back to the maps to create some pairs!</p>
      </div>
    );
  }
  
  return (
    <div class="grid gap-4 md:grid-cols-2">
      {pairings.map(({ id, pairing }) => {
        // Get the city keys in the pairing (excluding createdAt)
        const cityKeys = Object.keys(pairing).filter(key => key !== 'createdAt');
        
        if (cityKeys.length < 2) {
          return (
            <div key={id} class="bg-white p-4 rounded-lg shadow relative">
              <p>Invalid pairing data (not enough cities)</p>
              <DeleteButton id={id} onDelete={() => handleDeletePairing(id)} />
            </div>
          );
        }
        
        // Get the first two city keys (most common case)
        const [cityKey1, cityKey2] = cityKeys;
        const city1Data = pairing[cityKey1];
        const city2Data = pairing[cityKey2];
        
        if (!isLocationPoint(city1Data) || !isLocationPoint(city2Data)) {
          return (
            <div key={id} class="bg-white p-4 rounded-lg shadow relative">
              <p>Invalid pairing data format</p>
              <DeleteButton id={id} onDelete={() => handleDeletePairing(id)} />
            </div>
          );
        }
        
        return (
          <div key={id} class="bg-white p-4 rounded-lg shadow relative">
            <h3 class="font-bold text-lg mb-2">Paired on {new Date(pairing.createdAt).toLocaleDateString()}</h3>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="border-r pr-4">
                <h4 class="font-semibold">{city1Data.city || getCityNameFromKey(cityKey1)}</h4>
                <p class="text-sm">
                  Lat: {city1Data.coordinates[0].toFixed(5)}<br />
                  Lng: {city1Data.coordinates[1].toFixed(5)}
                </p>
              </div>
              
              <div>
                <h4 class="font-semibold">{city2Data.city || getCityNameFromKey(cityKey2)}</h4>
                <p class="text-sm">
                  Lat: {city2Data.coordinates[0].toFixed(5)}<br />
                  Lng: {city2Data.coordinates[1].toFixed(5)}
                </p>
              </div>
            </div>
            
            <DeleteButton id={id} onDelete={() => handleDeletePairing(id)} />
          </div>
        );
      })}
    </div>
  );
}