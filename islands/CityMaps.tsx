// Generic city map component that handles any two cities
import { useSignal, useComputed } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import Map from "./Map.tsx";
import PairingControls from "./PairingControls.tsx";
import type { LocationPoint } from "../src/interfaces.ts";
import { isLocationPoint } from "../src/validation.ts";
import { LocationPairing } from "../src/interfaces.ts";

// Define types for our pairings data
interface CityLocation {
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  zoom: number;
}

// Modified interface to avoid type conflict with createdAt property
// interface LocationPairing extends Record<string, LocationPoint | string> {
//   [cityKey: string]: LocationPoint | string;
// }

interface PairingRecord {
  id: string;
  pairing: LocationPairing;
}

// Helper to validate a pairing object with dynamic city keys
function isValidPairingRecord(record: unknown, cityKeys: string[]): record is PairingRecord {
  if (typeof record !== 'object' || record === null) {
    console.log('Invalid record: not an object');
    return false;
  }
  
  if (!('id' in record) || !('pairing' in record)) {
    console.log('Invalid record: missing id or pairing property');
    return false;
  }
  
  const pairing = (record as PairingRecord).pairing;
  
  if (typeof pairing !== 'object' || pairing === null) {
    console.log('Invalid record: pairing is not an object');
    return false;
  }
  
  // Check that all required city keys exist
  for (const cityKey of cityKeys) {
    if (!(cityKey in pairing)) {
      console.log(`Invalid record: pairing missing city key "${cityKey}"`);
      return false;
    }
    
    const cityPoint = pairing[cityKey];
    
    if (!isLocationPoint(cityPoint)) {
      console.log(`Invalid record: ${cityKey} is not a valid LocationPoint`);
      return false;
    }
  }
  
  return true;
}

interface CityMapsProps {
  cities: [CityLocation, CityLocation];
  cityKeys: [string, string]; // API keys for the cities (e.g., ["seattle", "portland"])
}

export default function CityMaps({ cities, cityKeys }: CityMapsProps) {
  const [city1, city2] = cities;
  const [city1Key, city2Key] = cityKeys;
  
  const city1Point = useSignal<[number, number] | null>(null);
  const city2Point = useSignal<[number, number] | null>(null);
  const city1HoverPoint = useSignal<[number, number] | null>(null);
  const city2HoverPoint = useSignal<[number, number] | null>(null);
  const pairings = useSignal<LocationPairing[]>([]);
  const isLoading = useSignal<boolean>(false);
  const [debug, setDebug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Function to calculate matched points for city1 from hovering on city2
  const city1MatchedPoints = useComputed(() => {
    if (!city2HoverPoint.value || pairings.value.length === 0) {
      return [];
    }
    
    // Find city1 points that are paired with city2 points near the hover
    const [hlat, hlng] = city2HoverPoint.value;
    console.log(`Finding ${city1.name} points near ${city2.name} hover: ${hlat.toFixed(5)}, ${hlng.toFixed(5)}`);
    
    const matchedPoints = pairings.value
      .filter(pairing => {
        const city2Point = pairing[city2Key];
        if (!isLocationPoint(city2Point)) return false;
        
        const [plat, plng] = city2Point.coordinates;
        
        // Calculate distance - using simple Euclidean distance
        const distance = Math.sqrt(
          Math.pow(plat - hlat, 2) + Math.pow(plng - hlng, 2)
        );
        
        // Match if within a small radius
        const isNearby = distance < 0.05; // About 5km
        if (isNearby) {
          console.log(`Found nearby ${city2.name} point at ${plat.toFixed(5)}, ${plng.toFixed(5)}, distance: ${distance.toFixed(5)}`);
        }
        return isNearby;
      })
      .map(pairing => {
        const city1Point = pairing[city1Key];
        return isLocationPoint(city1Point) ? city1Point.coordinates : null;
      })
      .filter((coordinates): coordinates is [number, number] => 
        coordinates !== null);
    
    console.log(`Found ${matchedPoints.length} matching ${city1.name} points`);
    return matchedPoints;
  });

  // Function to calculate matched points for city2 from hovering on city1
  const city2MatchedPoints = useComputed(() => {
    if (!city1HoverPoint.value || pairings.value.length === 0) {
      return [];
    }
    
    // Find city2 points that are paired with city1 points near the hover
    const [hlat, hlng] = city1HoverPoint.value;
    console.log(`Finding ${city2.name} points near ${city1.name} hover: ${hlat.toFixed(5)}, ${hlng.toFixed(5)}`);
    
    const matchedPoints = pairings.value
      .filter(pairing => {
        const city1Point = pairing[city1Key];
        if (!isLocationPoint(city1Point)) return false;
        
        const [plat, plng] = city1Point.coordinates;
        
        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(plat - hlat, 2) + Math.pow(plng - hlng, 2)
        );
        
        // Match if within a small radius
        const isNearby = distance < 0.05; // About 5km
        if (isNearby) {
          console.log(`Found nearby ${city1.name} point at ${plat.toFixed(5)}, ${plng.toFixed(5)}, distance: ${distance.toFixed(5)}`);
        }
        return isNearby;
      })
      .map(pairing => {
        const city2Point = pairing[city2Key];
        return isLocationPoint(city2Point) ? city2Point.coordinates : null;
      })
      .filter((coordinates): coordinates is [number, number] => 
        coordinates !== null);
    
    console.log(`Found ${matchedPoints.length} matching ${city2.name} points`);
    return matchedPoints;
  });

  // Functions to handle point selection
  const handleCity1Select = (point: [number, number]) => {
    city1Point.value = point;
    console.log(`${city1.name} point selected: ${point[0]}, ${point[1]}`);
  };

  const handleCity2Select = (point: [number, number]) => {
    city2Point.value = point;
    console.log(`${city2.name} point selected: ${point[0]}, ${point[1]}`);
  };

  // Functions to handle hover
  const handleCity1Hover = (point: [number, number] | null) => {
    city1HoverPoint.value = point;
    if (point) {
      setDebug(`${city1.name} hover: ${point[0].toFixed(5)}, ${point[1].toFixed(5)}`);
    } else {
      setDebug(null);
    }
  };

  const handleCity2Hover = (point: [number, number] | null) => {
    city2HoverPoint.value = point;
    if (point) {
      setDebug(`${city2.name} hover: ${point[0].toFixed(5)}, ${point[1].toFixed(5)}`);
    } else {
      setDebug(null);
    }
  };

  // Create some test pairings if needed
  const createTestPairings = async () => {
    try {
      const response = await fetch("/api/pairings");
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length === 0) {
          console.log("No pairings found, creating test pairings");
          
          // Create test pairings
          await addTestPairing(
            city1.coordinates, // City 1 center
            city2.coordinates  // City 2 center
          );
          
          // Create a few more test pairings nearby
          await addTestPairing(
            [city1.coordinates[0] + 0.01, city1.coordinates[1] + 0.01], // City 1 slightly offset
            [city2.coordinates[0] + 0.01, city2.coordinates[1] + 0.01]  // City 2 slightly offset
          );
          
          await addTestPairing(
            [city1.coordinates[0] - 0.01, city1.coordinates[1] - 0.01], // City 1 slightly offset in other direction
            [city2.coordinates[0] - 0.01, city2.coordinates[1] - 0.01]  // City 2 slightly offset in other direction
          );
          
          console.log("Created test pairings");
          
          // Refresh pairings
          await fetchPairings();
        } else {
          console.log(`Found ${data.length} existing pairings`);
        }
      }
    } catch (error) {
      console.error("Error checking/creating test pairings:", error);
      setError("Failed to create test data");
    }
  };
  
  // Helper to add a test pairing
  const addTestPairing = async (city1Coords: [number, number], city2Coords: [number, number]) => {
    const pairingData: Record<string, LocationPoint | string> = {
      [city1Key]: { city: city1.name, coordinates: city1Coords },
      [city2Key]: { city: city2.name, coordinates: city2Coords },
      createdAt: new Date().toISOString(),
    };
    
    await fetch("/api/pairings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pairingData),
    });
  };

  // Fetch pairings data
  const fetchPairings = async () => {
    isLoading.value = true;
    setError(null);
    
    try {
      const response = await fetch("/api/pairings");
      if (!response.ok) {
        throw new Error(`Failed to fetch pairings: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error("API returned non-array data");
      }
      
      console.log(`Fetched ${data.length} pairings`);
      
      // Validate pairings and filter out invalid ones
      const validPairings = data.filter(pairing => {
        const isValid = isValidPairingRecord(pairing, cityKeys);
        if (!isValid) {
          console.warn("Found invalid pairing:", pairing);
        }
        return isValid;
      });
      
      console.log(`${validPairings.length} valid pairings after filtering`);
      
      // Update state
      pairings.value = validPairings.map(record => record.pairing);
      setLastFetch(new Date());
      
      if (validPairings.length > 0) {
        console.log("Sample valid pairing:", validPairings[0]);
      } else if (data.length > 0) {
        console.log("Sample invalid pairing:", data[0]);
      }
    } catch (error: unknown) {
      console.error("Error fetching pairings:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Error fetching pairings: ${errorMessage}`);
      pairings.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Create test pairings on component mount if none exist
  useEffect(() => {
    createTestPairings();
  }, []);

  // Fetch pairings data with an interval
  useEffect(() => {
    fetchPairings();
    
    // Fetch every 10 seconds
    const intervalId = setInterval(fetchPairings, 10000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white p-4 rounded-lg shadow">
          <Map 
            id={`map-${city1Key}`}
            center={city1.coordinates}
            zoom={city1.zoom}
            title={city1.name}
            selectedPoint={city1Point}
            onPointSelect={handleCity1Select}
            onPointHover={handleCity1Hover}
            matchedPoints={city2MatchedPoints}
          />
          {city2MatchedPoints.value.length > 0 && (
            <div class="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md">
              Found {city2MatchedPoints.value.length} matching points in {city2.name}
            </div>
          )}
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <Map 
            id={`map-${city2Key}`}
            center={city2.coordinates}
            zoom={city2.zoom}
            title={city2.name}
            selectedPoint={city2Point}
            onPointSelect={handleCity2Select}
            onPointHover={handleCity2Hover}
            matchedPoints={city1MatchedPoints}
          />
          {city1MatchedPoints.value.length > 0 && (
            <div class="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md">
              Found {city1MatchedPoints.value.length} matching points in {city1.name}
            </div>
          )}
        </div>
      </div>

      {debug && (
        <div class="mt-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
          {debug}
        </div>
      )}
      
      {error && (
        <div class="mt-4 p-2 bg-red-50 border border-red-200 rounded-md text-red-700">
          Error: {error}
        </div>
      )}
      
      {isLoading.value && (
        <div class="mt-4 p-2 bg-gray-50 border border-gray-200 rounded-md text-center">
          Loading pairings...
        </div>
      )}
      
      {!isLoading.value && pairings.value.length === 0 && (
        <div class="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-center">
          No pairings available yet. Create some!
        </div>
      )}
      
      {!isLoading.value && pairings.value.length > 0 && (
        <div class="mt-4 p-2 bg-green-50 border border-green-200 rounded-md text-center">
          {pairings.value.length} pairings loaded and available
          {lastFetch && (
            <span class="text-xs block text-gray-500">
              Last updated: {lastFetch.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      <PairingControls
        city1={{
          key: city1Key,
          name: city1.name,
          point: city1Point
        }}
        city2={{
          key: city2Key, 
          name: city2.name,
          point: city2Point
        }}
        onPairingCreated={() => {
          // Refresh pairings when a new one is created
          fetchPairings();
        }}
      />
    </>
  );
}