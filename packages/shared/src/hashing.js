import { keccak256, stringToHex } from "viem";
function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => [key, sortValue(entry)]));
    }
    return value;
}
export function stableStringify(value) {
    return JSON.stringify(sortValue(value));
}
export function buildCanonicalHash(value) {
    return keccak256(stringToHex(stableStringify(value)));
}
//# sourceMappingURL=hashing.js.map