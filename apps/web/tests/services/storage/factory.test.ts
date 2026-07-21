import { describe, it, expect, afterEach } from "vitest";
import { createStorageProvider } from "@/services/storage/factory";
import { LocalStorageProvider } from "@/services/storage/providers/local";

describe("createStorageProvider", () => {
  const original = process.env.STORAGE_PROVIDER;

  afterEach(() => {
    process.env.STORAGE_PROVIDER = original;
  });

  it("returns LocalStorageProvider by default", () => {
    delete process.env.STORAGE_PROVIDER;
    const provider = createStorageProvider();
    expect(provider).toBeInstanceOf(LocalStorageProvider);
    expect(provider.name).toBe("local");
  });

  it("returns LocalStorageProvider when STORAGE_PROVIDER=local", () => {
    process.env.STORAGE_PROVIDER = "local";
    const provider = createStorageProvider();
    expect(provider).toBeInstanceOf(LocalStorageProvider);
  });
});
