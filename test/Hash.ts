import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";
import { generateLoanHash } from "./helpers/generateHash";

describe("Lendeefi hash", function () {
  let lendeefi: any;
  let owner;

  before(async () => {
    await hre.network.provider.send("hardhat_reset");
  });

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    const LENDEEFI_CONTRACT = await ethers.getContractFactory("Lendeefi");
    lendeefi = await LENDEEFI_CONTRACT.deploy(1);
    await lendeefi.deployed();
  });

  it("should generate same hash locally and on chain", async function () {
    const localHash = generateLoanHash({
        offeror: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        nftContract: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        nftId: 1,
        saleExpiration: 1,
        saleContract: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        saleAmount: 1,
        termUntilCollateralAtRisk: 1,
        buybackContract: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        buybackAmount: 2
      })
    
    
      const input = {
        offeror: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        nftContract: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        nftId: 1,
        saleExpiration: 1,
        saleContract: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        saleAmount: 1,
        termUntilCollateralAtRisk: 1,
        buybackContract: '0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9',
        buybackAmount: 2
      };
    
    
      const hash = await lendeefi.generateHash(input);
    
      expect(localHash).to.equal(hash);
  });
});
