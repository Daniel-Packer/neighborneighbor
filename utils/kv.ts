/// <reference lib="deno.unstable" />

import type { LocationPairing, LocationPoint } from "../src/interfaces.ts";

// Utility for working with Deno KV store for paired locations


// Open the KV store
export const kv = await Deno.openKv();

// Create a new pairing
export async function createPairing(pairing: LocationPairing) {
    // Generate a unique id using timestamp - simple but effective for this demo
    const id = new Date().getTime().toString();

    // Store the pairing with a unique key
    const result = await kv.set(["pairings", id], pairing);

    return { id, success: result.ok, pairing };
}

// Get all pairings
export async function getAllPairings() {
    const pairings: { id: string; pairing: LocationPairing }[] = [];

    // List all entries with the prefix "pairings"
    const entries = kv.list({ prefix: ["pairings"] });

    for await (const entry of entries) {
        pairings.push({
            id: entry.key[1] as string,
            pairing: entry.value as LocationPairing,
        });
    }

    return pairings;
}

// Get a specific pairing by id
export async function getPairingById(id: string) {
    const result = await kv.get(["pairings", id]);
    return result.value as LocationPairing | null;
}

// Delete a pairing
export async function deletePairing(id: string) {
    const result = await kv.delete(["pairings", id]);
    return result;
}
