async function seed(): Promise<void> {
  // Seed implementations will be added in Phase 7.
  console.log("@afenda/db seed placeholder");
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
