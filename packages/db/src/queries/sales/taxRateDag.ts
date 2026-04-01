/**
 * `tax_rate_children` forms a directed graph (parent → child). Inserts must stay acyclic.
 * Use before persisting a new or updated child link (app / command layer guard).
 */
export function taxRateChildEdgeWouldCreateCycle(
  existingEdges: ReadonlyArray<{ parentTaxId: string; childTaxId: string }>,
  proposedParentTaxId: string,
  proposedChildTaxId: string
): boolean {
  if (proposedParentTaxId === proposedChildTaxId) return true;

  const childrenByParent = new Map<string, string[]>();
  for (const e of existingEdges) {
    if (e.parentTaxId === e.childTaxId) continue;
    const list = childrenByParent.get(e.parentTaxId);
    if (list) list.push(e.childTaxId);
    else childrenByParent.set(e.parentTaxId, [e.childTaxId]);
  }

  /** Adding `proposedParentTaxId → proposedChildTaxId` creates a cycle iff `proposedChildTaxId` can already reach `proposedParentTaxId`. */
  const stack = [proposedChildTaxId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === proposedParentTaxId) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    const next = childrenByParent.get(node);
    if (next) for (const n of next) stack.push(n);
  }
  return false;
}
