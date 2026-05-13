const MAX_UNITS_PER_SECOND = 200;

let availableUnits = MAX_UNITS_PER_SECOND;
let lastRefillTimestamp = Date.now();

function refillUnits(): void {
  const now = Date.now();
  const elapsedMs = now - lastRefillTimestamp;

  if (elapsedMs <= 0) {
    return;
  }

  const replenishedUnits = (elapsedMs / 1000) * MAX_UNITS_PER_SECOND;
  availableUnits = Math.min(MAX_UNITS_PER_SECOND, availableUnits + replenishedUnits);
  lastRefillTimestamp = now;
}

export async function acquireRateLimitToken(units = 1): Promise<void> {
  let hasCapacity = false;

  while (!hasCapacity) {
    refillUnits();

    if (availableUnits >= units) {
      hasCapacity = true;
      continue;
    }

    const deficit = units - availableUnits;
    const waitMs = Math.ceil((deficit / MAX_UNITS_PER_SECOND) * 1000);

    await new Promise((resolve) => {
      setTimeout(resolve, Math.max(waitMs, 5));
    });
  }

  availableUnits -= units;
}