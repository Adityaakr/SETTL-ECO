require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY not found in .env");
  }

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const hashKeyKycSbtAddress =
    process.env.HASHKEY_KYC_SBT_ADDRESS ||
    process.env.VITE_HASHKEY_KYC_SBT_ADDRESS ||
    hre.ethers.ZeroAddress;
  const strictHashKeyKyc = hashKeyKycSbtAddress !== hre.ethers.ZeroAddress;

  console.log("Deploying SETTL v2 with:", deployer.address);
  console.log("Network chain ID:", network.chainId.toString());
  console.log(
    "HashKey KYC SBT:",
    strictHashKeyKyc ? hashKeyKycSbtAddress : "not configured (self-serve fallback enabled)",
  );

  const DemoUSDC = await hre.ethers.getContractFactory("DemoUSDC");
  const demoUsdc = await DemoUSDC.deploy(deployer.address, network.chainId);
  await demoUsdc.waitForDeployment();

  const ComplianceGate = await hre.ethers.getContractFactory("ComplianceGate");
  const complianceGate = await ComplianceGate.deploy(
    deployer.address,
    !strictHashKeyKyc,
    hashKeyKycSbtAddress,
  );
  await complianceGate.waitForDeployment();

  const ReputationV2 = await hre.ethers.getContractFactory("ReputationV2");
  const reputation = await ReputationV2.deploy(deployer.address);
  await reputation.waitForDeployment();

  const ReceivableRegistryV2 = await hre.ethers.getContractFactory("ReceivableRegistryV2");
  const receivableRegistry = await ReceivableRegistryV2.deploy(
    deployer.address,
    await complianceGate.getAddress(),
  );
  await receivableRegistry.waitForDeployment();

  const FundingPoolV2 = await hre.ethers.getContractFactory("FundingPoolV2");
  const fundingPool = await FundingPoolV2.deploy(
    deployer.address,
    await complianceGate.getAddress(),
    await demoUsdc.getAddress(),
  );
  await fundingPool.waitForDeployment();

  const AdvanceEngineV2 = await hre.ethers.getContractFactory("AdvanceEngineV2");
  const advanceEngine = await AdvanceEngineV2.deploy(
    deployer.address,
    await demoUsdc.getAddress(),
    await complianceGate.getAddress(),
    await receivableRegistry.getAddress(),
    await reputation.getAddress(),
    600,
  );
  await advanceEngine.waitForDeployment();

  const HspSettlementAdapter = await hre.ethers.getContractFactory("HspSettlementAdapter");
  const hspSettlementAdapter = await HspSettlementAdapter.deploy(deployer.address);
  await hspSettlementAdapter.waitForDeployment();

  const SettlementRouterV2 = await hre.ethers.getContractFactory("SettlementRouterV2");
  const settlementRouter = await SettlementRouterV2.deploy(
    deployer.address,
    await demoUsdc.getAddress(),
    await complianceGate.getAddress(),
    await receivableRegistry.getAddress(),
    await advanceEngine.getAddress(),
    await hspSettlementAdapter.getAddress(),
    await reputation.getAddress(),
    deployer.address,
    50,
  );
  await settlementRouter.waitForDeployment();

  const DisputeEscrow = await hre.ethers.getContractFactory("DisputeEscrow");
  const disputeEscrow = await DisputeEscrow.deploy(
    deployer.address,
    await receivableRegistry.getAddress(),
    await reputation.getAddress(),
  );
  await disputeEscrow.waitForDeployment();

  await (await receivableRegistry.setOperator(await advanceEngine.getAddress(), true)).wait();
  await (await receivableRegistry.setOperator(await settlementRouter.getAddress(), true)).wait();
  await (await receivableRegistry.setOperator(await disputeEscrow.getAddress(), true)).wait();

  await (await advanceEngine.setOperator(await settlementRouter.getAddress(), true)).wait();

  await (await hspSettlementAdapter.setOperator(await settlementRouter.getAddress(), true)).wait();

  await (await reputation.setOperator(await advanceEngine.getAddress(), true)).wait();
  await (await reputation.setOperator(await settlementRouter.getAddress(), true)).wait();
  await (await reputation.setOperator(await disputeEscrow.getAddress(), true)).wait();

  const contracts = {
    DemoUSDC: await demoUsdc.getAddress(),
    ComplianceGate: await complianceGate.getAddress(),
    HashKeyKycSBT: strictHashKeyKyc ? hashKeyKycSbtAddress : hre.ethers.ZeroAddress,
    ReceivableRegistry: await receivableRegistry.getAddress(),
    FundingPool: await fundingPool.getAddress(),
    AdvanceEngine: await advanceEngine.getAddress(),
    HspSettlementAdapter: await hspSettlementAdapter.getAddress(),
    SettlementRouter: await settlementRouter.getAddress(),
    DisputeEscrow: await disputeEscrow.getAddress(),
    Reputation: await reputation.getAddress(),
    Treasury: deployer.address,
    ProtocolFeeBps: "50",
  };

  const contractsPath = path.join(__dirname, "..", "contracts.v2.json");
  fs.writeFileSync(
    contractsPath,
    JSON.stringify(
      {
        network: hre.network.name,
        chainId: network.chainId.toString(),
        deployer: deployer.address,
        contracts,
        deployedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log("Deployment output written to:", contractsPath);
  Object.entries(contracts).forEach(([key, value]) => console.log(`${key}=${value}`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
