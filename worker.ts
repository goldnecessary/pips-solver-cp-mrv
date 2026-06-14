// worker.ts
import { solve, naiveSolve, solveCP, solveCP_MRV} from "./components.tsx";
import * as fs from "fs";

async function run() {
  // Read the puzzle data passed by the parent manager
  const rawData = fs.readFileSync("temp_puzzle.json", "utf-8");
  const puzzle = JSON.parse(rawData);
  
  // Determine which algorithm the manager wants us to run
  const algo = process.argv[2]; 

  const start = performance.now();
  try {
    let result;
    if (algo === "opt") {
      result = await solve(puzzle.cells, puzzle.regions, puzzle.dominoCounts, 3_000_000);
    } else if (algo === "cp_mrv") {
      result = await solveCP_MRV(puzzle.cells, puzzle.regions, puzzle.dominoCounts, 5_000_000);
    } else if (algo === "cp") {
      result = await solveCP(puzzle.cells, puzzle.regions, puzzle.dominoCounts, 5_000_000);
    } else {
      result = await naiveSolve(puzzle.cells, puzzle.regions, puzzle.dominoCounts, 3_000_000);
    }
    
    const timeMs = performance.now() - start;
    
    // Save success result back to disk for the manager
    fs.writeFileSync(`temp_result_${algo}.json`, JSON.stringify({ 
      nodes: result.nodes, 
      timeMs: timeMs.toFixed(3), 
      status: "Success" 
    }));

  } catch (err: any) {
    const timeMs = performance.now() - start;
    const status = err.message === "MAX_NODES_EXCEEDED" ? "Timeout" : "Crash";
    
    // Save known error result back to disk
    fs.writeFileSync(`temp_result_${algo}.json`, JSON.stringify({ 
      nodes: "N/A", 
      timeMs: timeMs.toFixed(3), 
      status 
    }));
  }
}

run();