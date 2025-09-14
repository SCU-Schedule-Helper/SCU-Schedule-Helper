export function getRatingColor(
    rating: number | null | undefined,
    ratingMin: number,
    ratingMax: number,
    goodValuesAreHigher: boolean) {
    if (nullOrUndefined(rating)) return "rgba(0, 0, 0, 0.5)";
    if (rating < ratingMin) rating = ratingMin;
    if (rating > ratingMax) rating = ratingMax;
    const greenShade: [number, number, number] = [66, 134, 67];
    const yellowShade: [number, number, number] = [255, 165, 0];
    const redShade: [number, number, number] = [194, 59, 34];
    const ratingMid = ratingMin + (ratingMax - ratingMin) / 2;
    if (rating <= ratingMid && goodValuesAreHigher) {
        return interpolateColor(
            redShade,
            yellowShade,
            (rating - ratingMin) / (ratingMid - ratingMin)
        );
    }
    if (rating <= ratingMid && !goodValuesAreHigher) {
        return interpolateColor(
            greenShade,
            yellowShade,
            (rating - ratingMin) / (ratingMid - ratingMin)
        );
    }
    if (goodValuesAreHigher) {
        return interpolateColor(
            yellowShade,
            greenShade,
            (rating - ratingMid) / (ratingMax - ratingMid)
        );
    }
    return interpolateColor(
        yellowShade,
        redShade,
        (rating - ratingMid) / (ratingMax - ratingMid)
    );
}

export function getPercentile(value: number | null | undefined, array?: number[] | null): number | null {
    if (!value || !array || array.length === 0) return null;
    return bsFind(array, value) / array.length;
}

function bsFind(sortedArray: number[], target: number): number {
    let left = 0;
    let right = sortedArray.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (sortedArray[mid] === target) return mid;
        if (sortedArray[mid]! < target) left = mid + 1;
        else right = mid - 1;
    }
    return left;
}


function interpolateColor(color1: [number, number, number], color2: [number, number, number], ratio: number): string {
    const r = Math.round(color1[0] + ratio * (color2[0] - color1[0]));
    const g = Math.round(color1[1] + ratio * (color2[1] - color1[1]));
    const b = Math.round(color1[2] + ratio * (color2[2] - color1[2]));
    return `rgba(${r}, ${g}, ${b}, 1)`;
}

export function nullOrUndefined(value: any): value is null | undefined {
    return value === null || value === undefined || typeof value === "number" && isNaN(value);
}
