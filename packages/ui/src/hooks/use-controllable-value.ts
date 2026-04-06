import { useCallback, useState } from "react";

export type UseControllableValueOptions<T> = {
  valuePropName?: string;
  defaultValuePropName?: string;
  trigger?: string;
  defaultValue?: T;
};

export function isControlledProp(props: object, valuePropName: string): boolean {
  return Object.hasOwn(props, valuePropName);
}

export function getInitialUncontrolledValue<T>(
  props: Record<string, unknown>,
  defaultValuePropName: string,
  fallback: T,
): T {
  const v = props[defaultValuePropName];
  return (v !== undefined ? v : fallback) as T;
}

/**
 * 受控：props 上存在 `valuePropName`（即使值为 `false`）。非受控：内部 state，初值来自 `defaultValuePropName`。
 * 仅支持 `setValue(next)`，不支持函数式 updater（避免与 trigger 副作用交织）。
 */
export function useControllableValue<T>(
  props: Record<string, unknown>,
  options: UseControllableValueOptions<T> = {},
): [T, (next: T) => void] {
  const valuePropName = options.valuePropName ?? "value";
  const defaultValuePropName = options.defaultValuePropName ?? "defaultValue";
  const trigger = options.trigger ?? "onChange";
  const controlled = isControlledProp(props, valuePropName);
  const propValue = props[valuePropName] as T;
  const def = getInitialUncontrolledValue(props, defaultValuePropName, options.defaultValue as T);
  const [inner, setInner] = useState<T>(() => def);
  const value = controlled ? propValue : inner;

  const setValue = useCallback(
    (next: T) => {
      if (!controlled) {
        setInner(next);
      }
      const fn = props[trigger] as ((v: T) => void) | undefined;
      fn?.(next);
    },
    [controlled, props, trigger],
  );

  return [value, setValue];
}
