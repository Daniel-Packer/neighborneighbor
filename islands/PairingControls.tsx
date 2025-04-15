import { Signal } from "@preact/signals";

interface PairingControlsProps {
  seattlePoint: Signal<[number, number] | null>;
  portlandPoint: Signal<[number, number] | null>;
  onPairingCreated?: () => void; // Add callback for when pairing is created
}

export default function PairingControls({ seattlePoint, portlandPoint, onPairingCreated }: PairingControlsProps) {
  const handlePairLocations = async () => {
    if (!seattlePoint.value || !portlandPoint.value) return;
    
    try {
      const response = await fetch("/api/pairings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seattle: {
            city: "Seattle, WA",
            coordinates: seattlePoint.value,
          },
          portland: {
            city: "Portland, OR",
            coordinates: portlandPoint.value,
          },
          createdAt: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        // Reset selections after successful pairing
        seattlePoint.value = null;
        portlandPoint.value = null;
        
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
      <button 
        onClick={handlePairLocations}
        disabled={!seattlePoint.value || !portlandPoint.value}
        class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Pair Selected Locations
      </button>
      
      <div class="mt-6 text-center text-sm text-gray-600">
        <p>Click on both maps to select points, then click "Pair" to save the connection.</p>
        <p class="mt-2">Hover over areas to see corresponding paired locations highlighted.</p>
      </div>
    </div>
  );
}