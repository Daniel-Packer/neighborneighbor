import { Head } from "$fresh/runtime.ts";
import CityMapWrapper from "../islands/CityMapWrapper.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>City Maps Comparison</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-xl">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold">City Comparison</h1>
        </div>
        
        <CityMapWrapper 
          initialLeftCityKey="seattle" 
          initialRightCityKey="portland" 
        />
      </div>
    </>
  );
}