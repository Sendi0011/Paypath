import { ethers, network } from "hardhat";

// USDC addresses
const USDC: Record<string, string> = {
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  base:        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  hardhat:     "0x0000000000000000000000000000000000000000", // deploy mock
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = network.name;

  console.log(`\n🚀 Deploying PayPath to ${net}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // ── 1. Registry ──────────────────────────────────────────────────────────
  console.log("1️⃣  Deploying PayPathRegistry...");
  const Registry = await ethers.getContractFactory("PayPathRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log(`   ✅ Registry: ${await registry.getAddress()}`);

  // ── 2. Attestation ───────────────────────────────────────────────────────
  console.log("2️⃣  Deploying PayPathAttestation...");
  const Attestation = await ethers.getContractFactory("PayPathAttestation");
  const attestation = await Attestation.deploy();
  await attestation.waitForDeployment();
  console.log(`   ✅ Attestation: ${await attestation.getAddress()}`);

  // ── 3. Payroll ───────────────────────────────────────────────────────────
  console.log("3️⃣  Deploying PayPathPayroll...");
  const usdcAddress = USDC[net] || USDC["baseSepolia"];
  const Payroll = await ethers.getContractFactory("PayPathPayroll");
  const payroll = await Payroll.deploy(
    usdcAddress,
    await registry.getAddress(),
    await attestation.getAddress(),
    deployer.address // fee recipient — update to multisig in prod
  );
  await payroll.waitForDeployment();
  console.log(`   ✅ Payroll: ${await payroll.getAddress()}`);

  // ── 4. Credit ────────────────────────────────────────────────────────────
  console.log("4️⃣  Deploying PayPathCredit...");
  const Credit = await ethers.getContractFactory("PayPathCredit");
  const credit = await Credit.deploy(usdcAddress, await attestation.getAddress());
  await credit.waitForDeployment();
  console.log(`   ✅ Credit: ${await credit.getAddress()}`);

  // ── 5. Wire contracts ────────────────────────────────────────────────────
  console.log("\n5️⃣  Wiring contracts...");

  // Tell attestation which payroll contract can write to it
  let tx = await attestation.setPayrollContract(await payroll.getAddress());
  await tx.wait();
  console.log("   ✅ Attestation.setPayrollContract done");

  // Tell registry which payroll contract can update stats
  tx = await registry.setPayrollContract(await payroll.getAddress());
  await tx.wait();
  console.log("   ✅ Registry.setPayrollContract done");

  // Register EAS schema (only on live networks where EAS is deployed)
  if (net !== "hardhat") {
    try {
      tx = await attestation.registerSchema();
      const receipt = await tx.wait();
      console.log("   ✅ EAS schema registered");
    } catch (e) {
      console.log("   ⚠️  Schema registration skipped (EAS may not be on this network)");
    }
  }

  // ── 6. Print summary ─────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("═".repeat(60));
  console.log(`Network:     ${net}`);
  console.log(`USDC:        ${usdcAddress}`);
  console.log(`Registry:    ${await registry.getAddress()}`);
  console.log(`Attestation: ${await attestation.getAddress()}`);
  console.log(`Payroll:     ${await payroll.getAddress()}`);
  console.log(`Credit:      ${await credit.getAddress()}`);
  console.log("═".repeat(60));
  console.log("\n📝 Update src/contracts/abis.ts with these addresses!\n");

  // Write addresses to a file for easy copy-paste
  const fs = require("fs");
  const addresses = {
    network: net,
    usdc: usdcAddress,
    registry:    await registry.getAddress(),
    attestation: await attestation.getAddress(),
    payroll:     await payroll.getAddress(),
    credit:      await credit.getAddress(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };
  fs.writeFileSync(
    `deployments/${net}.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log(`✅ Addresses saved to deployments/${net}.json`);

  // ── 7. Verify on BaseScan ────────────────────────────────────────────────
  if (net !== "hardhat") {
    console.log("\n🔍 Verify commands:");
    console.log(`npx hardhat verify --network ${net} ${await registry.getAddress()}`);
    console.log(`npx hardhat verify --network ${net} ${await attestation.getAddress()}`);
    console.log(`npx hardhat verify --network ${net} ${await payroll.getAddress()} "${usdcAddress}" "${await registry.getAddress()}" "${await attestation.getAddress()}" "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${net} ${await credit.getAddress()} "${usdcAddress}" "${await attestation.getAddress()}"`);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
