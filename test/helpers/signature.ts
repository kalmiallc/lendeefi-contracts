import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";

export async function getSignature(
  messageHash: string,
  signer: SignerWithAddress
): Promise<{ v: number; r: string; s: string; kind: number }> {
  // Sign the message hash
  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  
  // Split signature into v, r, s components
  const sig = ethers.utils.splitSignature(signature);
  
  // Return in the required format
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s,
    kind: 0  // Fixed value as requested
  };
}