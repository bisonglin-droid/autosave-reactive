// Cancel the stale nonce-0 Lasna tx from deploy attempt 3 (maxFee 10 gwei,
// below the 100 gwei base-fee floor, stuck in the mempool forever).
// Sends a 0-value self-transfer with the SAME nonce (0) at 150 gwei, which
// replaces it. Costs ~0.002 lREACT. After this is mined, deploy.js can run
// again: the node counts queued txs against the balance, so the stale tx
// must be gone first (attempt 4 failed on that: queued 1.15 + new 1.6 > 2.1).
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.join(__dirname, "..");
const LASNA_RPC = "https://lasna-rpc.rnk.dev/";

async function main() {
  const creds = JSON.parse(
    fs.readFileSync(path.join(ROOT, "credentials-wallet.json"), "utf8")
  );
  const provider = new ethers.JsonRpcProvider(LASNA_RPC);
  const wallet = new ethers.Wallet(creds.private_key, provider);
  const nonce = await provider.getTransactionCount(wallet.address, "latest");
  console.log("deployer:", wallet.address, "latest nonce:", nonce);
  const bal = await provider.getBalance(wallet.address);
  console.log("Lasna lREACT:", ethers.formatEther(bal));
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0,
    nonce,
    gasLimit: 21_000,
    maxFeePerGas: ethers.parseUnits("150", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
  });
  console.log("cancel tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("mined in block:", receipt.blockNumber, "status:", receipt.status);
  const nonceAfter = await provider.getTransactionCount(wallet.address, "latest");
  console.log("latest nonce after:", nonceAfter);
}

main().catch((e) => {
  console.error("CANCEL FAILED:", e.shortMessage || e.message);
  process.exit(1);
});
