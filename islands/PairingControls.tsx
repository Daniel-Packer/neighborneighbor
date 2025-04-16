import { Signal } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";
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
  const [autoPairEnabled, setAutoPairEnabled] = useState(false);
  
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
      } else {
        alert("Failed to pair locations. Please try again.");
      }
    } catch (error) {
      console.error("Error pairing locations:", error);
      alert("An error occurred while pairing locations.");
    }
  };
  
  // Effect to handle auto-pairing when both points are selected
  useEffect(() => {
    if (autoPairEnabled && city1.point.value && city2.point.value) {
      // Auto-create the pairing
      handlePairLocations();
    }
  }, [city1.point.value, city2.point.value, autoPairEnabled]);

  return (
    <div class="mt-6 flex flex-col items-center">
      <div class="flex items-center justify-between gap-4 mb-4 w-full max-w-md">
        <button 
          onClick={handlePairLocations}
          disabled={!city1.point.value || !city2.point.value || autoPairEnabled}
          class="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create {city1.name}-{city2.name} Pairing
        </button>
        
        <div class="flex items-center gap-2">
          <label for="auto-pair-toggle" class="text-sm font-medium text-gray-700 cursor-pointer">
            Auto-pair
          </label>
          <button 
            onClick={() => setAutoPairEnabled(!autoPairEnabled)} 
            class="relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            role="switch"
            aria-checked={autoPairEnabled}
            id="auto-pair-toggle"
          >
            <span class={`${autoPairEnabled ? 'bg-blue-600' : 'bg-gray-200'} absolute h-6 w-11 rounded-full transition`}></span>
            <span class={`${autoPairEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}></span>
          </button>
        </div>
      </div>
      
      <div class="text-center text-sm text-gray-600">
        {autoPairEnabled ? (
          <p>Auto-pairing enabled. Click on both maps to automatically create pairings.</p>
        ) : (
          <p>Click on both maps to select points, then click the button to save the connection.</p>
        )}
        <p class="mt-2">Hover over areas to see corresponding paired locations highlighted.</p>
      </div>
    </div>
  );
}