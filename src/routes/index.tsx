import { createFileRoute } from '@tanstack/solid-router'
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import { MIXERS, MIXER_LIST, type MixerId } from '../lib/mixers'
import { FLOURS, FLOUR_LIST, type FlourId } from '../lib/flours'
import {
  FLOUR_PRICES,
  MOZZARELLA_LIST,
  MOZZARELLAS,
  PANTRY_PRICES,
  SAUCE_LIST,
  SAUCES,
  TOPPING_LIST,
  buildCosts,
  formatEuro,
  type MozzarellaId,
  type PantryId,
  type PriceSource,
  type SauceId,
  type ToppingId,
} from '../lib/costs'
import {
  BALL_WEIGHT_G,
  REFERENCE_HYDRATION_PCT,
  buildPlan,
  checkCapacity,
  formatDuration,
  formatG,
  formatFull,
  formatStepTime,
  scaleIngredients,
  toLocalInputValue,
  type Plan,
  type ScheduleStep,
} from '../lib/recipe'
import {
  clearSavedRecipe,
  defaultRecipeSettings,
  loadSavedRecipe,
  loadSaveEnabled,
  saveRecipe,
  storeSaveEnabled,
  type SavedRecipe,
} from '../lib/saved-recipe'
import {
  buildCalendar,
  buildStepCalendar,
  calendarFilename,
  calendarStepFilename,
  downloadCalendar,
  singleEventLinks,
  stepDurationMinutes,
  GOOGLE_IMPORT_URL,
  OUTLOOK_CALENDAR_URL,
  REMINDER_MIN,
} from '../lib/calendar'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      {
        title: 'Dough Calculator — Vito Iacopelli’s Neapolitan dough, scaled for your mixer',
      },
      {
        name: 'description',
        content:
          'Scale Vito Iacopelli’s Neapolitan dough to any number of dough balls, pick your flour (Caputo Pizzeria-class 00, strong 00 or all-purpose) and spiral mixer, and get exact grams plus a clock-perfect schedule before you bake.',
      },
    ],
  }),
  component: Home,
})

/** Editable price inputs in the cost card, in pantry order. */
const PANTRY_INPUTS: Array<{ id: PantryId; label: string }> = [
  { id: 'salt', label: 'Salt (€/kg)' },
  { id: 'yeast', label: 'Dry yeast (€/kg)' },
  { id: 'honey', label: 'Honey (€/kg)' },
]

/** Every priced product, grouped by store for the sources list. */
const SOURCES_BY_STORE = (['Dirk', 'Makro', 'AH', 'Aldi'] as const)
  .map((store) => ({
    store,
    sources: [
      ...FLOUR_LIST.map((f): PriceSource => FLOUR_PRICES[f.id]),
      ...Object.values(PANTRY_PRICES),
      ...SAUCE_LIST,
      ...MOZZARELLA_LIST,
      ...TOPPING_LIST,
    ].filter((s) => s.store === store),
  }))
  .filter((g) => g.sources.length > 0)

type CalendarProvider = 'google' | 'apple' | 'outlook' | 'other'

interface CalendarDownloadState {
  provider: CalendarProvider
  filename: string
}

function calendarStatusText(provider: CalendarProvider, steps: number): string {
  switch (provider) {
    case 'google':
      return `${steps} separate events. We opened Google Calendar’s import page — choose the downloaded file there.`
    case 'outlook':
      return `${steps} separate events. In Outlook, choose “Add calendar → Upload from file” and pick the downloaded file.`
    case 'apple':
      return `${steps} separate events. Open the downloaded file to add them to Apple Calendar.`
    default:
      return `${steps} separate events at the exact step times. Import the file in your calendar app.`
  }
}

/** First-visit default: pizza two evenings from now, at 18:00 local time. */
function defaultDeadlineValue(): string {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  d.setHours(18, 0, 0, 0)
  return toLocalInputValue(d)
}

function Home() {
  const initial = defaultRecipeSettings()

  const [mixerId, setMixerId] = createSignal<MixerId>(initial.mixerId)
  const [flourId, setFlourId] = createSignal<FlourId>(initial.flourId)
  const [balls, setBalls] = createSignal(initial.balls)
  const [deadlineStr, setDeadlineStr] = createSignal(initial.deadline)
  const [mounted, setMounted] = createSignal(false)
  /** Ticks every minute so past/next markers stay fresh on a long-open page. */
  const [nowTick, setNowTick] = createSignal(Date.now())

  /* Saving is on by default, so tomorrow's visit continues where today's left off. */
  const [saveEnabled, setSaveEnabled] = createSignal(true)
  const [saveError, setSaveError] = createSignal(false)

  /* Cost calculator state — defaults are real shelf prices (see costs.ts). */
  const [saucePerPizzaG, setSaucePerPizzaG] = createSignal(initial.saucePerPizzaG)
  const [mozzarellaPerPizzaG, setMozzarellaPerPizzaG] = createSignal(
    initial.mozzarellaPerPizzaG,
  )
  const [includeGas, setIncludeGas] = createSignal(initial.includeGas)
  const [gasPerM3, setGasPerM3] = createSignal(initial.gasPerM3)
  const [gasPerBakeM3, setGasPerBakeM3] = createSignal(initial.gasPerBakeM3)
  const [sauceId, setSauceId] = createSignal<SauceId>(initial.sauceId)
  const [saucePerKg, setSaucePerKg] = createSignal(initial.saucePerKg)
  const [mozzarellaId, setMozzarellaId] = createSignal<MozzarellaId>(initial.mozzarellaId)
  const [mozzarellaPerKg, setMozzarellaPerKg] = createSignal(initial.mozzarellaPerKg)
  const [flourPerKg, setFlourPerKg] = createSignal(initial.flourPerKg)
  const [pantryPerKg, setPantryPerKg] = createSignal<Record<PantryId, number>>(
    initial.pantryPerKg,
  )
  const [toppingOn, setToppingOn] = createSignal(initial.toppingOn)
  const [toppingG, setToppingG] = createSignal(initial.toppingG)
  const [toppingPerKg, setToppingPerKg] = createSignal(initial.toppingPerKg)

  const applySavedRecipe = (saved: SavedRecipe) => {
    setMixerId(saved.mixerId)
    setFlourId(saved.flourId)
    setBalls(saved.balls)
    setDeadlineStr(saved.deadline)
    setSaucePerPizzaG(saved.saucePerPizzaG)
    setMozzarellaPerPizzaG(saved.mozzarellaPerPizzaG)
    setIncludeGas(saved.includeGas)
    setGasPerM3(saved.gasPerM3)
    setGasPerBakeM3(saved.gasPerBakeM3)
    setSauceId(saved.sauceId)
    setSaucePerKg(saved.saucePerKg)
    setMozzarellaId(saved.mozzarellaId)
    setMozzarellaPerKg(saved.mozzarellaPerKg)
    setFlourPerKg(saved.flourPerKg)
    setPantryPerKg(saved.pantryPerKg)
    setToppingOn(saved.toppingOn)
    setToppingG(saved.toppingG)
    setToppingPerKg(saved.toppingPerKg)
  }

  onMount(() => {
    const wantsSaving = loadSaveEnabled()
    setSaveEnabled(wantsSaving)

    if (wantsSaving) {
      const saved = loadSavedRecipe()
      if (saved) applySavedRecipe(saved)
    }
    if (!deadlineStr()) setDeadlineStr(defaultDeadlineValue())

    setMounted(true)
    const timer = setInterval(() => setNowTick(Date.now()), 60_000)
    onCleanup(() => clearInterval(timer))
  })

  const clampBalls = (n: number) => Math.min(30, Math.max(1, Math.round(n) || 1))
  const clampNum = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(n) ? n : min))
  const eur2 = (n: number) => Math.round(n * 100) / 100

  const mixer = createMemo(() => MIXERS[mixerId()])
  const flour = createMemo(() => FLOURS[flourId()])
  const ing = createMemo(() => scaleIngredients(clampBalls(balls()), flour().hydrationPct))
  const capacity = createMemo(() => checkCapacity(mixer(), ing().balls, ing()))

  const plan = createMemo<Plan | null>(() => {
    if (!mounted() || !deadlineStr()) return null
    const d = new Date(deadlineStr())
    if (Number.isNaN(d.getTime())) return null
    const sauceG = clampNum(saucePerPizzaG(), 0, 500)
    const mozzarellaG = clampNum(mozzarellaPerPizzaG(), 0, 500)
    const toppings = TOPPING_LIST.filter(
      (t) => toppingOn()[t.id] && clampNum(toppingG()[t.id], 0, 500) > 0,
    ).map((t) => ({
      amount: `${formatG(clampNum(toppingG()[t.id], 0, 500))} g per pizza`,
      name: t.short,
    }))
    return buildPlan({
      now: new Date(),
      deadline: d,
      mixer: mixer(),
      balls: ing().balls,
      ing: ing(),
      flourLabel: flour().ingredientLabel,
      kneadMinutes: flour().kneadMinutes,
      mixChip: flour().mixChip,
      coldFermentH: flour().coldFermentH,
      coldFermentMaxH: flour().coldFermentMaxH,
      poolishMinH: flour().poolishMinH,
      poolishIdealH: flour().poolishIdealH,
      poolishMaxH: flour().poolishMaxH,
      bakeIngredients: [
        { amount: '1 per pizza', name: 'dough ball' },
        ...(sauceG > 0 ? [{ amount: `${formatG(sauceG)} g per pizza`, name: 'sauce' }] : []),
        ...(mozzarellaG > 0
          ? [{ amount: `${formatG(mozzarellaG)} g per pizza`, name: 'mozzarella' }]
          : []),
        ...toppings,
      ],
    })
  })

  const costs = createMemo(() =>
    buildCosts({
      ing: ing(),
      flourId: flourId(),
      sauceId: sauceId(),
      mozzarellaId: mozzarellaId(),
      saucePerPizzaG: clampNum(saucePerPizzaG(), 0, 500),
      mozzarellaPerPizzaG: clampNum(mozzarellaPerPizzaG(), 0, 500),
      toppings: TOPPING_LIST.filter((t) => toppingOn()[t.id]).map((t) => ({
        id: t.id,
        gramsPerPizza: clampNum(toppingG()[t.id], 0, 500),
      })),
      flourPerKg: flourPerKg(),
      pantryPerKg: pantryPerKg(),
      saucePerKg: saucePerKg(),
      mozzarellaPerKg: mozzarellaPerKg(),
      toppingPerKg: toppingPerKg(),
      gas: includeGas() ? { perM3: gasPerM3(), perBakeM3: gasPerBakeM3() } : undefined,
    }),
  )

  const setToppingEnabled = (id: ToppingId, on: boolean) =>
    setToppingOn((prev) => ({ ...prev, [id]: on }))
  const setToppingGrams = (id: ToppingId, g: number) =>
    setToppingG((prev) => ({ ...prev, [id]: g }))
  const setToppingPrice = (id: ToppingId, v: number) =>
    setToppingPerKg((prev) => ({ ...prev, [id]: v }))

  // Auto-save the whole recipe whenever anything changes. The effect also runs
  // once after mount, with the restored values when there were any.
  createEffect(() => {
    if (!mounted() || !saveEnabled()) return
    setSaveError(
      !saveRecipe({
        mixerId: mixerId(),
        flourId: flourId(),
        balls: balls(),
        deadline: deadlineStr(),
        saucePerPizzaG: saucePerPizzaG(),
        mozzarellaPerPizzaG: mozzarellaPerPizzaG(),
        includeGas: includeGas(),
        gasPerM3: gasPerM3(),
        gasPerBakeM3: gasPerBakeM3(),
        sauceId: sauceId(),
        saucePerKg: saucePerKg(),
        mozzarellaId: mozzarellaId(),
        mozzarellaPerKg: mozzarellaPerKg(),
        flourPerKg: flourPerKg(),
        pantryPerKg: pantryPerKg(),
        toppingOn: toppingOn(),
        toppingG: toppingG(),
        toppingPerKg: toppingPerKg(),
      }),
    )
  })

  const toggleSave = (on: boolean) => {
    setSaveEnabled(on)
    storeSaveEnabled(on)
    if (!on) {
      clearSavedRecipe()
      setSaveError(false)
    }
  }

  const saveStatus = () => {
    if (!mounted()) return 'Saving on this device.'
    if (saveError()) return 'Could not save — storage is blocked in this browser.'
    if (!saveEnabled()) return 'Off — no saved copy; changes are lost when you close this tab.'
    return 'Saved on this device. Auto-saves as you change.'
  }

  const calendarMeta = createMemo(() => ({
    balls: ing().balls,
    flourName: flour().name,
    mixerName: mixer().name,
  }))

  const [calendarMenuOpen, setCalendarMenuOpen] = createSignal(false)
  const [calendarDownload, setCalendarDownload] = createSignal<CalendarDownloadState | null>(null)
  const [calendarStep, setCalendarStep] = createSignal<ScheduleStep | null>(null)
  const [stepDownloaded, setStepDownloaded] = createSignal(false)
  let calendarMenuRef: HTMLDivElement | undefined
  let stepDialogRef: HTMLDialogElement | undefined

  const downloadAllSteps = (provider: CalendarProvider = 'other') => {
    const p = plan()
    if (!p) return
    const filename = calendarFilename(p)
    downloadCalendar(buildCalendar(p, calendarMeta()), filename)
    setCalendarMenuOpen(false)
    setCalendarDownload({ provider, filename })
    if (provider === 'google') window.open(GOOGLE_IMPORT_URL, '_blank', 'noopener')
    if (provider === 'outlook') window.open(OUTLOOK_CALENDAR_URL, '_blank', 'noopener')
  }

  const openStepCalendar = (step: ScheduleStep) => {
    setCalendarStep(step)
    setStepDownloaded(false)
    stepDialogRef?.showModal()
  }

  const closeStepCalendar = () => {
    stepDialogRef?.close()
  }

  const downloadStepIcs = () => {
    const step = calendarStep()
    const p = plan()
    if (!step || !p) return
    downloadCalendar(buildStepCalendar(step, p, calendarMeta()), calendarStepFilename(step))
    setStepDownloaded(true)
  }

  // A download message refers to a specific plan; clear it when the recipe changes.
  createEffect(() => {
    plan()
    setCalendarDownload(null)
  })

  onMount(() => {
    const closeMenu = (event: PointerEvent) => {
      if (calendarMenuRef && !calendarMenuRef.contains(event.target as Node)) {
        setCalendarMenuOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalendarMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    onCleanup(() => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    })
  })

  return (
    <main class="page">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Vito Iacopelli’s Neapolitan dough · spiral-mixer edition</p>
          <h1>Dough calculator</h1>
          <p class="sub">
            Pick your flour and mixer, how many dough balls you want and when you want pizza. You
            get exact gram amounts and a schedule that works back from that moment.
          </p>
        </div>

        <div class="save-card">
          <label class="save-toggle">
            <input
              type="checkbox"
              role="switch"
              aria-label="Save recipe"
              aria-describedby="save-recipe-tooltip"
              checked={saveEnabled()}
              onChange={(e) => toggleSave(e.currentTarget.checked)}
            />
            <span class="save-track" aria-hidden="true">
              <span class="save-thumb" />
            </span>
            <span class="save-copy">Save</span>
          </label>
          <span class="save-tip" id="save-recipe-tooltip" role="tooltip">
            {saveStatus()}
          </span>
        </div>
      </header>

      <section class="card controls" aria-label="Calculator settings">
        <div class="field">
          <label for="mixer">Mixer</label>
          <select
            id="mixer"
            value={mixerId()}
            onInput={(e) => setMixerId(e.currentTarget.value as MixerId)}
          >
            <For each={MIXER_LIST}>
              {(m) => (
                <option value={m.id}>
                  {m.name} — {m.maker}
                </option>
              )}
            </For>
          </select>
          <p class="hint">{mixer().blurb}</p>
        </div>

        <div class="field">
          <label for="flour">Flour</label>
          <select
            id="flour"
            value={flourId()}
            onInput={(e) => {
              const id = e.currentTarget.value as FlourId
              setFlourId(id)
              setFlourPerKg(FLOUR_PRICES[id].perKg)
            }}
          >
            <For each={FLOUR_LIST}>
              {(f) => (
                <option value={f.id}>
                  {f.name} — {f.example}
                </option>
              )}
            </For>
          </select>
          <p class="hint">{flour().blurb}</p>
        </div>

        <div class="field">
          <label for="balls">Dough balls</label>
          <div class="stepper">
            <button
              type="button"
              aria-label="One ball less"
              onClick={() => setBalls(clampBalls(balls() - 1))}
            >
              −
            </button>
            <input
              id="balls"
              type="number"
              min={1}
              max={30}
              value={balls()}
              onInput={(e) => setBalls(clampBalls(parseInt(e.currentTarget.value, 10)))}
            />
            <button
              type="button"
              aria-label="One ball more"
              onClick={() => setBalls(clampBalls(balls() + 1))}
            >
              +
            </button>
          </div>
          <p class="hint">
            {BALL_WEIGHT_G} g each · {formatG(ing().totalDoughG)} g of dough
          </p>
        </div>

        <div class="field">
          <label for="deadline">Pizza ready at</label>
          <input
            id="deadline"
            type="datetime-local"
            value={deadlineStr()}
            onInput={(e) => setDeadlineStr(e.currentTarget.value)}
          />
          <p class="hint">Local time — the whole schedule follows it.</p>
        </div>
      </section>

      <Show when={capacity().level === 'warn'}>
        <div class="banner warn" role="note">
          <strong>Batch size:</strong> {capacity().message}
        </div>
      </Show>

      <Show
        when={plan()}
        fallback={
          <div class="card placeholder">
            <p>Working out your schedule…</p>
          </div>
        }
      >
        {(() => {
          const p = plan
          const i = ing
          const m = mixer
          const fl = flour
          const dayNumber = (d: Date) => {
            const start = new Date(p()!.poolishStart)
            start.setHours(0, 0, 0, 0)
            const day = new Date(d)
            day.setHours(0, 0, 0, 0)
            return Math.round((day.getTime() - start.getTime()) / 86_400_000) + 1
          }
          const nowTs = nowTick()
          const nextIdx = p()!.steps.findIndex((s) => s.at.getTime() >= nowTs)
          return (
            <div class="results">
              <section class="card" aria-label="Ingredients">
                <h2>Ingredients</h2>
                <p class="card-sub">
                  Vito’s ratios: {fl().hydrationPct}% hydration · 2.5% salt · 25% poolish
                  <Show when={fl().hydrationPct !== REFERENCE_HYDRATION_PCT}>
                    {' '}
                    — hydration adjusted from Vito’s {REFERENCE_HYDRATION_PCT}% reference for this
                    flour (see the Flour card below).
                  </Show>
                </p>

                <h3>
                  Poolish <span class="tag">the day before</span>
                </h3>
                <dl class="rows">
                  <Row label={fl().ingredientLabel} value={`${formatG(i().poolishFlourG)} g`} />
                  <Row label="Cold water" value={`${formatG(i().poolishWaterG)} g`} />
                  <Row label="Dry yeast" value={`${formatG(i().yeastG)} g`} />
                  <Row label="Honey" value={`${formatG(i().honeyG)} g`} />
                </dl>

                <h3>
                  Dough <span class="tag">next day</span>
                </h3>
                <dl class="rows">
                  <Row label="Poolish" value={`all of it (~${formatG(i().poolishTotalG)} g)`} />
                  <Row label={fl().ingredientLabel} value={`${formatG(i().doughFlourG)} g`} />
                  <Row label="Very cold water" value={`${formatG(i().doughWaterG)} g`} />
                  <Row label="Salt" value={`${formatG(i().saltG)} g`} />
                </dl>

                <p class="totals">
                  Total: <strong>{formatG(i().totalFlourG)} g flour</strong> ·{' '}
                  <strong>{formatG(i().totalWaterG)} g water</strong> · dough ≈{' '}
                  <strong>{formatG(i().totalDoughG)} g</strong> → {i().balls} × {BALL_WEIGHT_G} g
                </p>
                <p class="hint">
                  Use a 0.1 g scale for yeast and honey; whole grams are fine for the rest.
                  Water in grams = millilitres.
                </p>
                <p class="hint">
                  Mixing <strong>{fl().example}</strong> — full specs and the adjustments to Vito’s
                  recipe are in the <a href="#flour">Flour card</a> below.
                </p>
              </section>

              <section class="card schedule" aria-label="Schedule">
                <h2>Your timeline</h2>
                <p class="card-sub">
                  Works back from <strong>{formatFull(p()!.bakeAt)}</strong>. Local time — past
                  steps are dimmed, “Next up” is what to do next.
                </p>

                <div class="calendar-bar">
                  <div class="split-button" ref={calendarMenuRef}>
                    <button
                      type="button"
                      class="split-main"
                      onClick={() => downloadAllSteps('other')}
                    >
                      <DownloadIcon />
                      Download all steps (.ics)
                    </button>
                    <button
                      type="button"
                      class="split-toggle"
                      aria-label="Choose your calendar"
                      aria-haspopup="menu"
                      aria-expanded={calendarMenuOpen()}
                      aria-controls="calendar-menu"
                      onClick={() => setCalendarMenuOpen((open) => !open)}
                    >
                      <ChevronIcon />
                    </button>
                    <Show when={calendarMenuOpen()}>
                      <div class="calendar-menu" id="calendar-menu" role="menu">
                        <p class="calendar-menu-head">
                          One file · {p()!.steps.length} separate events
                        </p>
                        <button
                          type="button"
                          role="menuitem"
                          class="calendar-item"
                          onClick={() => downloadAllSteps('google')}
                        >
                          <span>Google Calendar</span>
                          <span class="calendar-item-note">import page</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          class="calendar-item"
                          onClick={() => downloadAllSteps('apple')}
                        >
                          <span>Apple Calendar</span>
                          <span class="calendar-item-note">.ics</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          class="calendar-item"
                          onClick={() => downloadAllSteps('outlook')}
                        >
                          <span>Outlook Calendar</span>
                          <span class="calendar-item-note">open calendar</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          class="calendar-item"
                          onClick={() => downloadAllSteps('other')}
                        >
                          <span>Other calendar</span>
                          <span class="calendar-item-note">.ics</span>
                        </button>
                      </div>
                    </Show>
                  </div>

                  <span class="calendar-note">
                    {`${p()!.steps.length} separate events at the exact step times · ${REMINDER_MIN} min reminder each`}
                  </span>
                </div>

                <Show when={calendarDownload()}>
                  {(download) => (
                    <div class="calendar-status" role="status">
                      <span class="calendar-status-check" aria-hidden="true">
                        ✓
                      </span>
                      <div class="calendar-status-body">
                        <strong>Downloaded {download().filename}</strong>
                        <p>{calendarStatusText(download().provider, p()!.steps.length)}</p>
                        <p class="calendar-status-links">
                          <a href={GOOGLE_IMPORT_URL} target="_blank" rel="noreferrer">
                            Google Calendar import
                          </a>
                          {' · '}
                          <a href={OUTLOOK_CALENDAR_URL} target="_blank" rel="noreferrer">
                            Outlook Calendar
                          </a>
                        </p>
                      </div>
                      <button
                        type="button"
                        class="calendar-status-close"
                        aria-label="Dismiss download message"
                        onClick={() => setCalendarDownload(null)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </Show>

                <Show when={p()!.warnings.length > 0}>
                  <div class="banner warn" role="note">
                    {p()!.warnings.join(' ')}
                  </div>
                </Show>

                <ol class="timeline">
                  <For each={p()!.steps}>
                    {(s, i) => (
                      <li
                        class={`step step-${s.kind}${s.at.getTime() < nowTs ? ' step-past' : ''}${
                          i() === nextIdx ? ' step-next' : ''
                        }`}
                      >
                        <div class="step-when">
                          <span class="day-pill">Day {dayNumber(s.at)}</span>
                          <time datetime={s.at.toISOString()}>{formatStepTime(s.at)}</time>
                          <Show when={i() === nextIdx}>
                            <span class="tag">
                              Next up · in {formatDuration((s.at.getTime() - nowTs) / 60_000)}
                            </span>
                          </Show>
                          <button
                            type="button"
                            class="step-calendar-btn"
                            aria-label={`Add “${s.title}” to your calendar`}
                            title="Add this step to your calendar"
                            onClick={() => openStepCalendar(s)}
                          >
                            <CalendarPlusIcon />
                          </button>
                        </div>
                        <div class="step-body">
                          <h3>{s.title}</h3>

                          <Show when={s.equipment.length > 0}>
                            <div class="step-section">
                              <h4>Equipment</h4>
                              <p class="step-equipment">{s.equipment.join(' · ')}</p>
                            </div>
                          </Show>

                          <Show when={s.ingredients.length > 0}>
                            <div class="step-section">
                              <h4>Ingredients</h4>
                              <ul class="step-ingredients">
                                <For each={s.ingredients}>
                                  {(item) => (
                                    <li>
                                      <Show when={item.amount}>
                                        <span class="step-amount">{item.amount}</span>
                                      </Show>
                                      <span>{item.name}</span>
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </div>
                          </Show>

                          <div class="step-section">
                            <h4>Steps</h4>
                            <ol class="step-instructions">
                              <For each={s.instructions}>{(line) => <li>{line}</li>}</For>
                            </ol>
                          </div>

                          <Show when={s.chip}>
                            <span class="chip">{s.chip}</span>
                          </Show>
                        </div>
                      </li>
                    )}
                  </For>
                </ol>

                <dialog
                  ref={stepDialogRef}
                  class="calendar-dialog"
                  aria-labelledby="step-calendar-title"
                  onClose={() => {
                    setCalendarStep(null)
                    setStepDownloaded(false)
                  }}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect()
                    if (
                      event.clientX < rect.left ||
                      event.clientX > rect.right ||
                      event.clientY < rect.top ||
                      event.clientY > rect.bottom
                    ) {
                      closeStepCalendar()
                    }
                  }}
                >
                  <Show when={calendarStep()}>
                    {(step) => {
                      const links = () => singleEventLinks(step(), p()!, calendarMeta())
                      return (
                        <>
                          <div class="calendar-dialog-head">
                            <div>
                              <p class="eyebrow">One step</p>
                              <h2 id="step-calendar-title">Add to calendar</h2>
                            </div>
                            <button
                              type="button"
                              class="dialog-close"
                              aria-label="Close"
                              onClick={closeStepCalendar}
                            >
                              ×
                            </button>
                          </div>

                          <div class="calendar-dialog-step">
                            <div class="step-when">
                              <span class="day-pill">Day {dayNumber(step().at)}</span>
                              <time datetime={step().at.toISOString()}>
                                {formatFull(step().at)}
                              </time>
                            </div>
                            <h3>{step().title}</h3>
                            <p class="hint">
                              {formatDuration(stepDurationMinutes(step().kind))} · reminder{' '}
                              {REMINDER_MIN} min before
                            </p>
                          </div>

                          <div class="calendar-dialog-actions">
                            <a
                              class="calendar-action"
                              href={links().google}
                              target="_blank"
                              rel="noreferrer"
                              onClick={closeStepCalendar}
                            >
                              <span>Google Calendar</span>
                              <span class="calendar-item-note">one click</span>
                            </a>
                            <a
                              class="calendar-action"
                              href={links().outlook}
                              target="_blank"
                              rel="noreferrer"
                              onClick={closeStepCalendar}
                            >
                              <span>Outlook Calendar</span>
                              <span class="calendar-item-note">one click</span>
                            </a>
                            <button type="button" class="calendar-action" onClick={downloadStepIcs}>
                              <span>Download .ics</span>
                              <span class="calendar-item-note">Apple Calendar + others</span>
                            </button>
                          </div>

                          <Show when={stepDownloaded()}>
                            <p class="calendar-dialog-status" role="status">
                              Downloaded — open the file to add this step.
                            </p>
                          </Show>

                          <p class="hint">
                            This adds only this step. Use <strong>Download all steps</strong> above
                            to add the whole schedule at once.
                          </p>
                        </>
                      )
                    }}
                  </Show>
                </dialog>
              </section>

              <section class="card costs" aria-label="Cost per pizza">
                <h2>Cost per pizza</h2>
                <p class="card-sub">
                  Real shelf prices from Dirk van den Broek, Makro, Aldi and AH, VAT included —
                  pick your sauce, mozzarella and extra toppings; every price is editable.
                </p>

                <div class="cost-controls">
                  <div class="field field-span-2">
                    <label for="sauce">Sauce</label>
                    <select
                      id="sauce"
                      value={sauceId()}
                      onInput={(e) => {
                        const id = e.currentTarget.value as SauceId
                        setSauceId(id)
                        setSaucePerKg(SAUCES[id].perKg)
                      }}
                    >
                      <For each={SAUCE_LIST}>
                        {(s) => (
                          <option value={s.id}>
                            {s.product} — {s.pack} ({s.store})
                          </option>
                        )}
                      </For>
                    </select>
                    <p class="hint">
                      {formatEuro(saucePerKg())}/kg · {SAUCES[sauceId()].note}
                    </p>
                  </div>
                  <div class="field">
                    <label for="sauce-per-pizza">Sauce per pizza (g)</label>
                    <input
                      id="sauce-per-pizza"
                      type="number"
                      min={0}
                      max={500}
                      step={5}
                      value={saucePerPizzaG()}
                      onInput={(e) =>
                        setSaucePerPizzaG(clampNum(parseFloat(e.currentTarget.value), 0, 500))
                      }
                    />
                  </div>
                  <div class="field field-span-2">
                    <label for="mozzarella">Mozzarella</label>
                    <select
                      id="mozzarella"
                      value={mozzarellaId()}
                      onInput={(e) => {
                        const id = e.currentTarget.value as MozzarellaId
                        setMozzarellaId(id)
                        setMozzarellaPerKg(MOZZARELLAS[id].perKg)
                      }}
                    >
                      <For each={MOZZARELLA_LIST}>
                        {(m) => (
                          <option value={m.id}>
                            {m.product} — {m.pack} ({m.store})
                          </option>
                        )}
                      </For>
                    </select>
                    <p class="hint">
                      {formatEuro(mozzarellaPerKg())}/kg · {MOZZARELLAS[mozzarellaId()].note}
                    </p>
                  </div>
                  <div class="field">
                    <label for="mozzarella-per-pizza">Mozzarella per pizza (g)</label>
                    <input
                      id="mozzarella-per-pizza"
                      type="number"
                      min={0}
                      max={500}
                      step={5}
                      value={mozzarellaPerPizzaG()}
                      onInput={(e) =>
                        setMozzarellaPerPizzaG(clampNum(parseFloat(e.currentTarget.value), 0, 500))
                      }
                    />
                  </div>
                  <div class="field">
                    <label for="gas-on">Oven gas</label>
                    <div class="check">
                      <input
                        id="gas-on"
                        type="checkbox"
                        checked={includeGas()}
                        onChange={(e) => setIncludeGas(e.currentTarget.checked)}
                      />
                      <label for="gas-on">Include gas</label>
                    </div>
                  </div>
                  <Show when={includeGas()}>
                    <div class="field">
                      <label for="gas-price">Gas price (€/m³)</label>
                      <input
                        id="gas-price"
                        type="number"
                        min={0}
                        step={0.01}
                        value={eur2(gasPerM3())}
                        onInput={(e) =>
                          setGasPerM3(clampNum(parseFloat(e.currentTarget.value), 0, 100))
                        }
                      />
                    </div>
                    <div class="field">
                      <label for="gas-per-bake">Gas per bake (m³)</label>
                      <input
                        id="gas-per-bake"
                        type="number"
                        min={0}
                        step={0.05}
                        value={gasPerBakeM3()}
                        onInput={(e) =>
                          setGasPerBakeM3(clampNum(parseFloat(e.currentTarget.value), 0, 10))
                        }
                      />
                    </div>
                  </Show>
                </div>

                <div class="toppings">
                  <h3>
                    Extra toppings <span class="tag">per pizza</span>
                  </h3>
                  <div class="topping-grid">
                    <For each={TOPPING_LIST}>
                      {(t) => (
                        <div class={`topping${toppingOn()[t.id] ? '' : ' topping-off'}`}>
                          <label class="topping-check">
                            <input
                              type="checkbox"
                              checked={toppingOn()[t.id]}
                              onChange={(e) => setToppingEnabled(t.id, e.currentTarget.checked)}
                            />
                            <span class="topping-text">
                              {t.product}
                              <small>
                                {t.store} · {formatEuro(toppingPerKg()[t.id])}/kg · {t.note}
                              </small>
                            </span>
                          </label>
                          <div class="topping-g">
                            <input
                              type="number"
                              min={0}
                              max={500}
                              step={5}
                              disabled={!toppingOn()[t.id]}
                              value={toppingG()[t.id]}
                              onInput={(e) =>
                                setToppingGrams(
                                  t.id,
                                  clampNum(parseFloat(e.currentTarget.value), 0, 500),
                                )
                              }
                            />
                            <span>g</span>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>

                <div class="cost-head">
                  <p class="cost-big">{formatEuro(costs().perPizza)}</p>
                  <p class="cost-sub">
                    per pizza — {formatEuro(costs().total)} for the batch ({i().balls} pizza
                    {i().balls === 1 ? '' : 's'}) · dough {formatEuro(costs().doughTotal)} · sauce
                    & mozzarella {formatEuro(costs().toppingTotal)}
                    <Show when={costs().extrasTotal > 0}>
                      {' '}
                      · extras {formatEuro(costs().extrasTotal)}
                    </Show>
                    <Show when={includeGas()}> · gas {formatEuro(costs().gasTotal)}</Show>
                  </p>
                </div>

                <table class="costs-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={costs().lines}>
                      {(l) => (
                        <tr>
                          <td>{l.label}</td>
                          <td>{l.amountText}</td>
                          <td>{l.unitPriceText}</td>
                          <td>{formatEuro(l.cost)}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3">
                        Total — {i().balls} pizza{i().balls === 1 ? '' : 's'}
                      </td>
                      <td>{formatEuro(costs().total)}</td>
                    </tr>
                  </tfoot>
                </table>

                <details class="price-editor">
                  <summary>Adjust prices (€ per kg, VAT included)</summary>
                  <div class="price-grid">
                    <div class="field">
                      <label for="price-flour">Flour (€/kg)</label>
                      <input
                        id="price-flour"
                        type="number"
                        min={0}
                        step={0.01}
                        value={eur2(flourPerKg())}
                        onInput={(e) =>
                          setFlourPerKg(clampNum(parseFloat(e.currentTarget.value), 0, 10000))
                        }
                      />
                    </div>
                    <For each={PANTRY_INPUTS}>
                      {(item) => (
                        <div class="field">
                          <label for={`price-${item.id}`}>{item.label}</label>
                          <input
                            id={`price-${item.id}`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={eur2(pantryPerKg()[item.id])}
                            onInput={(e) =>
                              setPantryPerKg((prev) => ({
                                ...prev,
                                [item.id]: clampNum(parseFloat(e.currentTarget.value), 0, 10000),
                              }))
                            }
                          />
                        </div>
                      )}
                    </For>
                    <div class="field">
                      <label for="price-sauce">Sauce (€/kg)</label>
                      <input
                        id="price-sauce"
                        type="number"
                        min={0}
                        step={0.01}
                        value={eur2(saucePerKg())}
                        onInput={(e) =>
                          setSaucePerKg(clampNum(parseFloat(e.currentTarget.value), 0, 10000))
                        }
                      />
                    </div>
                    <div class="field">
                      <label for="price-mozzarella">Mozzarella (€/kg)</label>
                      <input
                        id="price-mozzarella"
                        type="number"
                        min={0}
                        step={0.01}
                        value={eur2(mozzarellaPerKg())}
                        onInput={(e) =>
                          setMozzarellaPerKg(clampNum(parseFloat(e.currentTarget.value), 0, 10000))
                        }
                      />
                    </div>
                    <For each={TOPPING_LIST}>
                      {(t) => (
                        <div class="field">
                          <label for={`price-${t.id}`}>{t.short} (€/kg)</label>
                          <input
                            id={`price-${t.id}`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={eur2(toppingPerKg()[t.id])}
                            onInput={(e) =>
                              setToppingPrice(t.id, clampNum(parseFloat(e.currentTarget.value), 0, 10000))
                            }
                          />
                        </div>
                      )}
                    </For>
                  </div>
                  <p class="hint">
                    The flour, sauce and mozzarella prices follow the products picked above —
                    switching swaps in that product’s price until you edit it here. The topping
                    prices are editable here too.
                  </p>
                  <p class="hint">Prices checked 12 Oct 2026, VAT included.</p>
                  <For each={SOURCES_BY_STORE}>
                    {(group) => (
                      <p class="hint">
                        <strong>{group.store}:</strong>{' '}
                        <For each={group.sources}>
                          {(s, idx) => (
                            <>
                              <Show when={idx() > 0}> · </Show>
                              <a href={s.url} target="_blank" rel="noreferrer">
                                {s.product} {s.pack}
                              </a>
                            </>
                          )}
                        </For>
                      </p>
                    )}
                  </For>
                </details>

                <p class="hint">
                  Gas default: €1.68 per m³ — the average Dutch price incl. taxes (Oct 2026) — and
                  0.3 m³ per bake, about what a typical 2.5 kW gas oven uses for a 45 min preheat
                  plus baking. Read your meter for the exact figure. Tap water, basil and olive
                  oil aren’t counted.
                </p>
              </section>

              <section class="card flour-detail" id="flour" aria-label="Flour">
                <h2>Flour — {fl().name}</h2>
                <p class="card-sub">
                  Calibrated for <strong>{fl().example}</strong>
                </p>

                <Show when={fl().warning}>
                  <div class="banner warn" role="note">
                    {fl().warning}
                  </div>
                </Show>

                <h3>Data we have for this flour</h3>
                <dl class="rows">
                  <For each={fl().specs}>{(s) => <Row label={s.label} value={s.value} />}</For>
                </dl>

                <Show
                  when={fl().sources.length > 0}
                  fallback={
                    <p class="hint">
                      No published spec sheet for this class of flour — the figures above are
                      typical ranges, so treat them as guidance, not exact values.
                    </p>
                  }
                >
                  <p class="hint">
                    Source{fl().sources.length > 1 ? 's' : ''}:{' '}
                    <For each={fl().sources}>
                      {(s, idx) => (
                        <>
                          <Show when={idx() > 0}>{' · '}</Show>
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.label}
                          </a>
                        </>
                      )}
                    </For>
                  </p>
                </Show>

                <h3>Adjustments vs Vito’s original recipe</h3>
                <ul class="notes">
                  <For each={fl().adjustments}>{(a) => <li>{a}</li>}</For>
                </ul>
              </section>

              <section class="card procedure" aria-label="Mixing procedure">
                <h2>Mixing procedure — {m().name}</h2>
                <p class="card-sub">
                  Spiral {m().hookRange} · bowl {m().bowlRange}
                </p>

                <table class="phases">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      <th>Setting</th>
                      <th>≈ RPM</th>
                      <th>What happens</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1 · Incorporate</td>
                      <td>{m().phases.incorporate.setting}</td>
                      <td>{m().phases.incorporate.rpm}</td>
                      <td>{m().phases.incorporate.what}</td>
                    </tr>
                    <tr>
                      <td>2 · Water</td>
                      <td>{m().phases.water.setting}</td>
                      <td>{m().phases.water.rpm}</td>
                      <td>{m().phases.water.what}</td>
                    </tr>
                    <tr>
                      <td>3 · Knead</td>
                      <td>{m().phases.knead.setting}</td>
                      <td>{m().phases.knead.rpm}</td>
                      <td>
                        {m().phases.knead.what} · {fl().kneadMinutes} for this flour
                      </td>
                    </tr>
                  </tbody>
                </table>

                <ul class="notes">
                  <For each={m().notes}>{(n) => <li>{n}</li>}</For>
                </ul>

                <p class="hint">
                  Source:{' '}
                  <a href={m().sourceUrl} target="_blank" rel="noreferrer">
                    {m().name} documentation and Vito’s official recipe
                  </a>
                </p>
              </section>
            </div>
          )
        })()}
      </Show>

      <footer class="foot">
        <p>
          Recipe:{' '}
          <a
            href="https://autenti.co/blogs/recipes/autentico-s-classic-neapolitan-pizza-dough-recipe"
            target="_blank"
            rel="noreferrer"
          >
            Vito Iacopelli’s classic Neapolitan dough
          </a>
          . Speeds: official{' '}
          <a
            href="https://revobake.com/pages/revo-bake-titan-tilt-7-5-pro"
            target="_blank"
            rel="noreferrer"
          >
            Revo Bake speed chart
          </a>{' '}
          and Autentico 700 specs.
        </p>
        <p>
          Everything runs in your browser — the calculator sends nothing anywhere. With saving on,
          your recipe stays on this device. Calendar options generate the .ics file locally and open
          the provider’s import page when needed. Times use your local timezone.
        </p>
      </footer>
    </main>
  )
}

function Row(props: { label: string; value: string }) {
  return (
    <div class="row">
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
    </div>
  )
}

function CalendarPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="1.75"
        y="3.25"
        width="12.5"
        height="11"
        rx="2"
        stroke="currentColor"
        stroke-width="1.5"
      />
      <path
        d="M1.75 6.5h12.5M5.25 1.75v3M10.75 1.75v3M8 8.75v3.25M6.4 10.4h3.2"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2v8m0 0 3-3m-3 3L5 7M3 12.5h10"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  )
}
