import { DrugContract } from "./drug-contract";
import { type Contract } from "fabric-contract-api";

export const contracts: (typeof Contract)[] = [DrugContract];
