import { Signal } from "@preact/signals";
import type { LocationPoint } from "../src/interfaces.ts";

interface CityData {
  key: string;
  name: string;
  point: Signal<[number, number] | null>;
}

interface PairingControlsProps {
  city1: CityData;
  city2: CityData;
  onPairingCreated?: () => void;
}

// Define a type for the pairing data to avoid using 'any'
interface PairingData {
  createdAt: string;
  [cityKey: string]: LocationPoint | string;
}

export default function PairingControls({ city1, city2, onPairingCreated }: PairingControlsProps) {
  const handlePairLocations = async () => {
    if (!city1.point.value || !city2.point.value) return;
    
    try {
      // Create a dynamic pairing object with the city keys
      const pairingData: PairingData = {
        createdAt: new Date().toISOString(),
      };
      
      // Add city data using the provided keys
      pairingData[city1.key] = {
        city: city1.name,
        coordinates: city1.point.value,
      };
      
      pairingData[city2.key] = {
        city: city2.name,
        coordinates: city2.point.value,
      };
      
      const response = await fetch("/api/pairings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pairingData),
      });
      
      if (response.ok) {
        // Reset selections after successful pairing
        city1.point.value = null;
        city2.point.value = null;
        
        // Call the callback to notify parent component
        onPairingCreated?.();
        
        alert("Locations paired successfully!");
      } else {
        alert("Failed to pair locations. Please try again.");
      }
    } catch (error) {
      console.error("Error pairing locations:", error);
      alert("An error occurred while pairing locations.");
    }
  };

  return (
    <div class="mt-6 flex flex-col items-center">
      <div class="flex flex-wrap justify-center gap-4 mb-4">
        <div class="px-4 py-2 bg-gray-100 rounded-lg">
          <span class="font-semibold">{city1.name}:</span> {city1.point.value ? 
            `${city1.point.value[0].toFixed(5)}, ${city1.point.value[1].toFixed(5)}` : 
            'Not selected'}
        </div>
        
        <div class="px-4 py-2 bg-gray-100 rounded-lg">
          <span class="font-semibold">{city2.name}:</span> {city2.point.value ? 
            `${city2.point.value[0].toFixed(5)}, ${city2.point.value[1].toFixed(5)}` : 
            'Not selected'}
        </div>
      </div>
      
      <button 
        onClick={handlePairLocations}
        disabled={!city1.point.value || !city2.point.value}
        class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create {city1.name}-{city2.name} Pairing
      </button>
      
      <div class="mt-6 text-center text-sm text-gray-600">
        <p>Click on both maps to select points, then click the button to save the connection.</p>
        <p class="mt-2">Hover over areas to see corresponding paired locations highlighted.</p>
      </div>
    </div>
  );
}