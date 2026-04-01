import type { AppendOnlyMemoryWriter } from "./types.js";
import type { MemoryRecordInput } from "../types.js";

export async function appendMemoryRecord(
  writer: AppendOnlyMemoryWriter,
  record: MemoryRecordInput,
): Promise<void> {
  await writer.append(record);
}
