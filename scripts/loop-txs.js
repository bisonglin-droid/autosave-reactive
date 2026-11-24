// Find the on-chain loop transaction hashes for the submission evidence.
// Read-only. Prints: deposit tx (origin), Lasna react tx, Unichain callback tx.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.join(__dirname, "..");
const dep = JSON.parse(
  fs.readFileSync(path.join(ROOT, "deployments.json"), "utf8")
);
const reactiveJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build", "AutoSaveReactive.json"), "utf8")
);
const boardJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build", "SavingsBoard.json"), "utf8")
);
const boxJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build", "DepositBox.json"), "utf8")
);

async function queryInWindows(contract, filter, provider, span = 5000) {
  const latest = await provider.getBlockNumber();
  const events = [];
  for (let to = latest; to > latest - span; to -= 1000) {
    const from = Math.max(to - 999, 0);
    const chunk = await contract.queryFilter(filter, from, to);
    events.push(...chunk);
  }
  return events;
}

async function main() {
  const lasna = new ethers.JsonRpcProvider("https://lasna-rpc.rnk.dev/");
  const uni = new ethers.JsonRpcProvider("https://sepolia.unichain.org");
  const box = new ethers.Contract(
    dep.contracts.depositBox.address,
    boxJson.abi,
    uni
  );
  const reactive = new ethers.Contract(
    dep.contracts.autoSaveReactive.address,
    reactiveJson.abi,
    lasna
  );
  const board = new ethers.Contract(
    dep.contracts.savingsBoard.address,
    boardJson.abi,
    uni
  );
  const [deposits, reactions, callbacks, saved] = await Promise.all([
    queryInWindows(box, box.filters.Deposit, uni),
    queryInWindows(reactive, reactive.filters.ReactionSeen, lasna),
    queryInWindows(reactive, reactive.filters.Callback, lasna),
    queryInWindows(board, board.filters.AutoSaved, uni),
  ]);
  console.log("Deposit events (origin):");
  for (const e of deposits)
    console.log("  tx:", e.transactionHash, "block:", e.blockNumber);
  console.log("ReactionSeen events (Lasna react):");
  for (const e of reactions)
    console.log("  tx:", e.transactionHash, "block:", e.blockNumber);
  console.log("Callback events (Lasna callback request):");
  for (const e of callbacks)
    console.log("  tx:", e.transactionHash, "block:", e.blockNumber);
  console.log("AutoSaved events (Unichain callback landed):");
  for (const e of saved)
    console.log("  tx:", e.transactionHash, "block:", e.blockNumber);
}

main().catch((e) => {
  console.error("LOOP-TXS FAILED:", e.message);
  process.exit(1);
});
