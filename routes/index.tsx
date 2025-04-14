import Map from "../islands/Map.tsx";
import { Head } from "$fresh/runtime.ts";

export default function Home() {
  return (
    <>
      <Head>
        <title>City Maps Comparison</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-xl">
        <h1 class="text-3xl font-bold mb-6 text-center">City Comparison</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white p-4 rounded-lg shadow">
            <Map 
              id="map-seattle"
              center={[47.6062, -122.3321]}
              zoom={12}
              title="Seattle, WA"
            />
          </div>
          
          <div class="bg-white p-4 rounded-lg shadow">
            <Map 
              id="map-portland"
              center={[45.5152, -122.6784]}
              zoom={12} 
              title="Portland, OR"
            />
          </div>
        </div>
      </div>
    </>
  );
}