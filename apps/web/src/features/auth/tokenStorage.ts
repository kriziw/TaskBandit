export type WorkspaceVariant = 'admin' | 'client';

const legacyTokenKey = 'taskbandit-access-token';

function getTokenStorageKey(variant: WorkspaceVariant) {
  return `${legacyTokenKey}-${variant}`;
}

function getTokenMigrationKey(variant: WorkspaceVariant) {
  return `${getTokenStorageKey(variant)}-migrated`;
}

export function getTokenStorage(variant: WorkspaceVariant): Storage {
  return variant === 'admin' ? window.sessionStorage : window.localStorage;
}

export function readStoredToken(variant: WorkspaceVariant): string | null {
  const storage = getTokenStorage(variant);
  const storageKey = getTokenStorageKey(variant);
  const directValue = storage.getItem(storageKey);
  if (directValue) {
    return directValue;
  }

  const migrationKey = getTokenMigrationKey(variant);
  if (window.localStorage.getItem(migrationKey) === 'true') {
    return null;
  }

  // One-time migration from the pre-variant legacy key
  const legacyValue = window.localStorage.getItem(legacyTokenKey);
  if (legacyValue) {
    storage.setItem(storageKey, legacyValue);
    window.localStorage.setItem(migrationKey, 'true');
    return legacyValue;
  }

  return null;
}

export function writeStoredToken(variant: WorkspaceVariant, token: string) {
  const storage = getTokenStorage(variant);
  storage.setItem(getTokenStorageKey(variant), token);
  window.localStorage.setItem(getTokenMigrationKey(variant), 'true');
}

export function clearStoredToken(variant: WorkspaceVariant) {
  const storage = getTokenStorage(variant);
  storage.removeItem(getTokenStorageKey(variant));
  window.localStorage.setItem(getTokenMigrationKey(variant), 'true');
}
