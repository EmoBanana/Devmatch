import ABI from "../app/ABI.json";
import type { Abi } from "abitype";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

/**
 * External contracts available per-network.
 * Registered under the name `Innovateth`.
 */
const externalContracts = {
  11155111: {
    Innovateth: {
      address: "0x15C604f620D775B8CCE7916ee8EE4F9dEB87E1fb",
      abi: ABI as unknown as Abi,
    },
  },
} as const satisfies GenericContractsDeclaration;

export default externalContracts;
