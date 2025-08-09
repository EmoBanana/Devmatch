## Links
- Video : https://youtu.be/0kC02I2-VDg
- Pitch Deck : https://www.canva.com/design/DAGvmZOHU0I/gp4p3XARwfh4-7Dkx9_TIg/edit
- ETH Contract : https://sepolia.etherscan.io/address/0x1a9e1ea8123bbcf29ea17ee23ccdf712406c170d
- Oasis Contract : https://explorer.oasis.io/testnet/sapphire/address/0xD13462d1B884A262A9271AD13e3C0949B13663e9

## 🧬 DeSci Fundraising Platform

A blockchain-powered platform that enables transparent, milestone-based fundraising for scientific research — empowering researchers, ensuring donor trust, and accelerating global scientific progress.

### 🌟 Overview
Innovateth bridges the gap between scientists and funders by leveraging decentralised finance principles. The platform enables trustless, verifiable, and milestone-driven research funding so projects can be supported by anyone, anywhere, without traditional institutional bottlenecks. By combining smart contracts, community governance, and open science principles, we make research funding faster, fairer, and more transparent.

### 🚀 Key Features
- **Milestone-Based Funding**: Funds are released in stages as research teams submit verifiable results and updates.
- **DAO Governance**: Supporters vote on which projects to fund and approve milestone completions.
- **Global Accessibility**: Anyone can contribute from anywhere without intermediaries.
- **Transparency by Design**: All transactions, proposals, and updates are publicly verifiable on-chain.


### 🎯 Why This Matters
- **For Researchers**: Direct, global access to funding without bureaucratic delays.
- **For Donors**: Accountability through on-chain milestone verification.
- **For the World**: Accelerates innovation in health, environment, and technology.

---

### Project tech
Built on Scaffold-ETH 2 with Next.js App Router, Wagmi, RainbowKit, Viem, and Foundry.

- **Smart contract**: `Innovateth.sol`
- **Frontend**: Next.js with scaffold-eth hooks and components
- **Network**: Sepolia by default 

### Requirements

- **Node**: >= 20.18.3
- **Yarn**: 3.x (Berry) — the repo pins `yarn@3.2.3`
- **Git**: latest

### Monorepo layout

- `packages/foundry`: Solidity contracts, deployment scripts, tests
- `packages/nextjs`: Frontend app, scaffold-eth components and hooks

---

## Quickstart (local)

1) Install deps

```bash
yarn install
```

2) Start a local chain (Anvil)

```bash
yarn chain
```

3) Deploy contracts to local chain

```bash
yarn deploy
```

4) Run the frontend

```bash
yarn start
```

---

## Scripts

From repo root:

- **Start local chain**: `yarn chain`
- **Deploy**: `yarn deploy`
- **Frontend dev**: `yarn start`
- **Compile**: `yarn compile`
- **Test (Foundry)**: `yarn foundry:test`
- **Lint/format**: `yarn lint`, `yarn format`

All scripts proxy to the relevant workspace under the hood (see `package.json`).

---

## Development notes

- Frontend uses scaffold-eth hooks for contract I/O:
  - Read: `useScaffoldReadContract`
  - Write: `useScaffoldWriteContract`
  - Events: `useScaffoldEventHistory`
- To interact with locally deployed contracts in the UI, ensure `packages/nextjs/contracts/deployedContracts.ts` contains your local chain deployment for `Innovateth`.

---

## Testing

```bash
yarn foundry:test
```

Add tests in `packages/foundry/test`.

---

## Deploying to a live network

1) Set RPC/keys in `packages/foundry/.env` (copied from `.env.example` on install)
2) Deploy with the workspace script

```bash
yarn foundry:deploy
```

Optional: verify with `yarn foundry:verify`.

Update the frontend contract config in:
- `packages/nextjs/contracts/deployedContracts.ts` (own deployments)
- `packages/nextjs/contracts/externalContracts.ts` (3rd-party or predeployed)

---

## License

See `LICENCE` in this repository.
