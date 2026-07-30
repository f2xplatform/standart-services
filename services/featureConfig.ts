export const DEFAULT_SUFFIX = 'default';

type FeatureConfigModule = {
  value: unknown;
  description?: string;
};

/** key → suffix → module */
export type FeatureConfigRegistry = Record<
  string,
  Record<string, FeatureConfigModule>
>;

type FeatureConfigSnapshotEntry = {
  description: string;
  values: Record<string, unknown>;
};

type ModuleValue<M> = M extends { readonly value: unknown } ? M['value'] : unknown;

/**
 * Value type for a registry key: union of `value` across all customer/suffix modules.
 */
type FeatureConfigValueOf<
  R extends FeatureConfigRegistry,
  K extends keyof R,
> = ModuleValue<R[K][keyof R[K]]>;

/**
 * Keep known keys, but allow runtime string indexing (lang, status, currency codes).
 * Arrays/primitives are unchanged.
 */
type DeepStringIndexed<T> = T extends
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  ? T
  : T extends readonly (infer U)[]
    ? DeepStringIndexed<U>[]
    : T extends object
      ? {
          [P in keyof T]: DeepStringIndexed<T[P]>;
        } & {
          [key: string]: DeepStringIndexed<T[keyof T]> | undefined;
        }
      : T;

export type FeatureConfigGetResult<
  R extends FeatureConfigRegistry,
  K extends keyof R,
> = DeepStringIndexed<FeatureConfigValueOf<R, K>>;

function resolveEntry(
  registry: FeatureConfigRegistry,
  customer: string,
  key: string
): FeatureConfigModule {
  const modules = registry[key];
  if (!modules) {
    throw new Error(`Unknown feature-config key "${key}"`);
  }
  if (customer && modules[customer]) {
    return modules[customer];
  }
  if (modules[DEFAULT_SUFFIX]) {
    return modules[DEFAULT_SUFFIX];
  }
  throw new Error(
    `No feature-config value for key "${key}" (customer ${customer || 'none'})`
  );
}

export function getConfigValue<
  R extends FeatureConfigRegistry,
  K extends keyof R & string,
>(
  registry: R,
  customer: string,
  key: K
): FeatureConfigGetResult<R, K> {
  return resolveEntry(registry, customer, key).value as FeatureConfigGetResult<
    R,
    K
  >;
}

/**
 * Staff `/std/feature-config`: all KEY values for every customer/suffix in the registry.
 * Description prefers `default`, else first module that exports one.
 */
export function snapshotConfig(
  registry: FeatureConfigRegistry
): Record<string, FeatureConfigSnapshotEntry> {
  const settings: Record<string, FeatureConfigSnapshotEntry> = {};
  for (const key of Object.keys(registry)) {
    const modules = registry[key];
    const values: Record<string, unknown> = {};
    for (const suffix of Object.keys(modules)) {
      values[suffix] = modules[suffix].value;
    }

    let description = '';
    const defaultMod = modules[DEFAULT_SUFFIX];
    if (defaultMod && typeof defaultMod.description === 'string') {
      description = defaultMod.description;
    } else {
      for (const suffix of Object.keys(modules)) {
        const desc = modules[suffix].description;
        if (typeof desc === 'string') {
          description = desc;
          break;
        }
      }
    }

    settings[key] = { description, values };
  }
  return settings;
}
