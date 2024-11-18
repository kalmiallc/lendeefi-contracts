// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.28;

import "./FeeSettable.sol";
import "./SignatureUtil.sol";
import "./DenyReceivingERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/*
Lender -> Person lending tokens
Borrower -> Person borrowing tokens (gives NFT as collateral)
Anybody -> open marketplace (third party can repay loan and get NFT.) - V2 Borrower can update price for open marketplace 

Loan -> Previously called Buyback offer

Support erc20 + native token (automatic wrap to wETH or native functionality

NFT escrow into seperate contract

Ideas:
- loan can be an NFT itself and you can trade whole loan position

Loans are generated offline by Lender. A Borrower starts the process by
executing a loan offer. Here is what happens during that whole process, and during
this whole time an NFT is kept in custody by this contract. Time goes from left
to right.

           │              │              │
Lender     │              │-Can take collateral-------------------------------->
           │              │              │
Borrower   │-Can repay----+--------------+------------------------------------->
           │              │              │
Anybody    │              |              |-Can repay---------------------------->
           |              │              │
           ^ Loan         ^ Loan          ^ Free
             creation       expiration      for all
             time          time            time!

             Borrower
             loses NFT and
             gets lent
             tokens
*/

contract Lendeefi is Ownable, FeeSettable, DenyReceivingERC721, SignatureUtil {


  // A loan offer is created upfront by an lender and can be executed by
  // anybody with the specified NFT.
  struct Loan { // previously BuyBackOffer
    address lender;      // previously offeror
    IERC721 nftContract;
    uint256 nftId;
    IERC20 repayToken;  // previously buybackContract
    uint256 repayAmount; // previously buybackAmount
    uint256 loanExpiration; // previously timeCollateralAtRisk
    address borrower;    // previously liquidator
  }

  /**
    * @notice A lender makes a loan offer offline, this structure represents such an offer.
    * @param lender Who offers this loan
    * @param nftContract Where the collateral NFT is registered
    * @param nftId The registered NFT identifier
    * @param offerExpiration When this loan offer expires
    * @param lendToken Where the loan value is accounted
    * @param lendAmount The amount being lent
    * @param loanDuration How long until the loan can be defaulted
    * @param repayToken Where the repayment value is accounted
    * @param repayAmount The amount needed to repay the loan
    */
  struct LoanInput { // previously BuyBackOfferInput
    address lender;     // previously offeror
    IERC721 nftContract;
    uint256 nftId;

    uint256 offerExpiration; // previously saleExpiration
    IERC20 lendToken;       // previously saleContract
    uint256 lendAmount;     // previously saleAmount
    uint256 loanDuration;   // previously termUntilCollateralAtRisk
    IERC20 repayToken;      // previously buybackContract
    uint256 repayAmount;    // previously buybackAmount
  }

  event LoanCreated ( // previously SoldWithBuybackOffer
    address indexed lender,
    bytes32 indexed loanHash,
    LoanInput input
  );

  event LoanRepaid ( // previously BuyBackOfferExecuted
    address indexed repayer,
    bytes32 indexed loanHash,
    Loan loan
  );
  
  event LoanDefaulted ( // previously BuyBackOfferRevoked
    bytes32 indexed loanHash,
    Loan loan
  );
  
  event RootDeactivated (
    address indexed offeror,
    bytes32 indexed root
  );
  
  mapping(address => mapping(bytes32 => bool)) deactivatedRootsByLender; // previously deactivatedRootsByOfferor
  
  mapping(bytes32 => Loan) activeLoans; // previously activeBuybackOffers

  uint256 constant TIME_UNTIL_FREE_FOR_ALL = 7 days;

  constructor(uint24 initialFeePortion) FeeSettable(initialFeePortion) Ownable(msg.sender) {}

  /**
    * @notice A lender had made a loan offer offline,
    * this function executes such an offer.
    * @param _input Instance of LoanInput
    * @param root Merkle root containing valid loan hashes
    * @param proofs Merkle proof showing loan hash is valid
    * @param _signature Lender's signature authorizing the loan
    */
  function createLoan( 
    LoanInput calldata _input,
    bytes32 root,
    bytes32[] calldata proofs, 
    SignatureData calldata _signature
  )
    external
  {
    uint256 loanExpiration = block.timestamp + _input.loanDuration;
    require(block.timestamp <= _input.offerExpiration, "The offer is expired");
    
    bytes32 loanHash = generateHash(_input);

    require(
      MerkleProof.verify(proofs, root, loanHash),
      "Invalid merkle proof"
    );
    
    require(deactivatedRootsByLender[_input.lender][root] == false, "This claim root had been deactivated");
    require(isValidSignature(_input.lender, root, _signature), "Invalid signature");

    activeLoans[loanHash] = Loan(
      _input.lender,
      _input.nftContract,
      _input.nftId,
      _input.repayToken,
      _input.repayAmount,
      loanExpiration,
      msg.sender // borrower
    );

    // Prepare fee calculation
    uint saleAmountToFee = FeeSettable.calculateFee(_input.lendAmount);

    // Perform transfers
    _input.nftContract.transferFrom(msg.sender, address(this), _input.nftId);
    require(
       _input.lendToken.transferFrom(_input.lender, msg.sender, _input.lendAmount),
      "ERC20 transfer failed."
    );

    require(
       _input.lendToken.transferFrom(_input.lender, address(this), saleAmountToFee),
      "ERC20 transfer failed."
    );

    emit LoanCreated(
      _input.lender,
      loanHash,
      _input
    );
  }

  /**
     * @notice Generates a unique hash for a loan offer
     * @param _input The loan input parameters
     * @return bytes32 Hash uniquely identifying the loan offer
     */
  function generateHash(
    LoanInput calldata _input
  )
    public
    pure
    returns (bytes32)
  {
    return keccak256(abi.encodePacked(
      "com.lendeefi.loan|", 
      _input.lender,
      _input.nftContract,
      _input.nftId,
      _input.offerExpiration,
      _input.lendToken,
      _input.lendAmount,
      _input.loanDuration,
      _input.repayToken,
      _input.repayAmount
    ));
  }
  
  /**
     * @notice Until free-for-all time, only the borrower can repay, after then
     * anyone can repay the loan and claim the NFT
     * @param loanHash The unique identifier of the loan to repay
     */
  function repayLoan(bytes32 loanHash) external { 
    require(activeLoans[loanHash].lender != address(0), "Loan does not exist or was already repaid");
    Loan memory loan = activeLoans[loanHash];

    uint256 defaultTime = loan.loanExpiration + TIME_UNTIL_FREE_FOR_ALL;
    require(
      block.timestamp > defaultTime || msg.sender == loan.borrower,
      "Before default time, only Borrower can repay"
    );

    delete activeLoans[loanHash];
    require(
      loan.repayToken.transferFrom(
        msg.sender,
        loan.lender,
        loan.repayAmount
      ),
      "ERC20 transfer failed."
    );
    
    loan.nftContract.transferFrom(
      address(this),
      msg.sender,
      loan.nftId
    );
    emit LoanRepaid(
      msg.sender,
      loanHash,
      loan
    );
  }

  /**
     * @notice The lender can default a loan and claim the collateral
     * starting at loan expiration time
     * @param loanHash The unique identifier of the loan to default
     */
  function defaultLoan(bytes32 loanHash) external { 
    require(activeLoans[loanHash].lender != address(0), "Loan does not exist or was already repaid");
    Loan memory loan = activeLoans[loanHash];

    require(block.timestamp >= loan.loanExpiration, "Cannot default until loan expiration");
    require(msg.sender == loan.lender, "Only lender can default a loan");

    // Perform revocation
    delete activeLoans[loanHash];        
    loan.nftContract.transferFrom(
      address(this),
      loan.lender,
      loan.nftId
    );
    emit LoanDefaulted(
      loanHash,
      loan
    );
  }

  /**
     * @notice At any time, a lender can deactivate all loan offers associated with
     * a root. Then in the future nobody can use those offers.
     * @param root Merkle root containing loan offers to deactivate
     */
  function deactivateRoot(bytes32 root)
    external
  {
    // No need to check authorization, anybody can deactivate their own offers
    address lender = msg.sender;

    // Perform deactivation
    deactivatedRootsByLender[lender][root] = true;
    emit RootDeactivated(lender, root);
  }

  /**
     * @notice Allows owner to withdraw accumulated fees
     * @param valueContract The token contract to withdraw fees from
     * @param amount The amount of fees to withdraw
     */
  function takeFee(
    IERC20 valueContract,
    uint256 amount
  )
    onlyOwner
    external
  {
    // Perform transfer
    valueContract.transferFrom(address(this), owner(), amount);
  }
}
