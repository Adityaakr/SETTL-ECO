const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SETTL v2 live lifecycle", function () {
  it("runs create -> acknowledge -> fund -> settle and dispute resolution", async function () {
    const [admin, seller, buyer, lp] = await ethers.getSigners();

    const DemoUSDC = await ethers.getContractFactory("DemoUSDC");
    const demoUsdc = await DemoUSDC.deploy(admin.address, 31337);
    await demoUsdc.waitForDeployment();

    const MockHashKeyKycSBT = await ethers.getContractFactory("MockHashKeyKycSBT");
    const mockHashKeyKycSbt = await MockHashKeyKycSBT.deploy(ethers.parseEther("0.01"));
    await mockHashKeyKycSbt.waitForDeployment();
    await (await mockHashKeyKycSbt.setProfile(seller.address, "seller.hsk", 2, 1)).wait();
    await (await mockHashKeyKycSbt.setProfile(buyer.address, "buyer.hsk", 2, 1)).wait();
    await (await mockHashKeyKycSbt.setProfile(lp.address, "lp.hsk", 2, 1)).wait();

    const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
    const complianceGate = await ComplianceGate.deploy(
      admin.address,
      false,
      await mockHashKeyKycSbt.getAddress(),
    );
    await complianceGate.waitForDeployment();

    const ReputationV2 = await ethers.getContractFactory("ReputationV2");
    const reputation = await ReputationV2.deploy(admin.address);
    await reputation.waitForDeployment();

    const ReceivableRegistryV2 = await ethers.getContractFactory("ReceivableRegistryV2");
    const receivableRegistry = await ReceivableRegistryV2.deploy(
      admin.address,
      await complianceGate.getAddress(),
    );
    await receivableRegistry.waitForDeployment();

    const FundingPoolV2 = await ethers.getContractFactory("FundingPoolV2");
    const fundingPool = await FundingPoolV2.deploy(
      admin.address,
      await complianceGate.getAddress(),
      await demoUsdc.getAddress(),
    );
    await fundingPool.waitForDeployment();

    const AdvanceEngineV2 = await ethers.getContractFactory("AdvanceEngineV2");
    const advanceEngine = await AdvanceEngineV2.deploy(
      admin.address,
      await demoUsdc.getAddress(),
      await complianceGate.getAddress(),
      await receivableRegistry.getAddress(),
      await reputation.getAddress(),
      600,
    );
    await advanceEngine.waitForDeployment();

    const HspSettlementAdapter = await ethers.getContractFactory("HspSettlementAdapter");
    const hspSettlementAdapter = await HspSettlementAdapter.deploy(admin.address);
    await hspSettlementAdapter.waitForDeployment();

    const SettlementRouterV2 = await ethers.getContractFactory("SettlementRouterV2");
    const settlementRouter = await SettlementRouterV2.deploy(
      admin.address,
      await demoUsdc.getAddress(),
      await complianceGate.getAddress(),
      await receivableRegistry.getAddress(),
      await advanceEngine.getAddress(),
      await hspSettlementAdapter.getAddress(),
      await reputation.getAddress(),
      admin.address,
      50,
    );
    await settlementRouter.waitForDeployment();

    const DisputeEscrow = await ethers.getContractFactory("DisputeEscrow");
    const disputeEscrow = await DisputeEscrow.deploy(
      admin.address,
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

    expect(await complianceGate.isApproved(seller.address)).to.equal(true);
    expect(await complianceGate.isApproved(buyer.address)).to.equal(true);
    expect(await complianceGate.isApproved(lp.address)).to.equal(true);
    await (await complianceGate.connect(seller).syncMyHashKeyKyc()).wait();
    await (await complianceGate.connect(buyer).syncMyHashKeyKyc()).wait();
    await (await complianceGate.connect(lp).syncMyHashKeyKyc()).wait();

    await (await demoUsdc.mint(lp.address, ethers.parseUnits("100000", 6))).wait();
    await (await demoUsdc.mint(buyer.address, ethers.parseUnits("100000", 6))).wait();

    const now = BigInt(Math.floor(Date.now() / 1000));
    const dueDate = now + 14n * 24n * 60n * 60n;

    await (await receivableRegistry.connect(seller).createReceivable(
      buyer.address,
      ethers.parseUnits("1000", 6),
      ethers.parseUnits("700", 6),
      0,
      now,
      dueDate,
      ethers.keccak256(ethers.toUtf8Bytes("doc-1")),
      "BW-TEST-1",
    )).wait();

    await (await receivableRegistry.connect(buyer).acknowledgeReceivable(1, true)).wait();

    await (await demoUsdc.connect(lp).approve(await advanceEngine.getAddress(), ethers.parseUnits("700", 6))).wait();
    await (await advanceEngine.connect(lp).fundReceivable(1)).wait();

    await (await demoUsdc.connect(buyer).approve(await settlementRouter.getAddress(), ethers.parseUnits("1000", 6))).wait();
    await (await settlementRouter.connect(buyer).settleReceivable(1, ethers.keccak256(ethers.toUtf8Bytes("settle-1")), 1)).wait();

    const settledReceivable = await receivableRegistry.getReceivable(1);
    expect(settledReceivable.status).to.equal(6n);

    const sellerBalance = await demoUsdc.balanceOf(seller.address);
    const lpBalance = await demoUsdc.balanceOf(lp.address);
    expect(sellerBalance).to.equal(ethers.parseUnits("953", 6));
    expect(lpBalance).to.equal(ethers.parseUnits("100042", 6));

    await (await receivableRegistry.connect(seller).createReceivable(
      buyer.address,
      ethers.parseUnits("500", 6),
      ethers.parseUnits("300", 6),
      0,
      now,
      dueDate,
      ethers.keccak256(ethers.toUtf8Bytes("doc-2")),
      "BW-TEST-2",
    )).wait();
    await (await receivableRegistry.connect(buyer).acknowledgeReceivable(2, true)).wait();
    await (await disputeEscrow.connect(buyer).openDispute(2, ethers.keccak256(ethers.toUtf8Bytes("amount mismatch")))).wait();
    await (await disputeEscrow.connect(seller).resolveDispute(2, false, ethers.keccak256(ethers.toUtf8Bytes("resolved")))).wait();

    const disputedReceivable = await receivableRegistry.getReceivable(2);
    expect(disputedReceivable.status).to.equal(3n);

    const disputeRecord = await disputeEscrow.getDispute(2);
    expect(disputeRecord.status).to.equal(2n);

    expect(await fundingPool.totalLiquidity()).to.equal(0n);
  });
});
