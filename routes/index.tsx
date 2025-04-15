import CityMaps from "../islands/CityMaps.tsx";
import { Head } from "$fresh/runtime.ts";

export default function Home() {
  return (
    <>
      <Head>
        <title>City Maps Comparison</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-xl">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">City Comparison</h1>
          <a 
            href="/pairings" 
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            View All Pairings
          </a>
        </div>
        
        <CityMaps />
      </div>
    </>
  );
}