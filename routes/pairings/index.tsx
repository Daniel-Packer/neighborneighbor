import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAllPairings } from "../../utils/kv.ts";
import type { LocationPairing } from "../../src/interfaces.ts";
import { isLocationPoint } from "../../src/validation.ts";
import { AVAILABLE_CITIES } from "../../islands/CitySelector.tsx";

interface PairingsData {
  pairings: Array<{
    id: string;
    pairing: LocationPairing;
  }>;
}

export const handler: Handlers<PairingsData> = {
  async GET(_req, ctx) {
    try {
      const pairings = await getAllPairings();
      return ctx.render({ pairings });
    } catch (error) {
      console.error("Failed to fetch pairings:", error);
      return ctx.render({ pairings: [] });
    }
  },
};

export default function PairingsPage({ data }: PageProps<PairingsData>) {
  const { pairings } = data;
  
  // Helper function to get the city name from key
  const getCityNameFromKey = (key: string): string => {
    const city = AVAILABLE_CITIES.find(city => city.key === key);
    return city ? city.name : key;
  };
  
  return (
    <>
      <Head>
        <title>Paired Locations</title>
      </Head>
      
      <div class="p-4 mx-auto max-w-screen-xl">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">Paired Locations</h1>
          <a 
            href="/" 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to Maps
          </a>
        </div>

        {pairings.length === 0 ? (
          <div class="bg-white p-6 rounded-lg shadow text-center">
            <p>No paired locations found. Go back to the maps to create some pairs!</p>
          </div>
        ) : (
          <div class="grid gap-4 md:grid-cols-2">
            {pairings.map(({ id, pairing }) => {
              // Get the city keys in the pairing (excluding createdAt)
              const cityKeys = Object.keys(pairing).filter(key => key !== 'createdAt');
              
              if (cityKeys.length < 2) {
                return (
                  <div key={id} class="bg-white p-4 rounded-lg shadow">
                    <p>Invalid pairing data (not enough cities)</p>
                  </div>
                );
              }
              
              // Get the first two city keys (most common case)
              const [cityKey1, cityKey2] = cityKeys;
              const city1Data = pairing[cityKey1];
              const city2Data = pairing[cityKey2];
              
              if (!isLocationPoint(city1Data) || !isLocationPoint(city2Data)) {
                return (
                  <div key={id} class="bg-white p-4 rounded-lg shadow">
                    <p>Invalid pairing data format</p>
                  </div>
                );
              }
              
              return (
                <div key={id} class="bg-white p-4 rounded-lg shadow">
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}