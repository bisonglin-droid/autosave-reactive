// Poll the deployed loop and report its state. Read-only.
// Usage: node scripts/check-loop.js
// Reads deployments.json, prints reactive stats (Lasna) and board stats
// (Unichain Sepolia) plus recent AutoSaved events.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.resolve(__dirname, "..");
const dep = JSON.parse(
  fs.readFileSync(path.join(ROOT, "deployments.json"), "utf8")
);
const reactive = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build", "AutoSaveReactive.json"), "utf8")
);
const board = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build", "SavingsBoard.json"), "utf8")
);

async function main() {
  const lasna = new ethers.JsonRpcProvider("https://lasna-rpc.rnk.dev/");
  const uni = new ethers.JsonRpcProvider("https://sepolia.unichain.org");
  const r = new ethers.Contract(
    dep.contracts.autoSaveReactive.address,
    reactive.abi,
    lasna
  );
  const b = new ethers.Contract(
    dep.contracts.savingsBoard.address,
    board.abi,
    uni
  );
  const [reactions, callbacks, lastAmount, lastDepositor] = await Promise.all([
    r.reactions(),
    r.callbacksRequested(),
    r.lastAmount(),
    r.lastDepositor(),
  ]);
  const [totalCallbacks, totalAutoSaved] = await Promise.all([
    b.totalCallbacks(),
    b.totalAutoSaved(),
  ]);
  console.log("AutoSaveReactive (Lasna):");
  console.log("  reactions seen:     ", reactions.toString());
  console.log("  callbacks requested:", callbacks.toString());
  console.log("  last amount (wei):  ", lastAmount.toString());
  console.log("  last depositor:     ", lastDepositor);
  console.log("SavingsBoard (Unichain Sepolia):");
  console.log("  callbacks received: ", totalCallbacks.toString());
  console.log("  total auto-saved:   ", ethers.formatEther(totalAutoSaved), "ETH");
  if (dep.testDeposit) {
    console.log("test deposit tx:      ", dep.testDeposit.tx);
  }
  const loopClosed =
    Number(totalCallbacks) > 0 && Number(reactions) > 0;
  console.log(
    loopClosed
      ? "LOOP CLOSED: origin event -> react() -> callback -> board state. Ready for submission evidence."
      : "LOOP NOT YET CLOSED: deposit seen on Lasna but no callback landed (or nothing deposited yet). Wait 1-3 min and re-run."
  );
}

main().catch((e) => {
  console.error("CHECK FAILED:", e.message);
  process.exit(1);
});
