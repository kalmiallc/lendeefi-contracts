# LendeeFi Contracts

This repository contains the core smart contracts for LendeeFi, a decentralized cross-chain lending and borrowing platform designed to enable collateralized lending with NFTs and RWA crypto assets. These contracts manage the primary operations, such as loan creation, repayments, collateral management, etc.

## Overview

LendeeFi aims to bridge the gap between NFTs, real-world assets (RWAs), and decentralized finance (DeFi), allowing users to leverage their holdings as collateral for loans. Key features include:

- **Collateralized Lending**: Use NFTs, real-world assets (RWAs), and other crypto assets as collateral.
- **Lend and Borrow Across Chains**: Seamlessly lend and borrow crypto across multiple blockchains.
- **Decentralized Protocol**: Fully on-chain operations for trustless interactions.
- **Adjustable Lending Terms**: Dynamic length, APY and repayment conditions for each borrowing situation.
- **Ready APIs**: APIs for easy and seamless integration.

For a detailed introduction to the platform and its architecture, see the [LendeeFi Landing Page](https://lendeefi.com/).

## Repository Structure

The repository is structured as follows:

- **`/contracts`**: Core smart contracts for the LendeeFi protocol.
- **`/test`**: Unit and integration tests to ensure contract reliability.
- **`/scripts`**: Deployment and management scripts for the contracts.

## Getting Started

### Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/)
- [Hardhat](https://hardhat.org/)
- [Solidity](https://soliditylang.org/)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/kalmiallc/lendeefi-contracts.git
cd lendeefi-contracts
npm i
```


### Running Tests

```bash
npx hardhat test
```


## More information
For more information about LendeeFi, visit [our website](https://lendeefi.com/) or [contact](https://calendly.com/klemen-kalmia) us direcly.