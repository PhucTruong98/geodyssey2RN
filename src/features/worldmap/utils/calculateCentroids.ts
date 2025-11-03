/**
 * Utility to calculate country centroids from SVG path data
 */

export interface CountryCentroid {
  id: string;
  x: number;
  y: number;
  area: number;
  width: number;
  height: number;
}

export interface PathWithBbox {
  id: string;
  bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null;
}

/**
 * Calculate centroids from SVG country paths with pre-calculated bounding boxes
 * Takes paths that have already had their bboxes calculated
 */
export function calculateCentroids(countryPaths: PathWithBbox[]): CountryCentroid[] {
  const countries: CountryCentroid[] = [];

  for (const country of countryPaths) {
    if (!country.bbox) {
      console.warn(`No bbox for country: ${country.id}`);
      continue;
    }

    const { minX, minY, maxX, maxY, width, height } = country.bbox;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    const area = width * height;

    countries.push({
      id: country.id,
      x: Math.round(centerX * 100) / 100,
      y: Math.round(centerY * 100) / 100,
      area: Math.round(area * 100) / 100,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
    });
  }

  // Sort by area (largest first) for consistent ordering
  countries.sort((a, b) => b.area - a.area);

  return countries;
}
