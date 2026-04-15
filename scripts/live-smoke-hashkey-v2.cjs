require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const output = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "contracts.v2.json"), "utf8"),
  );
  const addresses = output.contracts;

  const complianceGate = await hre.ethers.getContractAt("ComplianceGate", addresses.ComplianceGate);
  const demoUsdc = await hre.ethers.getContractAt("DemoUSDC", addresses.DemoUSDC);
  const receivableRegistry = await hre.ethers.getContractAt("ReceivableRegistryV2", addresses.ReceivableRegistry);
  const advanceEngine = await hre.ethers.getContractAt("AdvanceEngineV2", addresses.AdvanceEngine);
  const settlementRouter = await hre.ethers.getContractAt("SettlementRouterV2", addresses.SettlementRouter);
  const disputeEscrow = await hre.ethers.getContractAt("DisputeEscrow", addresses.DisputeEscrow);

  console.log("Using signer:", signer.address);

  await (await complianceGate.selfApprove(2, hre.ethers.ZeroHash)).wait();
  await (await demoUsdc.mint(signer.address, hre.ethers.parseUnits("50000", 6))).wait();

  const now = Math.floor(Date.now() / 1000);
  const dueDate = now + 14 * 24 * 60 * 60;

  const clearedId = Number(await receivableRegistry.receivableCount()) + 1;
  await (await receivableRegistry.createReceivable(
    signer.address,
    hre.ethers.parseUnits("1000", 6),
    hre.ethers.parseUnits("700", 6),
    0,
    now,
    dueDate,
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("live-smoke-cleared")),
    "BW-LIVE-001",
  )).wait();
  await (await receivableRegistry.acknowledgeReceivable(clearedId, true)).wait();
  await (await demoUsdc.approve(addresses.AdvanceEngine, hre.ethers.parseUnits("700", 6))).wait();
  await (await advanceEngine.fundReceivable(clearedId)).wait();
  await (await demoUsdc.approve(addresses.SettlementRouter, hre.ethers.parseUnits("1000", 6))).wait();
  await (await settlementRouter.settleReceivable(
    clearedId,
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`live-settle-${Date.now()}`)),
    1,
  )).wait();

  const disputedId = Number(await receivableRegistry.receivableCount()) + 1;
  await (await receivableRegistry.createReceivable(
    signer.address,
    hre.ethers.parseUnits("600", 6),
    hre.ethers.parseUnits("360", 6),
    0,
    now,
    dueDate,
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("live-smoke-disputed")),
    "BW-LIVE-002",
  )).wait();
  await (await receivableRegistry.acknowledgeReceivable(disputedId, true)).wait();
  await (await disputeEscrow.openDispute(
    disputedId,
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("delivery reconciliation pending")),
  )).wait();

  console.log("Seeded receivables:", { clearedId, disputedId });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
