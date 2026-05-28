import { SetMetadata } from '@nestjs/common';
import type { PackageFeatureId } from '../tenancy/feature-access.service';

export const FEATURE_METADATA_KEY = 'taskbandit_required_feature';

/**
 * Marks a controller route as requiring a specific package feature to be enabled.
 * Enforced by {@link FeatureGuard}, which must be applied after {@link JwtAuthGuard}.
 *
 * @example
 * ```ts
 * @Post("instances")
 * @RequiresFeature("chores_manage")
 * createInstance(...) { ... }
 * ```
 */
export const RequiresFeature = (featureId: PackageFeatureId) =>
  SetMetadata(FEATURE_METADATA_KEY, featureId);
