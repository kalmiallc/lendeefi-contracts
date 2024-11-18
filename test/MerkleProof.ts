import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";
import { SimpleMerkleTree } from "@openzeppelin/merkle-tree";
import { generateLoanHash } from "./helpers/generateHash";

describe("MerkleMock", function () {
  let merkle: any;
  let owner;

  before(async () => {
    await hre.network.provider.send("hardhat_reset");
  });

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    const MERKLEMOCK_CONTRACT = await ethers.getContractFactory("MerkleMock");
    merkle = await MERKLEMOCK_CONTRACT.deploy();
    await merkle.deployed();
  });

  it("should run", async function () {
    const hash = generateLoanHash({
      offeror: "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9",
      nftContract: "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9", 
      nftId: 1,
      saleExpiration: 1,
      saleContract: "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9",
      saleAmount: 1,
      termUntilCollateralAtRisk: 1,
      buybackContract: "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9",
      buybackAmount: 2
    });

    const tree = SimpleMerkleTree.of([hash]);

    const proof = tree.getProof(0);

    const rootContract = await merkle.merkleProof(
      "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9",
      "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9",
      1,
      1,
      "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9",
      1,
      1,
      "0x44e44897FC076Bc46AaE6b06b917D0dfD8B2dae9",
      2,
      tree.root,
      proof
    );

    expect(rootContract).to.be.true;
  });
});
