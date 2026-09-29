import type { IndustriaPack } from "../../engine/types";
import { retail } from "./retail";
import { banca } from "./banca";
export const INDUSTRIAS: Record<string, IndustriaPack> = { retail, banca };
