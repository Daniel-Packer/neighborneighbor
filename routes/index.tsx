import CityMaps from "../islands/CityMaps.tsx";
import { Head } from "$fresh/runtime.ts";

// Define the CityLocation type
type CityLocation = {
  name: string;
  coordinates: [number, number];
  zoom: number;
};

export default function Home() {
  // Define available city pairs
  const cityPairs = [
    // {
    //   cities: [
    //     { name: "Seattle, WA", coordinates: [47.6062, -122.3321] as [number, number], zoom: 12 },
    //     { name: "Portland, OR", coordinates: [45.5152, -122.6784] as [number, number], zoom: 12 }
    //   ],
    //   keys: ["seattle", "portland"] as [string, string]
    // },
    // Example of another city pair that could be added
    {
      cities: [
        { name: "New York, NY", coordinates: [40.7128, -74.0060] as [number, number], zoom: 12 },
        { name: "Boston, MA", coordinates: [42.3601, -71.0589] as [number, number], zoom: 12 }
      ],
      keys: ["newyork", "boston"] as [string, string]
    }
  ];
  
  // Use the first pair as default
  const activePair = cityPairs[0];

  return (
    <>
      <Head>
        <title>City Maps Comparison</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-xl">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">City Comparison</h1>
          <div class="flex gap-2">
            {/* Placeholder for city pair selector */}
            {/*cityPairs.length > 1 && (
              <select 
                class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cityPairs.map((pair, index) => (
                  <option value={index}>
                    {pair.cities[0].name} — {pair.cities[1].name}
                  </option>
                ))}
              </select>
            )*/}
            <a 
              href="/pairings" 
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              View All Pairings
            </a>
          </div>
        </div>
        
        <CityMaps 
          cities={activePair.cities as [CityLocation, CityLocation]}
          cityKeys={activePair.keys}
        />
      </div>
    </>
  );
}