import type { MemoryRecordInput } from "../types.js";

export type AppendOnlyMemoryWriter = {
  append(record: MemoryRecordInput): Promise<void>;
};
