import { SetMetadata } from "@nestjs/common";

export const ROLE_METADATA_KEY = "taskbandit_roles";

export const Roles = (...roles: Array<"admin" | "parent" | "child">) =>
  SetMetadata(ROLE_METADATA_KEY, roles);

