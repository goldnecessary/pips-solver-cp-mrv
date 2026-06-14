Pips Solver CP MRV
An algorithmic analysis and highly optimized constraint satisfaction engine designed to solve the New York Times "Pips" puzzle.
Key Features:
Three Solver Tiers: Includes the Naive DFS, Forward Checking (Reactive), and full Constraint Propagation (Proactive) algorithms.Bitmask Domain Filtering: Uses highly optimized Uint32Array bitmasks to enforce Arc Consistency and mathematically eliminate invalid puzzle states millions of nodes before they are reached.MRV Heuristic: Intelligently hunts down the most constrained regions of the board first, forcing early tree collapse and bypassing exponential variance.Automated Benchmarking: Includes a benchmark.ts suite to empirically test runtime and memory limits across puzzle sizes from $N=4$ to $N=15$.
Installation and Setup:
This project is written in Typescript and runs on Node.js
Install dependencies:
npm install
Running the Benchmarks:
npx ts-node benchmark.ts
References:
https://healeycodes.com/solving-nyt-pips-puzzle
