import type { Mixer } from './mixers'

/** Vito Iacopelli's classic Neapolitan dough (Autentico official recipe). */
export const BALL_WEIGHT_G = 260

const RECIPE = {
  /** Full recipe: 1600 g flour → 10 balls of 260 g */
  totalFlourG: 1600,
  poolishFlourG: 400,
  yeastG: 5,
  honeyG: 5,
  doughFlourG: 1200,
  saltG: 40,
}

/** Vito's reference hydration — calibrated for a Neapolitan 00 (W 260–280). */
export const REFERENCE_HYDRATION_PCT = 62.5

export interface Ingredients {
  balls: number
  /** Total hydration used for the scaled batch, % of total flour weight. */
  hydrationPct: number
  /** Poolish (the day before) */
  poolishFlourG: number
  poolishWaterG: number
  yeastG: number
  honeyG: number
  /** Final dough */
  doughFlourG: number
  doughWaterG: number
  saltG: number
  /** Totals */
  totalFlourG: number
  totalWaterG: number
  totalDoughG: number
  poolishTotalG: number
}

/**
 * Scale Vito's recipe to `balls` dough balls at the given total hydration.
 * The poolish stays at 100 % hydration (its classic 1:1 ratio); the dough
 * water absorbs the adjustment for the selected flour.
 */
export function scaleIngredients(balls: number, hydrationPct: number): Ingredients {
  const targetDough = balls * BALL_WEIGHT_G
  const totalWater = RECIPE.totalFlourG * (hydrationPct / 100)
  const poolishWater = RECIPE.poolishFlourG // poolish is always 1:1
  const doughWater = totalWater - poolishWater
  /** Yield per gram of flour: flour + water + salt + yeast + honey */
  const yieldFactor =
    (RECIPE.totalFlourG + totalWater + RECIPE.yeastG + RECIPE.honeyG + RECIPE.saltG) /
    RECIPE.totalFlourG
  const k = targetDough / (RECIPE.totalFlourG * yieldFactor)
  return {
    balls,
    hydrationPct,
    poolishFlourG: RECIPE.poolishFlourG * k,
    poolishWaterG: poolishWater * k,
    yeastG: RECIPE.yeastG * k,
    honeyG: RECIPE.honeyG * k,
    doughFlourG: RECIPE.doughFlourG * k,
    doughWaterG: doughWater * k,
    saltG: RECIPE.saltG * k,
    totalFlourG: RECIPE.totalFlourG * k,
    totalWaterG: totalWater * k,
    totalDoughG: targetDough,
    poolishTotalG: (RECIPE.poolishFlourG + poolishWater + RECIPE.yeastG + RECIPE.honeyG) * k,
  }
}

/* ------------------------------------------------------------------ */
/* Capacity check                                                      */
/* ------------------------------------------------------------------ */

export interface CapacityCheck {
  level: 'ok' | 'warn'
  message?: string
}

export function checkCapacity(
  mixer: Mixer,
  balls: number,
  ing: Ingredients,
): CapacityCheck {
  const { minFlourG, maxFlourG, minDoughG, maxDoughG } = mixer.limits
  const flourPerBall = ing.totalFlourG / balls
  const doughPerBall = ing.totalDoughG / balls

  if (minFlourG && ing.totalFlourG < minFlourG) {
    const need = Math.ceil(minFlourG / flourPerBall)
    return {
      level: 'warn',
      message: `${mixer.name} likes at least ${minFlourG} g of flour per batch. ${balls} ball${balls === 1 ? '' : 's'} is only ${Math.round(ing.totalFlourG)} g — the spiral may not knead such a small load properly. ${need} balls (${Math.round(need * flourPerBall)} g flour) is the smallest batch I’d run on it.`,
    }
  }
  if (maxFlourG && ing.totalFlourG > maxFlourG) {
    const max = Math.floor(maxFlourG / flourPerBall)
    return {
      level: 'warn',
      message: `${mixer.name} tops out around ${maxFlourG} g of flour per batch. ${balls} balls is ${Math.round(ing.totalFlourG)} g — split it or stay at ${max} balls.`,
    }
  }
  if (minDoughG && ing.totalDoughG < minDoughG) {
    const need = Math.ceil(minDoughG / doughPerBall)
    return {
      level: 'warn',
      message: `${mixer.name} handles from about ${(minDoughG / 1000).toFixed(1)} kg of dough. ${balls} ball${balls === 1 ? '' : 's'} is ${(ing.totalDoughG / 1000).toFixed(2)} kg — ${need} balls (${(need * doughPerBall / 1000).toFixed(2)} kg) is the minimum.`,
    }
  }
  if (maxDoughG && ing.totalDoughG > maxDoughG) {
    const max = Math.floor(maxDoughG / doughPerBall)
    return {
      level: 'warn',
      message: `${mixer.name} handles up to about ${(maxDoughG / 1000).toFixed(1)} kg of dough. ${balls} balls is ${(ing.totalDoughG / 1000).toFixed(2)} kg — stay at ${max} balls or split the batch.`,
    }
  }
  return { level: 'ok' }
}

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */

export const WARM_HOURS = 3 // balls at room temp before baking (2–4 h)
const MIX_BLOCK_MIN = 45 // mixing (15–20) + rest (5) + balling (~15–20)
const PREHEAT_MIN = 45

export type StepKind =
  | 'poolish'
  | 'mix'
  | 'rest'
  | 'ball'
  | 'out'
  | 'preheat'
  | 'bake'

export interface ScheduleStep {
  at: Date
  kind: StepKind
  title: string
  lines: string[]
  chip?: string
}

export interface Plan {
  deadline: Date
  warnings: string[]
  poolishStart: Date
  mixStart: Date
  ballAt: Date
  outAt: Date
  bakeAt: Date
  poolishHours: number
  steps: ScheduleStep[]
}

function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000)
}

function subHours(d: Date, h: number): Date {
  return addMinutes(d, -h * 60)
}

export function buildPlan(input: {
  now: Date
  deadline: Date
  mixer: Mixer
  balls: number
  ing: Ingredients
  /** Kneading window for the selected flour, e.g. '15–18 min'. */
  kneadMinutes: string
  /** Chip text for the mix block, e.g. '≈ 18–24 min mixing'. */
  mixChip: string
  /** Fermentation windows for the selected flour (hours). */
  coldFermentH: number
  coldFermentMaxH: number
  poolishMinH: number
  poolishIdealH: number
  poolishMaxH: number
}): Plan {
  const {
    now,
    mixer,
    balls,
    ing,
    kneadMinutes,
    mixChip,
    coldFermentH,
    coldFermentMaxH,
    poolishMinH,
    poolishIdealH,
    poolishMaxH,
  } = input
  const warnings: string[] = []

  // The schedule is always back-planned from the chosen finish time — it is
  // never clamped to "now" — so a poolish that is already fermenting from
  // yesterday keeps its place in the timeline.
  const bakeAt = input.deadline
  const outAt = subHours(bakeAt, WARM_HOURS)
  const ballAt = subHours(outAt, coldFermentH)
  const mixStart = addMinutes(ballAt, -MIX_BLOCK_MIN)

  const poolishStart = subHours(mixStart, poolishIdealH)
  const poolishHours = poolishIdealH

  const g = (v: number) => formatG(v)
  const ph = mixer.phases

  const steps: ScheduleStep[] = [
    {
      at: poolishStart,
      kind: 'poolish',
      title: 'Make the poolish',
      lines: [
        `Whisk ${g(ing.poolishWaterG)} g cold water with ${g(ing.yeastG)} g dry yeast until dissolved, then whisk in ${g(ing.honeyG)} g honey and let it stand 5 min.`,
        `Stir in ${g(ing.poolishFlourG)} g tipo 00 flour until it’s a smooth, thick paste.`,
        'Cover and put it in the fridge.',
      ],
      chip: `${formatDuration(poolishHours * 60)} in the fridge (window: ${poolishMinH}–${poolishMaxH} h)`,
    },
    {
      at: mixStart,
      kind: 'mix',
      title: `Mix the dough on the ${mixer.name}`,
      lines: [
        `Take the poolish straight from the fridge. Weigh ${g(ing.doughFlourG)} g flour into the mixer bowl and spoon the poolish on top.`,
        `${ph.incorporate.setting} (${ph.incorporate.rpm}) until poolish and flour are combined — no dry pockets.`,
        `Add ${g(ing.doughWaterG)} g of very cold water in 100 g doses at ${ph.water.setting} (${ph.water.rpm}), letting each dose absorb.`,
        `Knead ${kneadMinutes} at ${ph.knead.setting} (${ph.knead.rpm}) until the dough is smooth, glossy and wipes the bowl. Aim for 23–26 °C dough temperature.`,
      ],
      chip: mixChip,
    },
    {
      at: addMinutes(mixStart, 20),
      kind: 'rest',
      title: 'Rest the dough',
      lines: ['Cover the bowl and rest 5 minutes.'],
    },
    {
      at: ballAt,
      kind: 'ball',
      title: `Ball the dough (${balls} × ${BALL_WEIGHT_G} g)`,
      lines: [
        'Take the dough out with wet or oiled hands and divide it into pieces of about 260 g (no bench flour).',
        'Round each piece keeping the top on top, and place them apart in dough boxes or on a covered tray.',
        'Straight into the fridge.',
      ],
      chip:
        coldFermentMaxH > coldFermentH
          ? `cold ferment ${formatDuration(coldFermentH * 60)} (you can stretch this to ${coldFermentMaxH} h)`
          : `cold ferment ${formatDuration(coldFermentH * 60)}`,
    },
    {
      at: outAt,
      kind: 'out',
      title: 'Take the balls out of the fridge',
      lines: [
        `${WARM_HOURS} h at room temperature — until they are soft, relaxed and slightly risen.`,
      ],
      chip: `${WARM_HOURS} h to warm up`,
    },
    {
      at: subHours(bakeAt, PREHEAT_MIN / 60),
      kind: 'preheat',
      title: 'Preheat',
      lines: [
        'Steel or stone on maximum oven heat for at least 45 minutes (home oven 250–300 °C, pizza oven 430–480 °C).',
        'Get your toppings ready while it heats.',
      ],
    },
    {
      at: bakeAt,
      kind: 'bake',
      title: 'Bake the pizza',
      lines: [
        'Stretch a ball to ~30–33 cm by hand, top it lightly.',
        'Bake: ~4–7 min on a steel in a home oven, or 60–90 s in a pizza oven.',
        'Eat. Repeat.',
      ],
    },
  ]

  // sanity: poolish must not be later than the flour's minimum before mixing
  // Heads-up when the back-planned schedule reaches into the past — e.g. the
  // poolish is already fermenting from yesterday. In that case the times below
  // are still exactly what the remaining steps need.
  if (poolishStart.getTime() < now.getTime()) {
    warnings.push(
      `Heads-up: this schedule starts in the past — the poolish was due ${formatFull(poolishStart)}. If it is already fermenting, just follow the remaining steps below. If you have not started it yet, pick a later finish time.`,
    )
  }

  return {
    deadline: input.deadline,
    warnings,
    poolishStart,
    mixStart,
    ballAt,
    outAt,
    bakeAt,
    poolishHours,
    steps,
  }
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function formatG(v: number): string {
  if (v >= 10) return String(Math.round(v))
  return String(Math.round(v * 10) / 10)
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const fullFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatFull(d: Date): string {
  return fullFmt.format(d)
}

export function formatStepTime(d: Date): string {
  return dateFmt.format(d)
}

export function formatDuration(minutes: number): string {
  const m = Math.round(minutes)
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h === 0) return `${rest} min`
  if (rest === 0) return `${h} h`
  return `${h} h ${rest} min`
}

export function toLocalInputValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
