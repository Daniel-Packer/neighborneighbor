import NYCMap from "../islands/Map.tsx";

export default function Home() {
  return (
    <div class="p-4 mx-auto max-w-screen-xl">
      <h1 class="text-2xl font-bold mb-4">NYC Census Blocks</h1>
      <NYCMap onBlockClick={(blockId) => {
        // This runs client-side when a block is clicked
        console.log("Census block clicked:", blockId);
      }} />
    </div>
  );
}