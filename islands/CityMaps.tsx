// New island component that contains both maps
import { useSignal, useComputed } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import Map from "./Map.tsx";
import PairingControls from "./PairingControls.tsx";

// Define types for our pairings
interface LocationPoint {
  city: string;
  coordinates: [number, number];
}

interface LocationPairing {
  id?: string;
  seattle: LocationPoint;
  portland: LocationPoint;
  createdAt: string;
}

// Helper to validate a pairing object
function isValidPairing(pairing: unknown): pairing is LocationPairing {
  return (
    typeof pairing === 'object' &&
    pairing !== null &&
    'seattle' in pairing &&
    'portland' in pairing &&
    typeof pairing.seattle === 'object' && 
    pairing.seattle !== null &&
    'coordinates' in pairing.seattle &&
    Array.isArray(pairing.seattle.coordinates) &&
    pairing.seattle.coordinates.length === 2 &&
    typeof pairing.seattle.coordinates[0] === 'number' &&
    typeof pairing.seattle.coordinates[1] === 'number' &&
    typeof pairing.portland === 'object' && 
    pairing.portland !== null &&
    'coordinates' in pairing.portland &&
    Array.isArray(pairing.portland.coordinates) &&
    pairing.portland.coordinates.length === 2 &&
    typeof pairing.portland.coordinates[0] === 'number' &&
    typeof pairing.portland.coordinates[1] === 'number'
  );
}

export default function CityMaps() {
  const seattlePoint = useSignal<[number, number] | null>(null);
  const portlandPoint = useSignal<[number, number] | null>(null);
  const seattleHoverPoint = useSignal<[number, number] | null>(null);
  const portlandHoverPoint = useSignal<[number, number] | null>(null);
  const pairings = useSignal<LocationPairing[]>([]);
  const isLoading = useSignal<boolean>(false);
  const [debug, setDebug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Function to calculate matched points
  const seattleMatchedPoints = useComputed(() => {
    if (!portlandHoverPoint.value || pairings.value.length === 0) {
      return [];
    }
    
    // Find Seattle points that are paired with Portland points near the hover
    const [hlat, hlng] = portlandHoverPoint.value;
    console.log(`Finding Seattle points near Portland hover: ${hlat.toFixed(5)}, ${hlng.toFixed(5)}`);
    console.log(`Total pairings available: ${pairings.value.length}`);
    
    const matchedPoints = pairings.value
      .filter(pairing => {
        // We know all pairings are valid because we filtered them when loading
        const [plat, plng] = pairing.portland.coordinates;
        
        // Calculate distance - using simple Euclidean distance for demo
        // In production you might want a more sophisticated distance calculation
        const distance = Math.sqrt(
          Math.pow(plat - hlat, 2) + Math.pow(plng - hlng, 2)
        );
        
        // Match if within a small radius (adjust as needed)
        const isNearby = distance < 0.05; // About 5km
        if (isNearby) {
          console.log(`Found nearby Portland point at ${plat.toFixed(5)}, ${plng.toFixed(5)}, distance: ${distance.toFixed(5)}`);
        }
        return isNearby;
      })
      .map(pairing => pairing.seattle.coordinates);
    
    console.log(`Found ${matchedPoints.length} matching Seattle points`);
    return matchedPoints;
  });

  // Compute Portland matched points based on Seattle hover
  const portlandMatchedPoints = useComputed(() => {
    if (!seattleHoverPoint.value || pairings.value.length === 0) {
      return [];
    }
    
    // Find Portland points that are paired with Seattle points near the hover
    const [hlat, hlng] = seattleHoverPoint.value;
    console.log(`Finding Portland points near Seattle hover: ${hlat.toFixed(5)}, ${hlng.toFixed(5)}`);
    console.log(`Total pairings available: ${pairings.value.length}`);
    
    const matchedPoints = pairings.value
      .filter(pairing => {
        const [slat, slng] = pairing.seattle.coordinates;
        
        // Calculate distance
        const distance = Math.sqrt(
          Math.pow(slat - hlat, 2) + Math.pow(slng - hlng, 2)
        );
        
        // Match if within a small radius (adjust as needed)
        const isNearby = distance < 0.05; // About 5km
        if (isNearby) {
          console.log(`Found nearby Seattle point at ${slat.toFixed(5)}, ${slng.toFixed(5)}, distance: ${distance.toFixed(5)}`);
        }
        return isNearby;
      })
      .map(pairing => pairing.portland.coordinates);
    
    console.log(`Found ${matchedPoints.length} matching Portland points`);
    return matchedPoints;
  });

  // Functions to handle point selection
  const handleSeattleSelect = (point: [number, number]) => {
    seattlePoint.value = point;
    console.log(`Seattle point selected: ${point[0]}, ${point[1]}`);
  };

  const handlePortlandSelect = (point: [number, number]) => {
    portlandPoint.value = point;
    console.log(`Portland point selected: ${point[0]}, ${point[1]}`);
  };

  // Functions to handle hover
  const handleSeattleHover = (point: [number, number] | null) => {
    seattleHoverPoint.value = point;
    if (point) {
      setDebug(`Seattle hover: ${point[0].toFixed(5)}, ${point[1].toFixed(5)}`);
    } else {
      setDebug(null);
    }
  };

  const handlePortlandHover = (point: [number, number] | null) => {
    portlandHoverPoint.value = point;
    if (point) {
      setDebug(`Portland hover: ${point[0].toFixed(5)}, ${point[1].toFixed(5)}`);
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
            [47.6062, -122.3321], // Seattle center
            [45.5152, -122.6784]  // Portland center
          );
          
          await addTestPairing(
            [47.6162, -122.3421], // Seattle slightly north
            [45.5252, -122.6884]  // Portland slightly north
          );
          
          await addTestPairing(
            [47.5962, -122.3221], // Seattle slightly south
            [45.5052, -122.6684]  // Portland slightly south
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
  const addTestPairing = async (seattleCoords: [number, number], portlandCoords: [number, number]) => {
    await fetch("/api/pairings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seattle: { city: "Seattle, WA", coordinates: seattleCoords },
        portland: { city: "Portland, OR", coordinates: portlandCoords },
        createdAt: new Date().toISOString(),
      }),
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
        const isValid = isValidPairing(pairing);
        if (!isValid) {
          console.warn("Found invalid pairing:", pairing);
        }
        return isValid;
      });
      
      console.log(`${validPairings.length} valid pairings after filtering`);
      
      // Update state
      pairings.value = validPairings;
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
            id="map-seattle"
            center={[47.6062, -122.3321]}
            zoom={12}
            title="Seattle, WA"
            selectedPoint={seattlePoint}
            onPointSelect={handleSeattleSelect}
            onPointHover={handleSeattleHover}
            matchedPoints={portlandMatchedPoints}
          />
          {portlandMatchedPoints.value.length > 0 && (
            <div class="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md">
              Found {portlandMatchedPoints.value.length} matching points in Portland
            </div>
          )}
        </div>
        
        <div class="bg-white p-4 rounded-lg shadow">
          <Map 
            id="map-portland"
            center={[45.5152, -122.6784]}
            zoom={12} 
            title="Portland, OR"
            selectedPoint={portlandPoint}
            onPointSelect={handlePortlandSelect}
            onPointHover={handlePortlandHover}
            matchedPoints={seattleMatchedPoints}
          />
          {seattleMatchedPoints.value.length > 0 && (
            <div class="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-md">
              Found {seattleMatchedPoints.value.length} matching points in Seattle
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
        seattlePoint={seattlePoint}
        portlandPoint={portlandPoint}
        onPairingCreated={() => {
          // Refresh pairings when a new one is created
          fetchPairings();
        }}
      />
    </>
  );
}