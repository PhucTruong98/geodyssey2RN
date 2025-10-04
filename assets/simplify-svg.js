// #!/usr/bin/env node
// // decimate-preserve-subpaths.js
// // Usage: node decimate-preserve-subpaths.js input.svg output.svg
// //
// // This script assumes most subpaths are of the form:
// //   M x,y x,y x,y [Z]
// // It preserves multiple M...Z subpaths and decimates points inside each subpath.
// // If a subpath contains other SVG command letters (C, L, A, etc.), it will leave that subpath untouched.

// const fs = require('fs');

// if (process.argv.length < 4) {
//   console.error('Usage: node decimate-preserve-subpaths.js input.svg output.svg');
//   process.exit(1);
// }

// const input = process.argv[2];
// const output = process.argv[3];

// if (!fs.existsSync(input)) {
//   console.error('Input file not found:', input);
//   process.exit(1);
// }

// const svg = fs.readFileSync(input, 'utf8');

// // parse a chunk that belongs to one subpath (the string after an M or m up to but not including next M/m)
// // returns { points: [[x,y],...], closed: bool, ok: bool, rawBefore?:string }
// // ok==false if chunk contains other commands we don't know how to handle (we'll skip simplifying it)
// function parseSubpathChunk(chunk) {
//   // detect and remove trailing Z/z in this chunk
//   let closed = false;
//   // Z might be with/without whitespace. Remove all Z/z occurrences at end or isolated - but be conservative:
//   if (/[Zz]\s*$/.test(chunk)) {
//     closed = true;
//     chunk = chunk.replace(/[Zz]\s*$/, '').trim();
//   }

//   // if chunk contains any SVG letter commands other than whitespace, digits, commas, dots, signs, or exponent, bail out
//   // Allowed characters: digits, whitespace, comma, dot, + - e E
//   // If any letter other than allowed (M,m,L,l,H,V,C,Q,T,S,A,Z) appears inside chunk, treat as complex.
//   // But since we are splitting on M earlier, we just check for any letters a-z/A-Z inside chunk => complex
//   if (/[A-Za-z]/.test(chunk)) {
//     // there are other command letters inside this subpath (like L, C, A) — unsafe to decimate with this simple parser
//     return { ok: false };
//   }

//   // tokens are expected to be 'x,y' pairs separated by whitespace
//   const tokens = chunk.split(/\s+/).filter(Boolean);
//   const pts = [];
//   for (const tok of tokens) {
//     // accept forms like "305.83,197.63" or "305.83,197.63," (defensive)
//     const cleaned = tok.replace(/,+$/,'');
//     const parts = cleaned.split(',');
//     if (parts.length >= 2) {
//       const x = parseFloat(parts[0]);
//       const y = parseFloat(parts[1]);
//       if (!Number.isNaN(x) && !Number.isNaN(y)) {
//         pts.push([x, y]);
//       } else {
//         // malformed number -> bail
//         return { ok: false };
//       }
//     } else {
//       // not a pair -> bail
//       return { ok: false };
//     }
//   }
//   return { ok: true, points: pts, closed };
// }

// // decimate keep first, every other, and last
// function decimate(points) {
//   if (!points || points.length <= 2) return points.slice();
//   const out = [];
//   out.push(points[0]);
//   for (let i = 1; i < points.length - 1; i += 2) {
//     out.push(points[i]);
//   }
//   const last = points[points.length - 1];
//   const lastOut = out[out.length - 1];
//   if (!lastOut || lastOut[0] !== last[0] || lastOut[1] !== last[1]) out.push(last);
//   return out;
// }

// function fmt(n) {
//   return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4))).replace(/\.?0+$/, '');
// }

// // Build d string for a subpath from command (M/m), points array, and closed flag.
// // We'll output as "M x,y x,y ... Z" style; preserves M vs m case.
// function buildSubpath(cmd, points, closed) {
//   if (!points || points.length === 0) return '';
//   const pairs = points.map(p => `${fmt(p[0])},${fmt(p[1])}`);
//   const first = `${cmd} ${pairs[0]}`;
//   const rest = pairs.length > 1 ? ' ' + pairs.slice(1).join(' ') : '';
//   return first + rest + (closed ? ' Z' : '');
// }

// // Main transform per <path d="..."> occurrence
// const newSvg = svg.replace(/(<path\b[^>]*\bd=")([^"]+)(")/gi, (full, prefix, dstr, suffix) => {
//   try {
//     const orig = dstr.trim();

//     // Quick check: if there is NO M/m, leave as-is
//     if (!/[Mm]/.test(orig)) return full;

//     // We'll reconstruct newD by scanning for M/m subpath groups:
//     // regex: find all occurrences of (M or m) and the subsequent chars up to next M/m (or end)
//     const subRegex = /([Mm])([^Mm]*)/g;
//     let match;
//     let rebuiltParts = [];
//     let anyChanged = false;
//     let fallbackToOriginal = false;

//     while ((match = subRegex.exec(orig)) !== null) {
//       const cmd = match[1];             // 'M' or 'm'
//       const chunk = match[2] || '';     // everything after M up to next M

//       // parse chunk for pairs and Z
//       const parsed = parseSubpathChunk(chunk);
//       if (!parsed.ok) {
//         // can't safely parse this subpath (it contains other commands or malformed tokens)
//         // keep the original substring exactly as it was (cmd + chunk), preserving spacing/characters
//         rebuiltParts.push(cmd + chunk);
//         // mark fallback (we didn't simplify this subpath), but that's OK — we don't abort entire path
//         continue;
//       }

//       const pts = parsed.points;
//       // trivial: if too few points, keep original
//       if (!pts || pts.length < 2) {
//         rebuiltParts.push(cmd + chunk + (parsed.closed ? ' Z' : ''));
//         continue;
//       }

//       // decimate this subpath
//       const dec = decimate(pts);

//       // if decimation didn't reduce points, keep original to avoid changing coordinates unexpectedly
//       if (dec.length >= pts.length) {
//         rebuiltParts.push(cmd + chunk + (parsed.closed ? ' Z' : ''));
//         continue;
//       }

//       anyChanged = true;
//       const rebuilt = buildSubpath(cmd, dec, parsed.closed);
//       // push rebuilt (space-normalized)
//       rebuiltParts.push(rebuilt);
//     }

//     // If nothing changed, return original unchanged
//     if (!anyChanged) return full;

//     const newD = rebuiltParts.join(' ');
//     return prefix + newD + suffix;
//   } catch (e) {
//     console.warn('Error processing path, leaving original:', e && e.message);
//     return full;
//   }
// });

// fs.writeFileSync(output, newSvg, 'utf8');
// console.log('Wrote simplified SVG to', output);


// decimate-preserve-subpaths-nth.js
// Usage: node decimate-preserve-subpaths-nth.js input.svg output.svg [n]
//
// This script preserves M...Z subpaths and simplifies each subpath by keeping
// 1 point out of every `n` points (indices 0, n, 2n, ...). Always preserves
// the first and last point of each subpath to avoid breaking polygons.
//
// If a subpath contains other SVG commands (letters) besides plain "x,y" pairs,
// that subpath is left untouched for safety.

const fs = require('fs');

if (process.argv.length < 4) {
  console.error('Usage: node decimate-preserve-subpaths-nth.js input.svg output.svg [n]');
  process.exit(1);
}

const input = process.argv[2];
const output = process.argv[3];
let n = parseInt(process.argv[4] || '2', 10);

if (!fs.existsSync(input)) {
  console.error('Input file not found:', input);
  process.exit(1);
}

if (!Number.isFinite(n) || n < 1) n = 2; // fallback

const svg = fs.readFileSync(input, 'utf8');

// parse a chunk that belongs to one subpath (the string after an M or m up to but not including next M/m)
// returns { points: [[x,y],...], closed: bool, ok: bool }
// ok==false if chunk contains other commands we don't know how to handle (we'll skip simplifying it)
function parseSubpathChunk(chunk) {
  // detect and remove trailing Z/z in this chunk
  let closed = false;
  if (/[Zz]\s*$/.test(chunk)) {
    closed = true;
    chunk = chunk.replace(/[Zz]\s*$/, '').trim();
  }

  // If chunk contains any letters (commands) then it's complex (contains L, C, A, etc.) — don't attempt to simplify
  if (/[A-Za-z]/.test(chunk)) {
    return { ok: false };
  }

  // tokens are expected to be 'x,y' pairs separated by whitespace
  const tokens = chunk.split(/\s+/).filter(Boolean);
  const pts = [];
  for (const tok of tokens) {
    const cleaned = tok.replace(/,+$/,'');
    const parts = cleaned.split(',');
    if (parts.length >= 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        pts.push([x, y]);
      } else {
        return { ok: false };
      }
    } else {
      return { ok: false };
    }
  }
  return { ok: true, points: pts, closed };
}

// Keep 1 point out of every `n` points (indices 0, n, 2n, ...) but always keep first and last.
function decimateNth(points, n) {
  if (!points || points.length <= 2) return points.slice();
  if (n <= 1) return points.slice(); // keep all
  const out = [];
  const len = points.length;

  // always keep first
  out.push(points[0]);

  // keep points at indices multiple of n (but avoid duplicating first/last)
  for (let i = n; i < len - 1; i += n) {
    out.push(points[i]);
  }

  // Always ensure last point is included.
  const last = points[len - 1];
  const lastOut = out[out.length - 1];
  if (!lastOut || lastOut[0] !== last[0] || lastOut[1] !== last[1]) out.push(last);

  return out;
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(4))).replace(/\.?0+$/, '');
}

// Build subpath string like "M x,y x,y ... Z" preserving M/m case
function buildSubpath(cmd, points, closed) {
  if (!points || points.length === 0) return '';
  const pairs = points.map(p => `${fmt(p[0])},${fmt(p[1])}`);
  const first = `${cmd} ${pairs[0]}`;
  const rest = pairs.length > 1 ? ' ' + pairs.slice(1).join(' ') : '';
  return first + rest + (closed ? ' Z' : '');
}

// Transform each <path d="..."> occurrence
const newSvg = svg.replace(/(<path\b[^>]*\bd=")([^"]+)(")/gi, (full, prefix, dstr, suffix) => {
  try {
    const orig = dstr.trim();

    if (!/[Mm]/.test(orig)) return full; // no M → leave as-is

    const subRegex = /([Mm])([^Mm]*)/g;
    let match;
    let rebuiltParts = [];
    let anyChanged = false;

    while ((match = subRegex.exec(orig)) !== null) {
      const cmd = match[1];             // 'M' or 'm'
      const chunk = match[2] || '';     // everything after M up to next M

      const parsed = parseSubpathChunk(chunk);
      if (!parsed.ok) {
        // leave this subpath untouched
        rebuiltParts.push(cmd + chunk);
        continue;
      }

      const pts = parsed.points;
      if (!pts || pts.length < 2) {
        // small subpath, keep original formatting
        rebuiltParts.push(cmd + chunk + (parsed.closed ? ' Z' : ''));
        continue;
      }

      const dec = decimateNth(pts, n);

      // If decimation didn't reduce points, keep original chunk to avoid unnecessary edits
      if (dec.length >= pts.length) {
        rebuiltParts.push(cmd + chunk + (parsed.closed ? ' Z' : ''));
        continue;
      }

      anyChanged = true;
      const rebuilt = buildSubpath(cmd, dec, parsed.closed);
      rebuiltParts.push(rebuilt);
    }

    if (!anyChanged) return full;

    const newD = rebuiltParts.join(' ');
    return prefix + newD + suffix;
  } catch (e) {
    console.warn('Error processing path, leaving original:', e && e.message);
    return full;
  }
});

fs.writeFileSync(output, newSvg, 'utf8');
console.log(`Wrote simplified SVG to ${output} (n=${n})`);
