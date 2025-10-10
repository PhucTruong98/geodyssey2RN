#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Paths
const inputPath = path.join(__dirname, '../assets/data/ne_110m_admin_0_countries.json');
const outputPath = path.join(__dirname, '../assets/world-map-simplified2.svg');

// Read and parse GeoJSON
const geojson = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// SVG dimensions (matching world-map.svg)
const width = 1000;
const height = 482;

// Calculate bounds from GeoJSON
let minLon = Infinity, maxLon = -Infinity;
let minLat = Infinity, maxLat = -Infinity;

function getBounds(coords) {
  if (typeof coords[0] === 'number') {
    // Single coordinate [lon, lat]
    minLon = Math.min(minLon, coords[0]);
    maxLon = Math.max(maxLon, coords[0]);
    minLat = Math.min(minLat, coords[1]);
    maxLat = Math.max(maxLat, coords[1]);
  } else {
    // Array of coordinates
    coords.forEach(getBounds);
  }
}

// Get bounds from all features
geojson.features.forEach(feature => {
  if (feature.geometry && feature.geometry.coordinates) {
    getBounds(feature.geometry.coordinates);
  }
});

console.log('Bounds:', { minLon, maxLon, minLat, maxLat });

// Simple equirectangular projection (better for simplified map)
function projectEquirectangular(lon, lat) {
  const x = ((lon - minLon) / (maxLon - minLon)) * width;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height;

  return [x, y];
}

// Convert coordinates to SVG path
function coordsToPath(coords) {
  if (typeof coords[0] === 'number') {
    const [x, y] = projectEquirectangular(coords[0], coords[1]);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return coords.map(coordsToPath).join(' ');
}

// Build SVG path for a geometry
function geometryToPath(geometry) {
  if (!geometry || !geometry.coordinates) return '';

  const coords = geometry.coordinates;
  let pathData = '';

  if (geometry.type === 'Polygon') {
    // First ring is exterior, others are holes
    coords.forEach((ring, i) => {
      const points = ring.map(coord => projectEquirectangular(coord[0], coord[1]));
      if (points.length > 0) {
        pathData += `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} `;
        for (let j = 1; j < points.length; j++) {
          pathData += `${points[j][0].toFixed(2)},${points[j][1].toFixed(2)} `;
        }
        pathData += 'Z ';
      }
    });
  } else if (geometry.type === 'MultiPolygon') {
    coords.forEach(polygon => {
      polygon.forEach((ring, i) => {
        const points = ring.map(coord => projectEquirectangular(coord[0], coord[1]));
        if (points.length > 0) {
          pathData += `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)} `;
          for (let j = 1; j < points.length; j++) {
            pathData += `${points[j][0].toFixed(2)},${points[j][1].toFixed(2)} `;
          }
          pathData += 'Z ';
        }
      });
    });
  }

  return pathData.trim();
}

// Generate SVG paths
const svgPaths = geojson.features
  .filter(feature => feature.geometry)
  .map(feature => {
    const pathData = geometryToPath(feature.geometry);
    const id = feature.properties.ISO_A2 || feature.properties.ADM0_A3 || 'unknown';
    const name = feature.properties.NAME || 'Unknown';

    if (!pathData) return '';

    return `<path d="${pathData}" id="${id}" data-name="${name}"/>`;
  })
  .filter(path => path)
  .join('\n');

// Create SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" x="0px"
     y="0px"
     width="${width}"
     height="${height}"
     viewBox="0 0 ${width} ${height}">
${svgPaths}
</svg>`;

// Write to file
fs.writeFileSync(outputPath, svg, 'utf8');

console.log(`✅ Created simplified SVG with ${geojson.features.length} countries`);
console.log(`📁 Output: ${outputPath}`);
