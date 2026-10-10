const LEGACY_KEYS = {
  finma_profile: ["saku_profile", "saku-profile", "saku5-profile"],
  finma_expenses: ["saku_expenses", "saku-expenses", "saku5-expenses"],
  finma_allocation: ["saku_allocation", "saku-allocation", "saku5-allocation", "saku_alokasi"],
};

export function readStoredObject(storage: Storage, key: string): Record<string, unknown> | null {
  try {
    const raw = storage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export function migrateFinmaStorage(storage: Storage) {
  for (const [target, sources] of Object.entries(LEGACY_KEYS)) {
    for (const source of sources) {
      const old = readStoredObject(storage, source);
      if (!old) continue;
      // Never overwrite newer data, or destroy an unreadable destination.
      if (storage.getItem(target) === null) storage.setItem(target, JSON.stringify(old));
      if (readStoredObject(storage, target)) storage.removeItem(source);
    }
  }
}