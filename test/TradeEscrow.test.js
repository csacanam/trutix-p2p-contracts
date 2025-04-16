const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradeEscrow", function () {
  let usdc, escrow;
  let owner, seller, buyer;

  beforeEach(async () => {
    [owner, seller, buyer] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy TradeEscrow with USDC address
    const TradeEscrow = await ethers.getContractFactory("TradeEscrow");
    escrow = await TradeEscrow.deploy(await usdc.getAddress());

    // Mint USDC to buyer and approve escrow contract
    await usdc.mint(buyer.address, ethers.parseUnits("1000", 6));
    await usdc
      .connect(buyer)
      .approve(await escrow.getAddress(), ethers.parseUnits("1000", 6));
  });

  it("should complete a full trade flow", async () => {
    const tradeAmount = ethers.parseUnits("100", 6); // 100 USDC

    // Seller creates trade
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    );
    const tradeId = event.args.tradeId;

    // Record balances before
    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
    const sellerBalanceBefore = await usdc.balanceOf(seller.address);

    // Buyer pays
    await escrow.connect(buyer).payTrade(tradeId);

    // Seller marks as sent
    await escrow.connect(seller).markAsSent(tradeId);

    // Buyer confirms reception
    await escrow.connect(buyer).confirmReception(tradeId);

    // Record balances after
    const buyerBalanceAfter = await usdc.balanceOf(buyer.address);
    const sellerBalanceAfter = await usdc.balanceOf(seller.address);
    const contractBalance = await usdc.balanceOf(await escrow.getAddress());
    const feeBalance = await escrow.feeBalance();

    const expectedFee = (tradeAmount * BigInt(5)) / BigInt(100); // 5% fee
    const buyerFee = expectedFee;
    const sellerFee = expectedFee;
    const expectedPayout = tradeAmount - sellerFee;
    const expectedTotalPaid = tradeAmount + buyerFee;
    const expectedFeeBalance = buyerFee + sellerFee;

    // Validate balances
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedPayout);
    expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(expectedTotalPaid);
    expect(contractBalance).to.equal(expectedFeeBalance);
    expect(feeBalance).to.equal(expectedFeeBalance);
  });

  it("should allow buyer to confirm reception even after disputing", async () => {
    const tradeAmount = ethers.parseUnits("100", 6);

    // Seller creates and buyer pays
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const tradeId = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    ).args.tradeId;

    // Record balances before
    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);
    const sellerBalanceBefore = await usdc.balanceOf(seller.address);

    await escrow.connect(buyer).payTrade(tradeId);
    await escrow.connect(seller).markAsSent(tradeId);

    // Buyer disputes the trade
    await escrow.connect(buyer).disputeTrade(tradeId);

    // Buyer later confirms reception anyway
    await escrow.connect(buyer).confirmReception(tradeId);

    // Record balances after
    const buyerBalanceAfter = await usdc.balanceOf(buyer.address);
    const sellerBalanceAfter = await usdc.balanceOf(seller.address);
    const contractBalance = await usdc.balanceOf(await escrow.getAddress());
    const feeBalance = await escrow.feeBalance();

    const expectedFee = (tradeAmount * BigInt(5)) / BigInt(100); // 5% fee
    const buyerFee = expectedFee;
    const sellerFee = expectedFee;
    const expectedPayout = tradeAmount - sellerFee;
    const expectedTotalPaid = tradeAmount + buyerFee;
    const expectedFeeBalance = buyerFee + sellerFee;

    // Validate balances
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedPayout);
    expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(expectedTotalPaid);
    expect(contractBalance).to.equal(expectedFeeBalance);
    expect(feeBalance).to.equal(expectedFeeBalance);
  });

  it("should allow owner to resolve a dispute in favor of the buyer", async () => {
    const tradeAmount = ethers.parseUnits("100", 6);

    // Seller creates and buyer pays
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const tradeId = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    ).args.tradeId;

    // Record balances before resolution
    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);

    await escrow.connect(buyer).payTrade(tradeId);
    await escrow.connect(seller).markAsSent(tradeId);
    await escrow.connect(buyer).disputeTrade(tradeId);

    // Owner resolves dispute in favor of the buyer
    await escrow.connect(owner).resolveDispute(tradeId, true);

    // Record balances after
    const buyerBalanceAfter = await usdc.balanceOf(buyer.address);
    const sellerBalanceAfter = await usdc.balanceOf(seller.address);
    const contractBalance = await usdc.balanceOf(await escrow.getAddress());
    const feeBalance = await escrow.feeBalance();

    // Validate balances
    expect(buyerBalanceAfter).to.equal(buyerBalanceBefore);
    expect(sellerBalanceAfter).to.equal(0);
    expect(contractBalance).to.equal(BigInt(0));
    expect(feeBalance).to.equal(BigInt(0));
  });

  it("should allow owner to resolve a dispute in favor of the seller", async () => {
    const tradeAmount = ethers.parseUnits("100", 6);

    // Seller creates and buyer pays
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const tradeId = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    ).args.tradeId;

    // Record balances before
    const sellerBalanceBefore = await usdc.balanceOf(seller.address);
    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);

    await escrow.connect(buyer).payTrade(tradeId);
    await escrow.connect(seller).markAsSent(tradeId);
    await escrow.connect(buyer).disputeTrade(tradeId);

    // Owner resolves dispute in favor of the seller
    await escrow.connect(owner).resolveDispute(tradeId, false);

    // Record balances after
    const sellerBalanceAfter = await usdc.balanceOf(seller.address);
    const buyerBalanceAfter = await usdc.balanceOf(buyer.address);
    const contractBalance = await usdc.balanceOf(await escrow.getAddress());
    const feeBalance = await escrow.feeBalance();

    const expectedFee = (tradeAmount * BigInt(5)) / BigInt(100); // 5% fee
    const buyerFee = expectedFee;
    const sellerFee = expectedFee;
    const expectedPayout = tradeAmount - sellerFee;
    const expectedTotalPaid = tradeAmount + buyerFee;
    const expectedFeeBalance = buyerFee + sellerFee;

    // Validate balances
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedPayout);
    expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(expectedTotalPaid);
    expect(contractBalance).to.equal(expectedFeeBalance);
    expect(feeBalance).to.equal(expectedFeeBalance);
  });

  it("should expire trade if not paid after 12 hours", async () => {
    const tradeAmount = ethers.parseUnits("100", 6);

    // Seller creates the trade
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const tradeId = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    ).args.tradeId;

    // Simulate time passing (13 hours)
    await ethers.provider.send("evm_increaseTime", [13 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    // Attempt to expire the trade
    await escrow.expireTrade(tradeId);

    // Trade status should be Expired (index 4 in TradeStatus enum)
    const trade = await escrow.getTrade(tradeId);
    expect(trade.status).to.equal(4); // TradeStatus.Expired
  });

  it("should release funds to seller if buyer does not confirm after 12 hours", async () => {
    const tradeAmount = ethers.parseUnits("100", 6);

    // Seller creates trade
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const tradeId = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    ).args.tradeId;

    // Record seller balance before auto-completion
    const sellerBalanceBefore = await usdc.balanceOf(seller.address);
    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);

    // Buyer pays
    await escrow.connect(buyer).payTrade(tradeId);

    // Seller marks the ticket as sent
    await escrow.connect(seller).markAsSent(tradeId);

    // Simulate 13 hours passing after sending
    await ethers.provider.send("evm_increaseTime", [13 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    // Expire the trade (will auto-complete it)
    await escrow.expireTrade(tradeId);

    // Trade status should now be Completed (index 3 in TradeStatus)
    const trade = await escrow.getTrade(tradeId);
    expect(trade.status).to.equal(3); // TradeStatus.Completed

    // Check final balances
    const sellerBalanceAfter = await usdc.balanceOf(seller.address);
    const buyerBalanceAfter = await usdc.balanceOf(buyer.address);
    const contractBalance = await usdc.balanceOf(await escrow.getAddress());
    const feeBalance = await escrow.feeBalance();

    const fee = (tradeAmount * BigInt(5)) / BigInt(100);
    const buyerFee = fee;
    const sellerFee = fee;
    const expectedTotalPaid = tradeAmount + buyerFee;
    const expectedPayout = tradeAmount - sellerFee;
    const expectedFeeBalance = buyerFee + sellerFee;

    // Validate balances
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedPayout);
    expect(buyerBalanceBefore - buyerBalanceAfter).to.equal(expectedTotalPaid);
    expect(contractBalance).to.equal(expectedFeeBalance);
    expect(feeBalance).to.equal(expectedFeeBalance);
  });

  it("should refund buyer if trade was paid but not marked as sent after 12 hours", async () => {
    const tradeAmount = ethers.parseUnits("100", 6);

    // Seller creates trade
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const tradeId = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    ).args.tradeId;

    // Record balances before
    const buyerBalanceBefore = await usdc.balanceOf(buyer.address);

    // Buyer pays
    await escrow.connect(buyer).payTrade(tradeId);

    // Simulate 13 hours passing
    await ethers.provider.send("evm_increaseTime", [13 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    // Expire the trade (will trigger refund)
    await escrow.expireTrade(tradeId);

    // Check trade status
    const trade = await escrow.getTrade(tradeId);
    expect(trade.status).to.equal(5); // TradeStatus.Refunded

    // Check balances
    const buyerBalanceAfter = await usdc.balanceOf(buyer.address);
    const sellerBalanceAfter = await usdc.balanceOf(seller.address);
    const contractBalance = await usdc.balanceOf(await escrow.getAddress());
    const feeBalance = await escrow.feeBalance();

    expect(buyerBalanceAfter).to.equal(buyerBalanceBefore);
    expect(sellerBalanceAfter).to.equal(0);
    expect(contractBalance).to.equal(0);
    expect(feeBalance).to.equal(0);
  });

  it("should allow owner to withdraw accumulated platform fees", async () => {
    const tradeAmount = ethers.parseUnits("100", 6);

    // Seller creates trade
    const tx = await escrow.connect(seller).createTrade(tradeAmount);
    const receipt = await tx.wait();
    const tradeId = receipt.logs.find(
      (log) => log.fragment.name === "TradeCreated"
    ).args.tradeId;

    // Buyer pays and seller marks as sent
    await escrow.connect(buyer).payTrade(tradeId);
    await escrow.connect(seller).markAsSent(tradeId);

    // Buyer confirms reception (triggers fee accumulation)
    await escrow.connect(buyer).confirmReception(tradeId);

    // Record owner balance before withdrawal
    const ownerBalanceBefore = await usdc.balanceOf(owner.address);

    // Owner withdraws fees
    await escrow.connect(owner).withdrawFees(owner.address);

    // Record after
    const ownerBalanceAfter = await usdc.balanceOf(owner.address);
    const contractBalance = await usdc.balanceOf(await escrow.getAddress());
    const feeBalance = await escrow.feeBalance();

    const fee = (tradeAmount * BigInt(5)) / BigInt(100);
    const buyerFee = fee;
    const sellerFee = fee;
    const expectedFeeBalance = buyerFee + sellerFee;

    // Validate that owner received the fees
    expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFeeBalance);
    expect(contractBalance).to.equal(0);
    expect(feeBalance).to.equal(0);
  });
});
