/**
 * Script to calculate country centroids and areas from SVG path data
 * Generates country-centroids.json for use in WorldMapCountryLabelsLayer
 */

const fs = require('fs');
const path = require('path');

// Path to the world map SVG
const SVG_PATH = path.join(__dirname, '../assets/world-map-small.svg');
const OUTPUT_PATH = path.join(__dirname, '../assets/data/country-centroids.json');

/**
 * Calculate bounding box from SVG path data
 * Extracts all coordinate pairs and finds min/max x and y
 */
function getPathBoundingBox(pathData) {
  // Extract all numbers from the path (coordinates are space or comma separated)
  const numbers = pathData.match(/-?\d+\.?\d*/g);
  if (!numbers || numbers.length < 2) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Process pairs of numbers as (x, y) coordinates
  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = parseFloat(numbers[i]);
    const y = parseFloat(numbers[i + 1]);

    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    // Calculate centroid as center of bounding box
    centerX: minX + width / 2,
    centerY: minY + height / 2,
    // Calculate area (used for size-based filtering)
    area: width * height
  };
}

/**
 * Parse SVG file and extract country centroids
 */
function calculateCentroids() {
  console.log('Reading SVG file:', SVG_PATH);

  const svgContent = fs.readFileSync(SVG_PATH, 'utf8');
  const lines = svgContent.split('\n');
  const countries = [];

  for (const line of lines) {
    if (line.includes('<path') && line.includes('>')) {
      // Extract country ID from id attribute
      const idMatch = line.match(/id="([^"]*)"/);
      // Extract path data from d attribute
      const pathMatch = line.match(/d="([^"]*)"/);

      if (idMatch && pathMatch) {
        const countryId = idMatch[1];
        const pathData = pathMatch[1];

        const bbox = getPathBoundingBox(pathData);

        if (bbox && !isNaN(bbox.centerX) && !isNaN(bbox.centerY)) {
          countries.push({
            id: countryId,
            x: Math.round(bbox.centerX * 100) / 100,  // Round to 2 decimal places
            y: Math.round(bbox.centerY * 100) / 100,
            area: Math.round(bbox.area * 100) / 100,
            width: Math.round(bbox.width * 100) / 100,
            height: Math.round(bbox.height * 100) / 100
          });
        } else {
          console.warn(`⚠️  Could not calculate bbox for country: ${countryId}`);
        }
      }
    }
  }

  // Sort by area (largest first) for easier debugging
  countries.sort((a, b) => b.area - a.area);

  console.log(`\n✅ Successfully calculated centroids for ${countries.length} countries`);
  console.log('\nTop 10 largest countries by area:');
  countries.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. ${c.id.padEnd(4)} - Area: ${c.area.toFixed(2)}`);
  });

  return countries;
}

/**
 * Main execution
 */
function main() {
  try {
    const countries = calculateCentroids();

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to JSON file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(countries, null, 2));
    console.log(`\n📝 Wrote centroids to: ${OUTPUT_PATH}`);

    // Print some statistics
    const totalArea = countries.reduce((sum, c) => sum + c.area, 0);
    const avgArea = totalArea / countries.length;
    console.log(`\n📊 Statistics:`);
    console.log(`   Total countries: ${countries.length}`);
    console.log(`   Average area: ${avgArea.toFixed(2)}`);
    console.log(`   Largest country: ${countries[0].id} (${countries[0].area.toFixed(2)})`);
    console.log(`   Smallest country: ${countries[countries.length - 1].id} (${countries[countries.length - 1].area.toFixed(2)})`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
