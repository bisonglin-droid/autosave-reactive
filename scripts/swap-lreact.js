// Swap Sepolia ETH for lREACT via the official Reactive faucet contract.
// Testnet only, $0. Reads the deployer key from credentials-wallet.json
// (never prints it). Usage: SWAP_ETH=0.02 node scripts/swap-lreact.js
// 1 ETH -> 100 lREACT, max 5 ETH per tx.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.resolve(__dirname, "..");
const creds = JSON.parse(
  fs.readFileSync(path.join(ROOT, "credentials-wallet.json"), "utf8")
);
const FAUCET = "0x9b9BB25f1A81078C544C829c5EB7822d747Cf434";
const AMOUNT = process.env.SWAP_ETH || "0.02";

async function main() {
  const sepolia = new ethers.JsonRpcProvider(
    "https://ethereum-sepolia-rpc.publicnode.com"
  );
  const wallet = new ethers.Wallet(creds.private_key, sepolia);
  console.log("deployer:", wallet.address);
  const bal = await sepolia.getBalance(wallet.address);
  console.log("Sepolia ETH:", ethers.formatEther(bal));
  const value = ethers.parseEther(AMOUNT);
  if (bal < value + ethers.parseEther("0.001")) {
    throw new Error("INSUFFICIENT Sepolia ETH");
  }
  const tx = await wallet.sendTransaction({ to: FAUCET, value });
  console.log("tx:", tx.hash);
  const rc = await tx.wait();
  console.log("confirmed in block", rc.blockNumber, "status", rc.status);
  const lasna = new ethers.JsonRpcProvider("https://lasna-rpc.rnk.dev/");
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 20000));
    const lBal = await lasna.getBalance(wallet.address);
    console.log("Lasna lREACT check", i + 1 + ":", ethers.formatEther(lBal));
    if (lBal > 0n) break;
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
