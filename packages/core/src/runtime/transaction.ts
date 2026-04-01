/**
 * Host-provided durability boundary. Implementations map to DB transactions,
 * outbox steps, or saga phases — runtime only declares the contract.
 */
export type TransactionSession = {
  commit(): Promise<void>;
  rollback(): Promise<void>;
};

export type TransactionBoundary = {
  withTransaction: <T>(work: (session: TransactionSession) => Promise<T>) => Promise<T>;
};
