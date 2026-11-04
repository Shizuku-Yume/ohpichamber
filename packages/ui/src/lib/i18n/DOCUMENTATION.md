# Internationalization (i18n) & RTL Architecture

## Overview

The i18n subsystem in `@openchamber/ui` manages localized message strings and layout direction across 15 supported locales, including right-to-left (RTL) Arabic (`ar`) and Hebrew (`he`).

## Core Invariants

1. **Direction Authority**: `getLocaleDirection(locale)` is the single authority for UI direction (`'rtl'` for `'ar'` and `'he'`, `'ltr'` for all others). `I18nProvider` sets `document.documentElement.dir = direction` and binds `@base-ui/react/direction-provider`.
2. **Logical Properties**: All layout styling must use logical CSS properties (`start`, `end`, `ms-`, `me-`, `ps-`, `pe-`, `inset-inline-start`, etc.) rather than physical sides (`left`, `right`, `pl-`, `pr-`, `ml-`, `mr-`). Physical sides are reserved for fixed hardware/window chrome controls.
3. **Reactive Text Resolution**: UI strings are resolved dynamically within React components via `useI18n()` (`const { t, direction, locale } = useI18n()`). Do not resolve translations at module scope.
4. **Fallback Chain**: `formatMessage(dictionary, key, params)` looks up keys in `dictionary[key]`, then falls back to `enDict[key]`, then returns the literal `key`.
5. **Dictionary Code Splitting**: The default English dictionary is bundled synchronously; non-English locales are loaded on demand via `useI18nStore.setLocale(locale)`.
