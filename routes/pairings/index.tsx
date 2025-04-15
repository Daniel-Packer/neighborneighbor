import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { getAllPairings } from "../../utils/kv.ts";
import type { LocationPairing } from "../../src/interfaces.ts";
import PairingList from "../../islands/PairingList.tsx";

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

        <PairingList initialPairings={pairings} />
      </div>
    </>
  );
}