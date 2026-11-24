// Deploy + wire + smoke-test the full loop. Testnet only, $0 spend.
// Usage: node scripts/deploy.js
//   Reads deployer key from credentials-wallet.json (never prints it).
//   Env overrides: THRESHOLD_ETH (default 0.01), FUND_REACTIVE_LREACT (default 1),
//                  FUND_BOARD_ETH (default 0.02), TEST_DEPOSIT_ETH (default 0.05),
//                  SKIP_TEST_DEPOSIT=1 to deploy only.
//   Refuses to proceed if any chain balance is insufficient — never buys gas.
//   Writes deployments.json (addresses + tx hashes) on success.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.resolve(__dirname, "..");
const creds = JSON.parse(
  fs.readFileSync(path.join(ROOT, "credentials-wallet.json"), "utf8")
);

const LASNA_RPC = "https://lasna-rpc.rnk.dev/";
const UNICHAIN_RPC = "https://sepolia.unichain.org";
const UNICHAIN_CHAIN_ID = 1301;
const LASNA_CHAIN_ID = 5318007;
// Lasna's gateway rejects EIP-1559 txs with tip cap 0 ("gas tip cap 0,
// minimum needed 1") — ethers' fee estimation returns 0 there, so every
// Lasna tx must carry explicit fees (observed 2026-11-25).
// Lasna's base fee is a flat 100 gwei floor (10 consecutive blocks, 1 tx
// each, 2026-11-25 00:47) — a 10 gwei maxFee tx sits in the mempool forever
// (attempt 3 hung 8+ min at [2/5]). Cap at 150 gwei; actual paid is ~100-102.
const LASNA_FEES = {
  maxFeePerGas: ethers.parseUnits("150", "gwei"),
  maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
};
// Lasna's gateway also flakes on eth_estimateGas for this constructor
// (system-contract subscribe call), so the deploy carries an explicit
// gas limit and never estimates (observed 2026-11-25).
// Bytecode is 3,316 bytes: creation ≈ 0.7M gas + constructor work ≈ 1-1.5M
// total. 4M is generous; the node checks balance against limit x maxFee,
// so 15M x 150 gwei (2.25 lREACT + 1 funding) would exceed the 2.1 balance.
const LASNA_DEPLOY_GAS = 4_000_000;
// Omni (current docs) callback proxy on Unichain Sepolia — NOT the legacy 0x9299… address.
const UNICHAIN_CALLBACK_PROXY = "0x775c9B990ADe401060B78D0e98684eEf8d2466C1";

const THRESHOLD = ethers.parseEther(process.env.THRESHOLD_ETH || "0.01");
const FUND_REACTIVE = ethers.parseEther(
  process.env.FUND_REACTIVE_LREACT || "1"
);
const FUND_BOARD = ethers.parseEther(process.env.FUND_BOARD_ETH || "0.02");
const TEST_DEPOSIT = ethers.parseEther(process.env.TEST_DEPOSIT_ETH || "0.05");

function load(name) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "build", `${name}.json`), "utf8")
  );
}

async function main() {
  const uni = new ethers.JsonRpcProvider(UNICHAIN_RPC);
  const lasna = new ethers.JsonRpcProvider(LASNA_RPC);
  const uniWallet = new ethers.Wallet(creds.private_key, uni);
  const lasnaWallet = new ethers.Wallet(creds.private_key, lasna);
  console.log("deployer:", uniWallet.address);

  const uniBal = await uni.getBalance(uniWallet.address);
  const lasnaBal = await lasna.getBalance(lasnaWallet.address);
  console.log("Unichain Sepolia ETH:", ethers.formatEther(uniBal));
  console.log("Lasna lREACT:", ethers.formatEther(lasnaBal));
  if (uniBal < FUND_BOARD + TEST_DEPOSIT + ethers.parseEther("0.01")) {
    throw new Error(
      "INSUFFICIENT Unichain Sepolia ETH — claim from a free faucet first (see README.md). Refusing to continue."
    );
  }
  // Worst case at the 150 gwei cap: deploy 4M gas (0.6) + setRecipient
  // (~0.08) — require funding + 0.7 lREACT, not just +0.01.
  if (lasnaBal < FUND_REACTIVE + ethers.parseEther("0.7")) {
    throw new Error(
      "INSUFFICIENT Lasna lREACT — send Sepolia ETH to the Reactive faucet first (see README.md). Refusing to continue."
    );
  }

  const box = load("DepositBox");
  const reactive = load("AutoSaveReactive");
  const board = load("SavingsBoard");

  console.log("\n[1/5] Deploy DepositBox on Unichain Sepolia...");
  const boxFactory = new ethers.ContractFactory(box.abi, box.bytecode, uniWallet);
  const boxContract = await boxFactory.deploy();
  await boxContract.waitForDeployment();
  const boxAddr = await boxContract.getAddress();
  console.log("  DepositBox:", boxAddr, "tx:", boxContract.deploymentTransaction().hash);

  console.log("\n[2/5] Deploy AutoSaveReactive on Lasna (funded with lREACT)...");
  const reactiveFactory = new ethers.ContractFactory(
    reactive.abi,
    reactive.bytecode,
    lasnaWallet
  );
  const reactiveContract = await reactiveFactory.deploy(boxAddr, THRESHOLD, {
    value: FUND_REACTIVE,
    gasLimit: LASNA_DEPLOY_GAS,
    ...LASNA_FEES,
  });
  await reactiveContract.waitForDeployment();
  const reactiveAddr = await reactiveContract.getAddress();
  console.log(
    "  AutoSaveReactive:",
    reactiveAddr,
    "tx:",
    reactiveContract.deploymentTransaction().hash
  );

  console.log("\n[3/5] Deploy SavingsBoard on Unichain Sepolia (funded with ETH)...");
  const boardFactory = new ethers.ContractFactory(board.abi, board.bytecode, uniWallet);
  const boardContract = await boardFactory.deploy(
    UNICHAIN_CALLBACK_PROXY,
    reactiveAddr,
    { value: FUND_BOARD }
  );
  await boardContract.waitForDeployment();
  const boardAddr = await boardContract.getAddress();
  console.log(
    "  SavingsBoard:",
    boardAddr,
    "tx:",
    boardContract.deploymentTransaction().hash
  );

  console.log("\n[4/5] Wire reactive -> board (setRecipient)...");
  const setTx = await reactiveContract.setRecipient(boardAddr, {
    gasLimit: 500_000,
    ...LASNA_FEES,
  });
  const setReceipt = await setTx.wait();
  console.log("  setRecipient tx:", setReceipt.hash);

  const out = {
    network: "testnet",
    deployer: uniWallet.address,
    thresholdEth: ethers.formatEther(THRESHOLD),
    contracts: {
      depositBox: { chain: "Unichain Sepolia", chainId: UNICHAIN_CHAIN_ID, address: boxAddr, tx: boxContract.deploymentTransaction().hash },
      autoSaveReactive: { chain: "Reactive Lasna", chainId: LASNA_CHAIN_ID, address: reactiveAddr, tx: reactiveContract.deploymentTransaction().hash },
      savingsBoard: { chain: "Unichain Sepolia", chainId: UNICHAIN_CHAIN_ID, address: boardAddr, tx: boardContract.deploymentTransaction().hash },
    },
    wiring: { setRecipientTx: setReceipt.hash },
    explorers: {
      unichain: "https://sepolia.uniscan.xyz",
      lasna: "https://lasna.reactscan.net",
    },
    testDeposit: null,
  };

  if (process.env.SKIP_TEST_DEPOSIT !== "1") {
    console.log("\n[5/5] Smoke test: deposit", ethers.formatEther(TEST_DEPOSIT), "ETH into DepositBox...");
    const depTx = await boxContract.deposit({ value: TEST_DEPOSIT });
    const depReceipt = await depTx.wait();
    console.log("  deposit tx:", depReceipt.hash);
    out.testDeposit = { tx: depReceipt.hash, amountEth: ethers.formatEther(TEST_DEPOSIT) };
    console.log("\nNOTE: the reactive leg + callback are async (network-driven).");
    console.log("Poll with: node scripts/check-loop.js  (after ~1-3 min)");
  }

  fs.writeFileSync(
    path.join(ROOT, "deployments.json"),
    JSON.stringify(out, null, 2)
  );
  console.log("\nWrote deployments.json");
}

main().catch((e) => {
  console.error("DEPLOY FAILED:", e.message);
  process.exit(1);
});
