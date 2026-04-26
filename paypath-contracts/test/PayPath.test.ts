import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const USDC_DECIMALS = 6;
const toUSDC = (n: number) => BigInt(n) * BigInt(10 ** USDC_DECIMALS);

describe("PayPath Protocol", () => {
  let owner: HardhatEthersSigner, employer: HardhatEthersSigner,
      worker: HardhatEthersSigner, agent: HardhatEthersSigner, feeRecipient: HardhatEthersSigner;
  let usdc: any, registry: any, attestation: any, payroll: any, credit: any;

  beforeEach(async () => {
    [owner, employer, worker, agent, feeRecipient] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.mint(employer.address, toUSDC(100_000));
    await usdc.mint(owner.address, toUSDC(100_000)); // treasury seed

    // Deploy protocol
    const Registry    = await ethers.getContractFactory("PayPathRegistry");
    const Attestation = await ethers.getContractFactory("PayPathAttestation");
    const Payroll     = await ethers.getContractFactory("PayPathPayroll");
    const Credit      = await ethers.getContractFactory("PayPathCredit");

    registry    = await Registry.deploy();
    attestation = await Attestation.deploy();
    payroll     = await Payroll.deploy(
      await usdc.getAddress(),
      await registry.getAddress(),
      await attestation.getAddress(),
      feeRecipient.address
    );
    credit = await Credit.deploy(
      await usdc.getAddress(),
      await attestation.getAddress()
    );

    // Wire
    await attestation.setPayrollContract(await payroll.getAddress());
    await registry.setPayrollContract(await payroll.getAddress());

    // Fund credit treasury
    await usdc.connect(owner).approve(await credit.getAddress(), toUSDC(10_000));
    await credit.connect(owner).fundTreasury(toUSDC(10_000));
  });

  // ── Registry tests ──────────────────────────────────────────────────────

  describe("PayPathRegistry", () => {
    it("registers an employer", async () => {
      await registry.connect(employer).registerEmployer("acme.base.eth");
      const e = await registry.employers(employer.address);
      expect(e.verified).to.be.true;
      expect(e.basename).to.equal("acme.base.eth");
    });

    it("registers a worker", async () => {
      await registry.connect(worker).registerWorker("amara.base.eth");
      const w = await registry.workers(worker.address);
      expect(w.wallet).to.equal(worker.address);
      expect(w.basename).to.equal("amara.base.eth");
    });

    it("prevents double registration", async () => {
      await registry.connect(employer).registerEmployer("acme.base.eth");
      await expect(registry.connect(employer).registerEmployer("acme2.base.eth"))
        .to.be.revertedWith("Already registered");
    });

    it("authorizes and revokes an agent", async () => {
      await registry.connect(employer).registerEmployer("acme.base.eth");
      await registry.connect(employer).authorizeAgent(agent.address);
      expect(await registry.isAuthorized(agent.address, employer.address)).to.be.true;

      await registry.connect(employer).revokeAgent(agent.address);
      expect(await registry.isAuthorized(agent.address, employer.address)).to.be.false;
    });
  });

  // ── Payroll tests ────────────────────────────────────────────────────────

  describe("PayPathPayroll", () => {
    beforeEach(async () => {
      await registry.connect(employer).registerEmployer("acme.base.eth");
      await registry.connect(worker).registerWorker("amara.base.eth");
      await usdc.connect(employer).approve(await payroll.getAddress(), toUSDC(100_000));
    });

    it("creates a payment schedule", async () => {
      const firstPay = Math.floor(Date.now() / 1000) + 86400;
      const tx = await payroll.connect(employer).createSchedule(
        employer.address, worker.address, toUSDC(800), firstPay, 30
      );
      await expect(tx).to.emit(payroll, "ScheduleCreated");
      const sched = await payroll.schedules(0);
      expect(sched.amountUSDC).to.equal(toUSDC(800));
      expect(sched.active).to.be.true;
    });

    it("executes a payment, mints NFT, deducts fee", async () => {
      const firstPay = Math.floor(Date.now() / 1000) - 1; // due now
      await payroll.connect(employer).createSchedule(
        employer.address, worker.address, toUSDC(800), firstPay, 30
      );

      const workerBefore = await usdc.balanceOf(worker.address);
      const feeBefore    = await usdc.balanceOf(feeRecipient.address);

      const tx = await payroll.executePayment(0);
      await expect(tx).to.emit(payroll, "PaymentExecuted");

      const gross    = toUSDC(800);
      const fee      = (gross * 150n) / 10000n;
      const net      = gross - fee;

      expect(await usdc.balanceOf(worker.address)).to.equal(workerBefore + net);
      expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore + fee);

      // Worker should own receipt NFT
      expect(await payroll.balanceOf(worker.address)).to.equal(1n);
    });

    it("cannot execute before pay date", async () => {
      const firstPay = Math.floor(Date.now() / 1000) + 86400; // tomorrow
      await payroll.connect(employer).createSchedule(
        employer.address, worker.address, toUSDC(800), firstPay, 30
      );
      await expect(payroll.executePayment(0)).to.be.revertedWith("not yet due");
    });

    it("advances schedule to next pay date after execution", async () => {
      const firstPay = Math.floor(Date.now() / 1000) - 1;
      await payroll.connect(employer).createSchedule(
        employer.address, worker.address, toUSDC(800), firstPay, 30
      );
      await payroll.executePayment(0);
      const sched = await payroll.schedules(0);
      expect(sched.nextPayDate).to.be.gt(firstPay);
    });

    it("agent can execute payment", async () => {
      await registry.connect(employer).authorizeAgent(agent.address);
      const firstPay = Math.floor(Date.now() / 1000) - 1;
      // Agent creates schedule on behalf of employer
      await payroll.connect(agent).createSchedule(
        employer.address, worker.address, toUSDC(500), firstPay, 7
      );
      await expect(payroll.connect(agent).executePayment(0)).to.not.be.reverted;
    });
  });

  // ── Attestation tests ────────────────────────────────────────────────────

  describe("PayPathAttestation", () => {
    beforeEach(async () => {
      await registry.connect(employer).registerEmployer("acme.base.eth");
      await registry.connect(worker).registerWorker("amara.base.eth");
      await usdc.connect(employer).approve(await payroll.getAddress(), toUSDC(100_000));
    });

    it("builds income profile after payments", async () => {
      const firstPay = Math.floor(Date.now() / 1000) - 1;
      await payroll.connect(employer).createSchedule(
        employer.address, worker.address, toUSDC(800), firstPay, 30
      );
      await payroll.executePayment(0);

      const profile = await attestation.getProfile(worker.address);
      expect(profile.paymentCount).to.equal(1n);
      expect(profile.monthsActive).to.equal(1n);
      expect(profile.totalUSDC).to.be.gt(0n);
    });

    it("worker not eligible before 3 months", async () => {
      expect(await attestation.isCreditEligible(worker.address)).to.be.false;
    });

    it("worker eligible after 3 months and $500+", async () => {
      // Simulate 3 months by directly calling recordPayment as payroll
      // (In real test, we'd execute 3 payments 25+ days apart)
      const payrollSigner = await ethers.getImpersonatedSigner(await payroll.getAddress());
      await owner.sendTransaction({ to: await payroll.getAddress(), value: ethers.parseEther("0.1") });

      await attestation.connect(payrollSigner).recordPayment(worker.address, toUSDC(800));
      await time.increase(26 * 24 * 3600); // 26 days
      await attestation.connect(payrollSigner).recordPayment(worker.address, toUSDC(800));
      await time.increase(26 * 24 * 3600);
      await attestation.connect(payrollSigner).recordPayment(worker.address, toUSDC(800));

      expect(await attestation.isCreditEligible(worker.address)).to.be.true;
      const limit = await attestation.getCreditLimit(worker.address);
      expect(limit).to.be.gt(0n);
    });
  });

  // ── Credit tests ─────────────────────────────────────────────────────────

  describe("PayPathCredit", () => {
    beforeEach(async () => {
      await registry.connect(worker).registerWorker("amara.base.eth");

      // Simulate 3 months of income
      const payrollSigner = await ethers.getImpersonatedSigner(await payroll.getAddress());
      await owner.sendTransaction({ to: await payroll.getAddress(), value: ethers.parseEther("0.1") });
      for (let i = 0; i < 3; i++) {
        await attestation.connect(payrollSigner).recordPayment(worker.address, toUSDC(1000));
        if (i < 2) await time.increase(26 * 24 * 3600);
      }

      // Give worker some USDC for repayment
      await usdc.mint(worker.address, toUSDC(500));
    });

    it("eligible worker can borrow", async () => {
      const limit = await attestation.getCreditLimit(worker.address);
      expect(limit).to.be.gt(0n);

      const balBefore = await usdc.balanceOf(worker.address);
      await credit.connect(worker).borrow(toUSDC(50));
      expect(await usdc.balanceOf(worker.address)).to.equal(balBefore + toUSDC(50));
      expect(await credit.hasActiveLoan(worker.address)).to.be.true;
    });

    it("cannot borrow above credit limit", async () => {
      const limit = await attestation.getCreditLimit(worker.address);
      await expect(credit.connect(worker).borrow(limit + toUSDC(1)))
        .to.be.revertedWith("exceeds credit limit");
    });

    it("cannot have two loans at once", async () => {
      await credit.connect(worker).borrow(toUSDC(20));
      await expect(credit.connect(worker).borrow(toUSDC(10)))
        .to.be.revertedWith("existing loan outstanding");
    });

    it("worker can repay loan", async () => {
      await credit.connect(worker).borrow(toUSDC(50));
      const loan = await credit.getLoan(worker.address);
      const total = loan.principal + loan.interestOwed;
      await usdc.connect(worker).approve(await credit.getAddress(), total);
      await credit.connect(worker).repay();
      expect(await credit.hasActiveLoan(worker.address)).to.be.false;
    });

    it("correctly computes interest", async () => {
      await credit.connect(worker).borrow(toUSDC(100));
      const loan = await credit.getLoan(worker.address);
      // 4% APR for 30 days on $100 = $100 * 0.04 * 30/365 ≈ $0.33
      const expectedInterest = (toUSDC(100) * 400n * 30n) / (365n * 10000n);
      expect(loan.interestOwed).to.be.closeTo(expectedInterest, toUSDC(1) / 100n);
    });
  });
});
