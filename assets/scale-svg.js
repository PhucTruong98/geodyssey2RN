// scale-svg.js
const fs = require('fs');
const { parse } = require('node-html-parser'); // optional lightweight HTML parser OR use regex for simple cases
const svgpath = require('svgpath');

const input = 'world-map.svg';
const output = 'world-map@2x.svg';
const scale = 2;

let svg = fs.readFileSync(input, 'utf8');

// 1) Update width/height attributes and viewBox if present
svg = svg.replace(/(<svg[^>]*\swidth=")([^"]+)(")/, (_, a, w, b) => a + (parseFloat(w) * scale) + b);
svg = svg.replace(/(<svg[^>]*\sheight=")([^"]+)(")/, (_, a, h, b) => a + (parseFloat(h) * scale) + b);

// If viewBox present as "minX minY width height" you can scale the latter two numbers or multiply all: 
svg = svg.replace(/(<svg[^>]*\sviewBox=")([^"]+)(")/, (_, a, vb, b) => {
  const parts = vb.split(/\s+|,/).map(Number);
  if (parts.length === 4) {
    // multiply all components by scale (or only width/height depending on desired approach)
    return a + parts.map(n => (n * scale).toString()).join(' ') + b;
  }
  return _;
});

// 2) Replace all path d attributes using svgpath
svg = svg.replace(/<path\b([^>]*?)\bd="([^"]+)"([^>]*?)>/gi, (match, before, d, after) => {
  try {
    const newD = svgpath(d).scale(scale).toString();
    return `<path${before} d="${newD}"${after}>`;
  } catch (err) {
    console.error('Failed scaling path:', err);
    return match;
  }
});

// 3) Also handle <circle>, <rect>, <ellipse>, <line>, <polyline>, <polygon> if they have numeric attrs
svg = svg.replace(/(<rect\b[^>]*\bwidth=")([^"]+)(")/gi, (_, a, v, b) => a + (parseFloat(v) * scale) + b);
svg = svg.replace(/(<rect\b[^>]*\bheight=")([^"]+)(")/gi, (_, a, v, b) => a + (parseFloat(v) * scale) + b);
// Add others similarly (cx, cy, r, x, y, points, etc.) as needed

fs.writeFileSync(output, svg, 'utf8');
console.log('Wrote', output);
