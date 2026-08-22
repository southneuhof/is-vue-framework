/**
 * App-level chrome defaults for view shells.
 *
 * Provided by `FrameworkPlugin` and consumed by raw chrome components such as
 * `NavigationHeader`, so pages stop repeating app-wide labels.
 */
import { inject, type InjectionKey } from 'vue'

export interface FrameworkUiDefaultsInput {
  /** Default accessible label for the header back control. */
  backLabel?: string
}

export interface ResolvedFrameworkUiDefaults {
  backLabel?: string
}

export const frameworkUiDefaultsKey: InjectionKey<ResolvedFrameworkUiDefaults> =
  Symbol.for('is-vue-framework-ui-defaults')

export function resolveFrameworkUiDefaults(
  input: FrameworkUiDefaultsInput = {},
): ResolvedFrameworkUiDefaults {
  return input.backLabel === undefined ? {} : { backLabel: input.backLabel }
}

export function useFrameworkUiDefaults(): ResolvedFrameworkUiDefaults {
  return inject(frameworkUiDefaultsKey) ?? {}
}
