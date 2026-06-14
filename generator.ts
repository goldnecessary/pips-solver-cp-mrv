// generator.ts

export type Coord = [number, number];

export type Region =
  | { kind: 'sum'; target: number; cells: Coord[] }
  | { kind: 'equal'; cells: Coord[] }
  | { kind: 'nequal'; cells: Coord[] }
  | { kind: 'less'; target: number; cells: Coord[] }
  | { kind: 'greater'; target: number; cells: Coord[] };

export type PuzzleDefinition = {
  cells: Coord[]; // List of all valid board coordinates
  regions: Region[];
  dominoCounts: Record<string, number>;
};

// --- Helper: Generate a purely random domino inventory ---
function getRandomInventory(count: number): Record<string, number> {
  const inventory: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    const p1 = Math.floor(Math.random() * 7);
    const p2 = Math.floor(Math.random() * 7);
    const key = p1 <= p2 ? `${p1}|${p2}` : `${p2}|${p1}`;
    inventory[key] = (inventory[key] || 0) + 1;
  }
  return inventory;
}

// --- Helper: Get adjacent coordinates ---
function getNeighbors(r: number, c: number): Coord[] {
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
}

// --- STEP 1: Organic Blob Tiler ---
function generateOrganicTruth(dominoCount: number) {
  const inventory = getRandomInventory(dominoCount);
  const board = new Map<string, number>(); // Maps "r,c" -> pip value
  const cells: Coord[] = [];

  // Flatten inventory into a list of tiles we need to place
  const dominosToPlace: string[] = [];
  for (const [key, count] of Object.entries(inventory)) {
    for (let i = 0; i < count; i++) dominosToPlace.push(key);
  }

  // Place the first domino at the origin
  const firstDom = dominosToPlace.pop()!.split('|').map(Number);
  board.set("0,0", firstDom[0]);
  board.set("0,1", firstDom[1]);
  cells.push([0, 0], [0, 1]);

  // Grow the blob organically
  while (dominosToPlace.length > 0) {
    const dom = dominosToPlace.pop()!.split('|').map(Number);
    const pips = Math.random() > 0.5 ? [dom[0], dom[1]] : [dom[1], dom[0]]; // Random orientation

    let placed = false;
    // Keep trying random existing cells until we find a place to attach the new domino
    while (!placed) {
      const anchor = cells[Math.floor(Math.random() * cells.length)];
      
      // Find an empty space adjacent to the anchor
      const emptyNeighbors = getNeighbors(anchor[0], anchor[1]).filter(([nr, nc]) => !board.has(`${nr},${nc}`));
      if (emptyNeighbors.length === 0) continue;

      const cell1 = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];

      // Find an empty space adjacent to cell1 to fit the second half of the domino
      const cell2Options = getNeighbors(cell1[0], cell1[1]).filter(([nr, nc]) => !board.has(`${nr},${nc}`));
      if (cell2Options.length === 0) continue;

      const cell2 = cell2Options[Math.floor(Math.random() * cell2Options.length)];

      // Place it!
      board.set(`${cell1[0]},${cell1[1]}`, pips[0]);
      board.set(`${cell2[0]},${cell2[1]}`, pips[1]);
      cells.push(cell1, cell2);
      placed = true;
    }
  }

  return { cells, board, inventory };
}

// --- Main Generator Function ---
export function generatePuzzle(
  dominoCount: number = 12, 
  targetDensity: number = 0.75
): PuzzleDefinition {
  
  // 1. Generate Organic Truth
  const { cells, board, inventory } = generateOrganicTruth(dominoCount);
  
  const visited = new Set<string>();
  const regions: Region[] = [];

  // 2. Seed Carving for "Equal" constraints (Only checking actual populated cells)
  for (const [r, c] of cells) {
    const key = `${r},${c}`;
    if (visited.has(key)) continue;

    const val = board.get(key)!;
    const validPairs: Coord[] = [];

    // Check Right and Down for matches
    if (!visited.has(`${r},${c + 1}`) && board.get(`${r},${c + 1}`) === val) validPairs.push([r, c + 1]);
    if (!visited.has(`${r + 1},${c}`) && board.get(`${r + 1},${c}`) === val) validPairs.push([r + 1, c]);

    if (validPairs.length > 0 && Math.random() < 0.35) {
      const nextCell = validPairs[Math.floor(Math.random() * validPairs.length)];
      visited.add(key);
      visited.add(`${nextCell[0]},${nextCell[1]}`);
      regions.push({ kind: 'equal', cells: [[r, c], nextCell] });
    }
  }

  // 3. Random Walk Flood Fill for Sum, Greater, and Less constraints
  const maxAllocatedCells = Math.floor(cells.length * targetDensity);
  let allocatedCells = regions.reduce((acc, r) => acc + r.cells.length, 0);

  // Shuffle cells to pick random starting points
  const unvisitedCells = cells.filter(([r, c]) => !visited.has(`${r},${c}`));
  unvisitedCells.sort(() => Math.random() - 0.5);

  for (const [startR, startC] of unvisitedCells) {
    if (allocatedCells >= maxAllocatedCells) break;
    if (visited.has(`${startR},${startC}`)) continue;

    const targetSize = Math.random() < 0.6 ? 2 : (Math.random() < 0.9 ? 3 : 4);
    const currentRegionCells: Coord[] = [[startR, startC]];
    visited.add(`${startR},${startC}`);

    // Grow the cage
    for (let step = 1; step < targetSize; step++) {
      const neighbors: Coord[] = [];
      for (const [cr, cc] of currentRegionCells) {
        for (const [nr, nc] of getNeighbors(cr, cc)) {
          // Only absorb cells that actually exist on our organic board!
          if (board.has(`${nr},${nc}`) && !visited.has(`${nr},${nc}`)) {
            if (!neighbors.some(([r, c]) => r === nr && c === nc)) neighbors.push([nr, nc]);
          }
        }
      }

      if (neighbors.length === 0) break;

      const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited.add(`${chosen[0]},${chosen[1]}`);
      currentRegionCells.push(chosen);
    }

    // Calculate actual sum
    const actualSum = currentRegionCells.reduce((sum, [r, c]) => sum + board.get(`${r},${c}`)!, 0);
    
    // Mutate constraint type
    const rand = Math.random();
    if (rand < 0.15 && actualSum < (currentRegionCells.length * 6) - 2) {
      // 15% chance for 'Less Than' (Add 1 to 3 to the actual sum)
      const offset = Math.floor(Math.random() * 3) + 1;
      regions.push({ kind: 'less', target: actualSum + offset, cells: currentRegionCells });
    } else if (rand < 0.30 && actualSum > 2) {
      // 15% chance for 'Greater Than' (Subtract 1 to 3 from the actual sum)
      const offset = Math.floor(Math.random() * 3) + 1;
      regions.push({ kind: 'greater', target: actualSum - offset, cells: currentRegionCells });
    } else {
      // 70% chance for standard Exact Sum
      regions.push({ kind: 'sum', target: actualSum, cells: currentRegionCells });
    }

    allocatedCells += currentRegionCells.length;
  }

  return { cells, regions, dominoCounts: inventory };
}

// --- Helper: Dynamic Bounding Box Console Printer ---
export function printPuzzle(puzzle: PuzzleDefinition) {
  const { cells, regions } = puzzle;
  
  // Find Bounding Box
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const [r, c] of cells) {
    if (r < minR) minR = r; if (r > maxR) maxR = r;
    if (c < minC) minC = c; if (c > maxC) maxC = c;
  }

  const height = maxR - minR + 1;
  const width = maxC - minC + 1;
  const grid = Array.from({ length: height }, () => Array(width).fill(' '));

  // Mark all valid blank cells with a dot
  for (const [r, c] of cells) {
    grid[r - minR][c - minC] = '.';
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const legend: string[] = [];

  regions.forEach((region, index) => {
    const char = chars[index % chars.length];
    region.cells.forEach(([r, c]) => {
      grid[r - minR][c - minC] = char;
    });

    let rule = "";
    if (region.kind === 'sum') rule = `Sum = ${region.target}`;
    else if (region.kind === 'equal') rule = `Equal`;
    else if (region.kind === 'less') rule = `Sum < ${region.target}`;
    else if (region.kind === 'greater') rule = `Sum > ${region.target}`;
    
    legend.push(`[${char}] ${rule} (${region.cells.length} cells)`);
  });

  console.log("\n=== ORGANIC PIPS PUZZLE ===");
  grid.forEach(row => console.log(row.join(' ')));
  console.log("\n=== CONSTRAINTS ===");
  legend.forEach(line => console.log(line));
  console.log("===========================\n");
}

// --- TEST SCRIPT ---
// const puzzle = generatePuzzle(12, 0.70); // Generate a puzzle with 12 dominoes (24 cells)
// printPuzzle(puzzle);