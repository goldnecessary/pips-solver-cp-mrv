// benchmark.ts
import { generatePuzzle } from "./generator";
import * as fs from "fs";
import { execSync } from "child_process";

console.log("🚀 Starting Isolated Head-to-Head Benchmark...");
const filename = "pips_comparison_data.csv";

// Write header synchronously
fs.writeFileSync(filename, "Dominoes,Cells,Regions,Opt_Nodes,Opt_TimeMs,Opt_Status,Naive_Nodes,Naive_TimeMs,Naive_Status,CP_Nodes,CP_TimeMs,CP_Status,CP_MRV_Nodes,CP_MRV_TimeMs,CP_MRV_Status\n");

const minDominos = 4;   
const maxDominos = 28;  
const trialsPerSize = 5; 

// Helper function to dispatch a worker and catch its death
function runWorkerSafely(algo: string): { nodes: string, timeMs: string, status: string } {
  const resultFile = `temp_result_${algo}.json`;
  
  // Clean up any old result file before starting
  if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);

  try {
    // Run the disposable worker synchronously. stdio: 'ignore' silences the OS kill warnings.
    execSync(`bun worker.ts ${algo}`, { stdio: 'ignore' });
    
    // If the worker survived, it will have created this file
    if (fs.existsSync(resultFile)) {
      return JSON.parse(fs.readFileSync(resultFile, "utf-8"));
    }
  } catch (error) {
    // If execSync throws an error, it means the worker was assassinated by the OS.
  }
  
  // Fallback state if the worker didn't survive
  return { nodes: "N/A", timeMs: "N/A", status: "Killed (OOM)" };
}

for (let size = minDominos; size <= maxDominos; size++) {
  console.log(`\nTesting size: ${size} dominoes...`);
  
  for (let trial = 0; trial < trialsPerSize; trial++) {
    // 1. Generate one puzzle and save it to disk for the workers
    const puzzle = generatePuzzle(size, 0.75);
    fs.writeFileSync("temp_puzzle.json", JSON.stringify(puzzle));

    // 2. Dispatch the isolated workers
    const optResult = runWorkerSafely("opt");
    const cpResult = runWorkerSafely("cp");
    const cpMrvResult = runWorkerSafely("cp_mrv")
    const naiveResult = runWorkerSafely("naive");

    // 3. Append to CSV immediately
    const row = `${size},${puzzle.cells.length},${puzzle.regions.length},${optResult.nodes},${optResult.timeMs},${optResult.status},${naiveResult.nodes},${naiveResult.timeMs},${naiveResult.status},${cpResult.nodes},${cpResult.timeMs},${cpResult.status},${cpMrvResult.nodes},${cpMrvResult.timeMs},${cpMrvResult.status}\n`;
    fs.appendFileSync(filename, row);
    
    process.stdout.write(`  Trial ${trial+1}: Opt [${optResult.status}], Naive [${naiveResult.status}], Cp [${cpResult.status}], Cp_Mrv [${cpMrvResult.status}]\r`);
  }
}

// Clean up temporary communication files
if (fs.existsSync("temp_puzzle.json")) fs.unlinkSync("temp_puzzle.json");
if (fs.existsSync("temp_result_opt.json")) fs.unlinkSync("temp_result_opt.json");
if (fs.existsSync("temp_result_naive.json")) fs.unlinkSync("temp_result_naive.json");

console.log(`\n\n✅ Benchmark complete! Resilient data saved to '${filename}'`);