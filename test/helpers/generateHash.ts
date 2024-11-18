import { ethers } from "ethers";

/**
 * Generates order hash from input data.
 */
export function generateLoanHash(input: any): string {

    return ethers.utils.solidityKeccak256(
        ['string', 'address', 'address', 'uint256', 'uint256', 'address', 'uint256', 'uint256', 'address', 'uint256'],
        [
          'com.lendeefi.loan|',
          input.lender,
          input.nftContract,
          input.nftId,
          input.offerExpiration,
          input.lendToken,
          input.lendAmount,
          input.loanDuration,
          input.repayToken,
          input.repayAmount,
        ],
      );
}