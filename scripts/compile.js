// Compile all contracts with solc-js (programmatic API).
// Usage: node scripts/compile.js
// Reads contracts/*.sol, resolves relative imports from disk, writes build/*.json
// ({ abi, bytecode }) and exits non-zero on any compiler error.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.resolve(__dirname, "..");
const CONTRACTS = ["DepositBox.sol", "AutoSaveReactive.sol", "SavingsBoard.sol"];

function findImports(importPath) {
  // solc normalizes "../lib/..." to "lib/..." before calling back, so
  // resolve every import against the project root.
  try {
    const resolved = path.resolve(ROOT, importPath);
    return { contents: fs.readFileSync(resolved, "utf8") };
  } catch (e) {
    return { error: `import not found: ${importPath} (${e.message})` };
  }
}

const sources = {};
for (const name of CONTRACTS) {
  const p = path.join(ROOT, "contracts", name);
  sources[name] = { content: fs.readFileSync(p, "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

const errors = (output.errors || []).filter((e) => e.severity === "error");
for (const e of output.errors || []) {
  console.log(`[${e.severity}] ${e.formattedMessage.split("\n")[0]}`);
}
if (errors.length > 0) {
  console.error(`COMPILATION FAILED: ${errors.length} error(s)`);
  process.exit(1);
}

fs.mkdirSync(path.join(ROOT, "build"), { recursive: true });
for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [name, c] of Object.entries(contracts)) {
    const out = {
      contractName: name,
      source: file,
      abi: c.abi,
      bytecode: "0x" + c.evm.bytecode.object,
    };
    fs.writeFileSync(
      path.join(ROOT, "build", `${name}.json`),
      JSON.stringify(out, null, 2)
    );
    console.log(
      `OK ${name} (${file}) bytecode=${c.evm.bytecode.object.length / 2} bytes`
    );
  }
}
console.log("COMPILATION OK");
