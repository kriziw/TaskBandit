import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

@Injectable()
export class ProofStorageService {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly i18nService: I18nService
  ) {}

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
    const storageKey = path.posix.join("proofs", user.householdId, storedFilename);
    const absolutePath = path.join(this.appConfigService.storageRootPath, ...storageKey.split("/"));

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      clientFilename: originalFilename,
      contentType: file.mimetype,
      storageKey,
      sizeBytes: file.size
    };
  }

  async readProofUpload(storageKey: string) {
    const absolutePath = this.resolveStoragePath(storageKey);
    return readFile(absolutePath);
  }

  private resolveStoragePath(storageKey: string) {
    const normalizedStorageKey = storageKey.trim();
    const absolutePath = path.resolve(
      this.appConfigService.storageRootPath,
      ...normalizedStorageKey.split("/").filter(Boolean)
    );
    const relativePath = path.relative(this.appConfigService.storageRootPath, absolutePath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new BadRequestException({
        message: "That proof upload path is invalid."
      });
    }

    return absolutePath;
  }

  private sanitizeFilename(filename: string) {
    return filename
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 255) || "proof-image";
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
