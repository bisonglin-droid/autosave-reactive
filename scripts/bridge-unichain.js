// Bridge Sepolia ETH -> Unichain Sepolia via the official OP Stack L1StandardBridge.
// Testnet only, $0. Reads the deployer key from credentials-wallet.json (never prints it).
// Usage: node scripts/bridge-unichain.js   (bridges balance minus 0.003 ETH gas reserve)
//   or BRIDGE_ETH=0.02 node scripts/bridge-unichain.js
// Bridge address from ethereum-optimism/superchain-registry
// (superchain/configs/sepolia/unichain.toml, verified 2026-11-25).
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.resolve(__dirname, "..");
const creds = JSON.parse(
  fs.readFileSync(path.join(ROOT, "credentials-wallet.json"), "utf8")
);
const BRIDGE = "0xea58fcA6849d79EAd1f26608855c2D6407d54Ce2";
const BRIDGE_ABI = [
  "function depositETH(uint32 _minGasLimit, bytes _extraData) payable",
];

async function main() {
  const sepolia = new ethers.JsonRpcProvider(
    "https://ethereum-sepolia-rpc.publicnode.com"
  );
  const wallet = new ethers.Wallet(creds.private_key, sepolia);
  console.log("deployer:", wallet.address);
  const bal = await sepolia.getBalance(wallet.address);
  console.log("Sepolia ETH:", ethers.formatEther(bal));
  const reserve = ethers.parseEther("0.003");
  const value = process.env.BRIDGE_ETH
    ? ethers.parseEther(process.env.BRIDGE_ETH)
    : bal - reserve;
  if (value <= 0n) throw new Error("INSUFFICIENT Sepolia ETH");
  const bridge = new ethers.Contract(BRIDGE, BRIDGE_ABI, wallet);
  const tx = await bridge.depositETH(200000, "0x", { value });
  console.log("bridge tx:", tx.hash, "value:", ethers.formatEther(value));
  const rc = await tx.wait();
  console.log("confirmed in block", rc.blockNumber, "status", rc.status);
  const uni = new ethers.JsonRpcProvider("https://sepolia.unichain.org");
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 30000));
    const uBal = await uni.getBalance(wallet.address);
    console.log(
      "Unichain Sepolia ETH check",
      i + 1 + ":",
      ethers.formatEther(uBal)
    );
    if (uBal > 0n) break;
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
