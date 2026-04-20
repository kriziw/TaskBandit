import { BadRequestException } from "@nestjs/common";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProofStorageService } from "../src/modules/chores/proof-storage.service";

describe("ProofStorageService", () => {
  let storageRootPath: string;
  let service: ProofStorageService;

  beforeEach(async () => {
    storageRootPath = await mkdtemp(path.join(os.tmpdir(), "taskbandit-proof-storage-"));
    service = new ProofStorageService(
      {
        storageRootPath
      } as never,
      {
        translate: (key: string) => key
      } as never
    );
  });

  afterEach(async () => {
    await rm(storageRootPath, {
      recursive: true,
      force: true
    });
  });

  it("stores and reads proof files under the tenant-prefixed object key", async () => {
    const stored = await service.storeProofUpload(
      {
        originalname: "proof.png",
        mimetype: "image/png",
        size: 4,
        buffer: Buffer.from("test")
      } as Express.Multer.File,
      {
        tenantId: "tenant-1",
        householdId: "household-1"
      } as never,
      "en"
    );

    expect(stored.storageKey).toContain("tenants/tenant-1/proofs/household-1/");
    await expect(
      service.readProofUpload(stored.storageKey, {
        tenantId: "tenant-1",
        householdId: "household-1"
      })
    ).resolves.toEqual(Buffer.from("test"));
  });

  it("rejects proof reads that point at another tenant prefix", async () => {
    await expect(
      service.readProofUpload("tenants/tenant-2/proofs/household-2/file.png", {
        tenantId: "tenant-1",
        householdId: "household-1"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
