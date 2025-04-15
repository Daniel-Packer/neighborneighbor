import type { LocationPoint } from "./interfaces.ts";

// Type guard function to check if a value is a LocationPoint
export function isLocationPoint(value: unknown): value is LocationPoint {
    return (
        typeof value === "object" &&
        value !== null &&
        "city" in value &&
        "coordinates" in value &&
        Array.isArray((value as LocationPoint).coordinates) &&
        (value as LocationPoint).coordinates.length === 2 &&
        typeof (value as LocationPoint).coordinates[0] === "number" &&
        typeof (value as LocationPoint).coordinates[1] === "number"
    );
}