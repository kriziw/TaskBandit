import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppConfigService } from "../../common/config/app-config.service";
import { AuthenticatedUser } from "../../common/auth/authenticated-user.type";
import { I18nService } from "../../common/i18n/i18n.service";
import { SupportedLanguage } from "../../common/i18n/supported-languages";

type StoredProofUpload = {
  clientFilename: string;
  contentType: string;
  storageKey: string;
  sizeBytes: number;
};

type TenantProofScope = {
  tenantId: string;
  householdId: string;
};

type ProofObjectStorageDriver = {
  deleteObject(storageKey: string): Promise<void>;
  listObjectKeys(prefix: string): Promise<string[]>;
  readObject(storageKey: string): Promise<Buffer>;
  writeObject(storageKey: string, body: Buffer): Promise<void>;
};

class LocalProofObjectStorageDriver implements ProofObjectStorageDriver {
  constructor(private readonly rootPath: string) {}

  async writeObject(storageKey: string, body: Buffer) {
    const absolutePath = this.resolveAbsolutePath(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body);
  }

  readObject(storageKey: string) {
    return readFile(this.resolveAbsolutePath(storageKey));
  }

  async deleteObject(storageKey: string) {
    await rm(this.resolveAbsolutePath(storageKey), {
      force: true
    });
  }

  async listObjectKeys(prefix: string) {
    const baseDirectory = this.resolveAbsolutePath(prefix);

    try {
      const baseStat = await stat(baseDirectory);
      if (!baseStat.isDirectory()) {
        return [];
      }
    } catch {
      return [];
    }

    const collected: string[] = [];
    await this.walkDirectory(baseDirectory, collected);

    return collected
      .map((absolutePath) => this.toStorageKey(absolutePath))
      .sort((left, right) => left.localeCompare(right));
  }

  private async walkDirectory(directoryPath: string, output: string[]) {
    const entries = await readdir(directoryPath, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        await this.walkDirectory(entryPath, output);
        continue;
      }

      if (entry.isFile()) {
        output.push(entryPath);
      }
    }
  }

  private resolveAbsolutePath(storageKey: string) {
    const normalizedKey = storageKey
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join(path.sep);
    const absolutePath = path.resolve(this.rootPath, normalizedKey);
    const relativePath = path.relative(this.rootPath, absolutePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new BadRequestException({
        message: "That proof upload path is invalid."
      });
    }

    return absolutePath;
  }

  private toStorageKey(absolutePath: string) {
    const relativePath = path.relative(this.rootPath, absolutePath);
    return relativePath.split(path.sep).join(path.posix.sep);
  }
}

@Injectable()
export class ProofStorageService {
  private readonly driver: ProofObjectStorageDriver;

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly i18nService: I18nService
  ) {
    this.driver = new LocalProofObjectStorageDriver(this.appConfigService.storageRootPath);
  }

  async storeProofUpload(
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
    language: SupportedLanguage
  ): Promise<StoredProofUpload> {
    if (!file) {
      throw new BadRequestException({
        message: this.i18nService.translate("chores.photo_upload_missing", language)
      });
    }

    if (!file.mimetype?.startsWith("image/")) {
      throw new BadRequestException({
        message: this.i18nService.translate("chores.photo_upload_invalid_type", language)
      });
    }

    const originalExtension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = /^[.][a-z0-9]{1,8}$/.test(originalExtension)
      ? originalExtension
      : this.resolveExtensionFromMimeType(file.mimetype);
    const originalFilename = this.sanitizeFilename(file.originalname || "proof-image");
    const storedFilename = `${randomUUID()}${safeExtension}`;
    const storageKey = path.posix.join(
      this.buildTenantProofPrefix(user.tenantId, user.householdId),
      storedFilename
    );

    await this.driver.writeObject(storageKey, file.buffer);

    return {
      clientFilename: originalFilename,
      contentType: file.mimetype,
      storageKey,
      sizeBytes: file.size
    };
  }

  async readProofUpload(storageKey: string, scope: TenantProofScope) {
    this.assertStorageKeyBelongsToScope(storageKey, scope);
    return this.driver.readObject(storageKey);
  }

  async deleteProofUpload(storageKey: string, scope: TenantProofScope) {
    this.assertStorageKeyBelongsToScope(storageKey, scope);
    await this.driver.deleteObject(storageKey);
  }

  async listProofObjectKeys(scope: TenantProofScope) {
    return this.driver.listObjectKeys(this.buildTenantProofPrefix(scope.tenantId, scope.householdId));
  }

  buildTenantProofPrefix(tenantId: string, householdId: string) {
    return path.posix.join("tenants", tenantId, "proofs", householdId);
  }

  assertStorageKeyBelongsToScope(storageKey: string, scope: TenantProofScope) {
    const normalizedStorageKey = storageKey.trim();
    const expectedPrefix = `${this.buildTenantProofPrefix(scope.tenantId, scope.householdId)}/`;

    if (!normalizedStorageKey || !normalizedStorageKey.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        message: "That proof upload path is invalid for this tenant."
      });
    }

    const normalizedPath = normalizedStorageKey.split("/").filter(Boolean).join("/");
    if (normalizedPath.includes("../") || normalizedPath.startsWith("..")) {
      throw new BadRequestException({
        message: "That proof upload path is invalid."
      });
    }
  }

  private sanitizeFilename(filename: string) {
    const sanitized = filename
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(0, 255);

    let start = 0;
    let end = sanitized.length;

    while (start < end && sanitized[start] === "-") {
      start += 1;
    }

    while (end > start && sanitized[end - 1] === "-") {
      end -= 1;
    }

    return sanitized.slice(start, end) || "proof-image";
  }

  private resolveExtensionFromMimeType(mimeType: string) {
    switch (mimeType) {
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/gif":
        return ".gif";
      case "image/heic":
        return ".heic";
      case "image/heif":
        return ".heif";
      default:
        return ".img";
    }
  }
}
