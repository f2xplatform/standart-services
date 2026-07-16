export type TServiceSettingsValueSource = string;

export type TServiceSettingsValueVariants = Partial<
  Record<TServiceSettingsValueSource, unknown>
>;

export type TServiceSettingsBundle = {
  commonKeys: string[];
  customerKeys: Partial<Record<string, string[]>>;
  values: Record<string, TServiceSettingsValueVariants>;
};

export type TServiceSettingEntry = {
  key: string;
  value: unknown;
  keySource: TServiceSettingsValueSource;
  valueSource: TServiceSettingsValueSource;
};

export function resolveServiceSettings(
  customer: string,
  bundle: TServiceSettingsBundle
): TServiceSettingEntry[] {
  const entries: TServiceSettingEntry[] = [];
  const seen = new Set<string>();

  for (const key of bundle.commonKeys) {
    seen.add(key);
    entries.push(resolveCommonKey(key, customer, bundle));
  }

  const customerOnlyKeys = bundle.customerKeys[customer] ?? [];
  for (const key of customerOnlyKeys) {
    if (seen.has(key)) {
      throw new Error(
        `Service setting key "${key}" is listed in both settings_common and settings_${customer}`
      );
    }
    seen.add(key);
    entries.push(resolveCustomerKey(key, customer, bundle));
  }

  return entries;
}

function resolveCommonKey(
  key: string,
  customer: string,
  bundle: TServiceSettingsBundle
): TServiceSettingEntry {
  const variants = bundle.values[key];
  if (!variants) {
    throw new Error(
      `Service setting key "${key}" from settings_common has no value variants in registry`
    );
  }

  const customerValue = variants[customer];
  if (customerValue !== undefined) {
    return {
      key,
      value: customerValue,
      keySource: 'common',
      valueSource: customer,
    };
  }

  const commonValue = variants.common;
  if (commonValue !== undefined) {
    return {
      key,
      value: commonValue,
      keySource: 'common',
      valueSource: 'common',
    };
  }

  throw new Error(
    `Service setting key "${key}" from settings_common has no value for customer "${customer}" or common`
  );
}

function resolveCustomerKey(
  key: string,
  customer: string,
  bundle: TServiceSettingsBundle
): TServiceSettingEntry {
  const variants = bundle.values[key];
  const customerValue = variants?.[customer];
  if (customerValue === undefined) {
    throw new Error(
      `Service setting key "${key}" from settings_${customer} has no value for customer "${customer}"`
    );
  }

  return {
    key,
    value: customerValue,
    keySource: customer,
    valueSource: customer,
  };
}
