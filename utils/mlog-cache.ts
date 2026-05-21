import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MlogDomain } from "../hooks/useMlogDomain";

const STORAGE_KEY = "mycleo.mlog.domain.v1";

export interface CachedMlogDomain {
  domain: MlogDomain;
  cached_at: string;
}

export async function loadCachedMlog(): Promise<CachedMlogDomain | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.domain) return null;
    return parsed as CachedMlogDomain;
  } catch {
    return null;
  }
}

export async function saveCachedMlog(domain: MlogDomain): Promise<void> {
  const entry: CachedMlogDomain = {
    domain,
    cached_at: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export async function clearCachedMlog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
