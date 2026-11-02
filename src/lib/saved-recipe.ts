/**
 * Persistence for the recipe builder.
 *
 * The whole calculator state lives in one versioned localStorage record, so
 * tomorrow's visit can pick up exactly where today's left off. Everything is
 * validated on read: a stale, corrupt or hand-edited record falls back to the
 * normal defaults instead of restoring half a recipe.
 */

import { FLOURS, type FlourId } from './flours'
import { MIXERS, type MixerId } from './mixers'
import {
  FLOUR_PRICES,
  GAS_DEFAULTS,
  MOZZARELLAS,
  MOZZARELLA_PER_PIZZA_G,
  PANTRY_PRICES,
  SAUCES,
  SAUCE_PER_PIZZA_G,
  TOPPING_LIST,
  type MozzarellaId,
  type PantryId,
  type SauceId,
  type ToppingId,
} from './costs'

export const SAVED_RECIPE_KEY = 'dough-calculator:recipe'

/** Remembers an explicit opt-out so saving does not silently switch back on. */
const SAVE_ENABLED_KEY = 'dough-calculator:save-enabled'

const STORAGE_VERSION = 1 as const

/** Everything needed to reproduce a batch and its plan. */
export interface RecipeSettings {
  mixerId: MixerId
  flourId: FlourId
  balls: number
  /** `datetime-local` value, e.g. `2026-11-04T18:00`. */
  deadline: string
  saucePerPizzaG: number
  mozzarellaPerPizzaG: number
  includeGas: boolean
  gasPerM3: number
  gasPerBakeM3: number
  sauceId: SauceId
  saucePerKg: number
  mozzarellaId: MozzarellaId
  mozzarellaPerKg: number
  flourPerKg: number
  pantryPerKg: Record<PantryId, number>
  toppingOn: Record<ToppingId, boolean>
  toppingG: Record<ToppingId, number>
  toppingPerKg: Record<ToppingId, number>
}

export interface SavedRecipe extends RecipeSettings {
  version: typeof STORAGE_VERSION
  /** Epoch milliseconds of the last write. */
  savedAt: number
}

/** The calculator's first-visit state. */
export function defaultRecipeSettings(): RecipeSettings {
  return {
    mixerId: 'autentico',
    flourId: 'neapolitan',
    balls: 4,
    deadline: '',
    saucePerPizzaG: SAUCE_PER_PIZZA_G,
    mozzarellaPerPizzaG: MOZZARELLA_PER_PIZZA_G,
    includeGas: false,
    gasPerM3: GAS_DEFAULTS.perM3,
    gasPerBakeM3: GAS_DEFAULTS.perBakeM3,
    sauceId: 'cirio',
    saucePerKg: SAUCES.cirio.perKg,
    mozzarellaId: 'aro-stick',
    mozzarellaPerKg: MOZZARELLAS['aro-stick'].perKg,
    flourPerKg: FLOUR_PRICES.neapolitan.perKg,
    pantryPerKg: {
      salt: PANTRY_PRICES.salt.perKg,
      yeast: PANTRY_PRICES.yeast.perKg,
      honey: PANTRY_PRICES.honey.perKg,
    },
    toppingOn: Object.fromEntries(
      TOPPING_LIST.map((t) => [t.id, t.defaultOn]),
    ) as Record<ToppingId, boolean>,
    toppingG: Object.fromEntries(
      TOPPING_LIST.map((t) => [t.id, t.defaultG]),
    ) as Record<ToppingId, number>,
    toppingPerKg: Object.fromEntries(
      TOPPING_LIST.map((t) => [t.id, t.perKg]),
    ) as Record<ToppingId, number>,
  }
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function pickId<T extends string>(
  value: unknown,
  options: Record<T, unknown>,
  fallback: T,
): T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(options, value)
    ? (value as T)
    : fallback
}

function deadlineValue(value: unknown, fallback: string): string {
  return typeof value === 'string' &&
    value.length > 0 &&
    !Number.isNaN(new Date(value).getTime())
    ? value
    : fallback
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

/** Whether the visitor wants recipes saved. Defaults to on. */
export function loadSaveEnabled(): boolean {
  if (typeof window === 'undefined') return true

  try {
    return window.localStorage.getItem(SAVE_ENABLED_KEY) !== 'off'
  } catch {
    return true
  }
}

/** Persist the save toggle itself, separate from the recipe data. */
export function storeSaveEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(SAVE_ENABLED_KEY, enabled ? 'on' : 'off')
  } catch {
    // saveRecipe() reports storage failures in the UI; nothing else to do here.
  }
}

/** Read and validate the saved recipe. Returns null when there is none. */
export function loadSavedRecipe(): SavedRecipe | null {
  if (typeof window === 'undefined') return null

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(SAVED_RECIPE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null

    const defaults = defaultRecipeSettings()

    const flourId = pickId(parsed.flourId, FLOURS, defaults.flourId)
    const sauceId = pickId(parsed.sauceId, SAUCES, defaults.sauceId)
    const mozzarellaId = pickId(parsed.mozzarellaId, MOZZARELLAS, defaults.mozzarellaId)
    const pantry = record(parsed.pantryPerKg)
    const toppingOnSaved = record(parsed.toppingOn)
    const toppingGSaved = record(parsed.toppingG)
    const toppingPerKgSaved = record(parsed.toppingPerKg)

    return {
      version: STORAGE_VERSION,
      savedAt:
        typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
          ? parsed.savedAt
          : Date.now(),
      mixerId: pickId(parsed.mixerId, MIXERS, defaults.mixerId),
      flourId,
      balls: Math.round(number(parsed.balls, defaults.balls, 1, 30)),
      deadline: deadlineValue(parsed.deadline, defaults.deadline),
      saucePerPizzaG: number(
        parsed.saucePerPizzaG,
        defaults.saucePerPizzaG,
        0,
        500,
      ),
      mozzarellaPerPizzaG: number(
        parsed.mozzarellaPerPizzaG,
        defaults.mozzarellaPerPizzaG,
        0,
        500,
      ),
      includeGas: boolean(parsed.includeGas, defaults.includeGas),
      gasPerM3: number(parsed.gasPerM3, defaults.gasPerM3, 0, 100),
      gasPerBakeM3: number(parsed.gasPerBakeM3, defaults.gasPerBakeM3, 0, 10),
      sauceId,
      saucePerKg: number(parsed.saucePerKg, SAUCES[sauceId].perKg, 0, 10_000),
      mozzarellaId,
      mozzarellaPerKg: number(
        parsed.mozzarellaPerKg,
        MOZZARELLAS[mozzarellaId].perKg,
        0,
        10_000,
      ),
      flourPerKg: number(parsed.flourPerKg, FLOUR_PRICES[flourId].perKg, 0, 10_000),
      pantryPerKg: {
        salt: number(pantry.salt, defaults.pantryPerKg.salt, 0, 10_000),
        yeast: number(pantry.yeast, defaults.pantryPerKg.yeast, 0, 10_000),
        honey: number(pantry.honey, defaults.pantryPerKg.honey, 0, 10_000),
      },
      toppingOn: Object.fromEntries(
        TOPPING_LIST.map((t) => [t.id, boolean(toppingOnSaved[t.id], t.defaultOn)]),
      ) as Record<ToppingId, boolean>,
      toppingG: Object.fromEntries(
        TOPPING_LIST.map((t) => [t.id, number(toppingGSaved[t.id], t.defaultG, 0, 500)]),
      ) as Record<ToppingId, number>,
      toppingPerKg: Object.fromEntries(
        TOPPING_LIST.map((t) => [
          t.id,
          number(toppingPerKgSaved[t.id], t.perKg, 0, 10_000),
        ]),
      ) as Record<ToppingId, number>,
    }
  } catch {
    return null
  }
}

/** Write the current recipe. Returns false when storage is unavailable. */
export function saveRecipe(settings: RecipeSettings): boolean {
  if (typeof window === 'undefined') return false

  try {
    const record: SavedRecipe = {
      version: STORAGE_VERSION,
      savedAt: Date.now(),
      ...settings,
    }
    window.localStorage.setItem(SAVED_RECIPE_KEY, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

/** Remove the saved recipe (used when saving is switched off). */
export function clearSavedRecipe(): boolean {
  if (typeof window === 'undefined') return false

  try {
    window.localStorage.removeItem(SAVED_RECIPE_KEY)
    return true
  } catch {
    return false
  }
}
