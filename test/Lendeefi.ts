import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";
import { getCurrentTime } from "./helpers/common";
import { generateLoanHash } from "./helpers/generateHash";
import { SimpleMerkleTree } from "@openzeppelin/merkle-tree";
import { getSignature } from "./helpers/signature";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Lendeefi", function () {
  let lendeefi: any;
  let nfMock: any;
  let tokenMock: any;
  let owner: any;
  let jane: any;
  let bob: any;

  beforeEach(async () => {
    await hre.network.provider.send("hardhat_reset");
    [owner, jane, bob] = await ethers.getSigners();

    // Deploy NFT Mock
    const NFMock = await ethers.getContractFactory("NFTMock");
    nfMock = await NFMock.deploy();
    await nfMock.deployed();

    // Deploy Token Mock
    const TokenMock = await ethers.getContractFactory("TokenMock");
    tokenMock = await TokenMock.deploy();
    await tokenMock.deployed();

    // Deploy Lendeefi
    const Lendeefi = await ethers.getContractFactory("Lendeefi");
    lendeefi = await Lendeefi.deploy(10); // 0.01%
    await lendeefi.deployed();
  });

  it("Successfully creates a loan", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60, // 1 minute
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };
    
    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    // TODO: getSignature is generated via AI. Check if it's correct..
    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    const nf1owner = await nfMock.ownerOf(1);
    const janeBalance = await tokenMock.balanceOf(jane.address);
    const lendeefiBalance = await tokenMock.balanceOf(lendeefi.address);

    expect(nf1owner).to.equal(lendeefi.address);
    expect(janeBalance).to.equal("1000000000000000000");
    expect(lendeefiBalance).to.equal("1000000000000000");
  });

  it("Successfully creates a loan with 0 fees", async function () {
    const Lendeefi = await ethers.getContractFactory("Lendeefi");
    const lendeefiZeroFee = await Lendeefi.deploy(0);
    await lendeefiZeroFee.deployed();

    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefiZeroFee.address, true);
    await tokenMock.approve(lendeefiZeroFee.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefiZeroFee.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    const nf1owner = await nfMock.ownerOf(1);
    const janeBalance = await tokenMock.balanceOf(jane.address);
    const lendeefiBalance = await tokenMock.balanceOf(lendeefiZeroFee.address);

    expect(nf1owner).to.equal(lendeefiZeroFee.address);
    expect(janeBalance).to.equal("1000000000000000000");
    expect(lendeefiBalance).to.equal("0");
  });

  it("Successfully creates multiple loans from the same root", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.mint(jane.address, 2);
    await nfMock.mint(bob.address, 3);
    await nfMock.mint(bob.address, 4);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await nfMock.connect(bob).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claimData2 = { ...claimData, nftId: 2 };
    const claimData3 = { ...claimData, nftId: 3 };
    const claimData4 = { ...claimData, nftId: 4 };

    const claim = generateLoanHash(claimData);
    const claim2 = generateLoanHash(claimData2);
    const claim3 = generateLoanHash(claimData3);
    const claim4 = generateLoanHash(claimData4);
    
    const values = [
      claim,
      claim2,
      claim3,
      claim4,
    ];
    
    const tree = SimpleMerkleTree.of(values);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    const nf1owner = await nfMock.ownerOf(1);
    const janeBalance = await tokenMock.balanceOf(jane.address);
    const lendeefiBalance = await tokenMock.balanceOf(lendeefi.address);

    expect(nf1owner).to.equal(lendeefi.address);
    expect(janeBalance).to.equal("1000000000000000000");
    expect(lendeefiBalance).to.equal("1000000000000000");

    const proof4 = tree.getProof(3);
    await lendeefi.connect(bob).createLoan(
      claimData4,
      root,
      proof4,
      signature
    );

    const nf4owner = await nfMock.ownerOf(4);
    const bobBalance = await tokenMock.balanceOf(bob.address);
    const lendeefiBalance2 = await tokenMock.balanceOf(lendeefi.address);

    expect(nf4owner).to.equal(lendeefi.address);
    expect(bobBalance).to.equal("1000000000000000000");
    expect(lendeefiBalance2).to.equal("2000000000000000");
  });

  it("reverts createLoan if loan offer expired", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() - 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await expect(
      lendeefi.connect(jane).createLoan(
        claimData,
        root,
        proof,
        signature
      )
    ).to.be.revertedWith("The offer is expired");
  });

  it("Successfully repays a loan", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(jane.address, "1000000000000000000000");
    await tokenMock.connect(jane).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await lendeefi.connect(jane).repayLoan(claim);

    const nf1owner = await nfMock.ownerOf(1);
    const janeBalance = await tokenMock.balanceOf(jane.address);
    const ownerBalance = await tokenMock.balanceOf(owner.address);

    expect(nf1owner).to.equal(jane.address);
    expect(janeBalance).to.equal("999000000000000000000");
    expect(ownerBalance).to.equal("999000999000000000000000");

    await expect(
      lendeefi.connect(owner).defaultLoan(claim)
    ).to.be.revertedWith("Loan does not exist or was already repaid");
  });

  it("Successfully repays a loan after free-for-all period", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(bob.address, "1000000000000000000000");
    await tokenMock.connect(bob).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    // Advance time 6 days
    await time.increase(86400 * 6);

    await expect(
      lendeefi.connect(bob).repayLoan(claim)
    ).to.be.revertedWith("Before default time, only Borrower can repay");

    // Advance time 2 more days
    await time.increase(86400 * 2);

    await lendeefi.connect(bob).repayLoan(claim);

    const nf1owner = await nfMock.ownerOf(1);
    const janeBalance = await tokenMock.balanceOf(jane.address);
    const bobBalance = await tokenMock.balanceOf(bob.address);
    const ownerBalance = await tokenMock.balanceOf(owner.address);

    expect(nf1owner).to.equal(bob.address);
    expect(janeBalance).to.equal("1000000000000000000");
    expect(bobBalance).to.equal("998000000000000000000");
    expect(ownerBalance).to.equal("999000999000000000000000");
  });

  it("Successfully defaults a loan", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(jane.address, "1000000000000000000000");
    await tokenMock.connect(jane).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 1000000000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await time.increase(70);

    await lendeefi.connect(owner).defaultLoan(claim);

    const nf1owner = await nfMock.ownerOf(1);
    expect(nf1owner).to.equal(owner.address);

    await expect(
      lendeefi.connect(jane).repayLoan(claim)
    ).to.be.revertedWith("Loan does not exist or was already repaid");
  });

  it("reverts loan default if not in default period", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(jane.address, "1000000000000000000000");
    await tokenMock.connect(jane).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 1000000000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await expect(
      lendeefi.connect(owner).defaultLoan(claim)
    ).to.be.revertedWith("Cannot default until loan expiration");
  });

  it("reverts if non-lender tries to default loan", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(jane.address, "1000000000000000000000");
    await tokenMock.connect(jane).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 1000000000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await time.increase(70);

    await expect(
      lendeefi.connect(jane).defaultLoan(claim)
    ).to.be.revertedWith("Only lender can default a loan");
  });

  it("reverts when defaulting the same loan twice", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(jane.address, "1000000000000000000000");
    await tokenMock.connect(jane).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 1000000000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await time.increase(70);

    await lendeefi.connect(owner).defaultLoan(claim);
    
    await expect(
      lendeefi.connect(owner).defaultLoan(claim)
    ).to.be.revertedWith("Loan does not exist or was already repaid");
  });

  it("reverts when repaying the same loan twice", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(jane.address, "1000000000000000000000");
    await tokenMock.connect(jane).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 1000000000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await lendeefi.connect(jane).repayLoan(claim);
    
    await expect(
      lendeefi.connect(jane).repayLoan(claim)
    ).to.be.revertedWith("Loan does not exist or was already repaid");
  });

  it("reverts createLoan if root deactivated", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(owner).deactivateRoot(root);
    
    await expect(
      lendeefi.connect(jane).createLoan(
        claimData,
        root,
        proof,
        signature
      )
    ).to.be.revertedWith("This claim root had been deactivated");
  });

  it("reverts createLoan if signature invalid", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const fakeClaimData = { ...claimData, nftId: 2 };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const fakeClaim = generateLoanHash(fakeClaimData);
    
    const fakeTree = SimpleMerkleTree.of([fakeClaim]);
    const fakeRoot = fakeTree.root;

    const signature = await getSignature(fakeRoot, owner);
    
    await expect(
      lendeefi.connect(jane).createLoan(
        claimData,
        root,
        proof,
        signature
      )
    ).to.be.revertedWith("Invalid signature");
  });

  it("reverts when creating duplicate loan", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await expect(
      lendeefi.connect(jane).createLoan(
        claimData,
        root,
        proof,
        signature
      )
    ).to.be.reverted;
  });

  it("reverts when lender has not approved funds", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    // Deliberately skip approval

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await expect(
      lendeefi.connect(jane).createLoan(
        claimData,
        root,
        proof,
        signature
      )
    ).to.be.reverted;
  });

  it("Successfully creates new loan after previous loan repaid", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");
    await tokenMock.transfer(jane.address, "1000000000000000000000");
    await tokenMock.connect(jane).approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await lendeefi.connect(jane).repayLoan(claim);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    const nf1owner = await nfMock.ownerOf(1);
    const janeBalance = await tokenMock.balanceOf(jane.address);
    const lendeefiBalance = await tokenMock.balanceOf(lendeefi.address);

    expect(nf1owner).to.equal(lendeefi.address);
    expect(janeBalance).to.equal("1000000000000000000000");
    expect(lendeefiBalance).to.equal("2000000000000000");
  });

  it("reverts if non-borrower tries to repay before free-for-all period", async function () {
    await nfMock.mint(jane.address, 1);
    await nfMock.connect(jane).setApprovalForAll(lendeefi.address, true);
    await tokenMock.approve(lendeefi.address, "1000000000000000000000");

    const claimData = {
      lender: owner.address,
      nftContract: nfMock.address,
      nftId: 1,
      offerExpiration: await getCurrentTime() + 10000,
      lendToken: tokenMock.address,
      lendAmount: "1000000000000000000",
      loanDuration: 60,
      repayToken: tokenMock.address,
      repayAmount: "2000000000000000000",
    };

    const claim = generateLoanHash(claimData);
    
    const tree = SimpleMerkleTree.of([claim]);
    const proof = tree.getProof(0);
    const root = tree.root;

    const signature = await getSignature(root, owner);

    await lendeefi.connect(jane).createLoan(
      claimData,
      root,
      proof,
      signature
    );

    await expect(
      lendeefi.connect(bob).repayLoan(claim)
    ).to.be.revertedWith("Before default time, only Borrower can repay");
  });
});
