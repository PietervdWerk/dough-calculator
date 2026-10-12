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
  GAS_DEFAULTS,
  MOZZARELLA_LIST,
  MOZZARELLA_PER_PIZZA_G,
  MOZZARELLAS,
  PANTRY_PRICES,
  SAUCE_LIST,
  SAUCE_PER_PIZZA_G,
  SAUCES,
  buildCosts,
  formatEuro,
  type MozzarellaId,
  type PantryId,
  type PriceSource,
  type SauceId,
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
} from '../lib/recipe'

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
    ].filter((s) => s.store === store),
  }))
  .filter((g) => g.sources.length > 0)

function Home() {
  const [mixerId, setMixerId] = createSignal<MixerId>('autentico')
  const [flourId, setFlourId] = createSignal<FlourId>('neapolitan')
  const [balls, setBalls] = createSignal(4)
  const [deadlineStr, setDeadlineStr] = createSignal('')
  const [mounted, setMounted] = createSignal(false)
  /** Ticks every minute so past/next markers stay fresh on a long-open page. */
  const [nowTick, setNowTick] = createSignal(Date.now())

  /* Cost calculator state — defaults are real shelf prices (see costs.ts). */
  const [saucePerPizzaG, setSaucePerPizzaG] = createSignal(SAUCE_PER_PIZZA_G)
  const [mozzarellaPerPizzaG, setMozzarellaPerPizzaG] = createSignal(MOZZARELLA_PER_PIZZA_G)
  const [includeGas, setIncludeGas] = createSignal(false)
  const [gasPerM3, setGasPerM3] = createSignal(GAS_DEFAULTS.perM3)
  const [gasPerBakeM3, setGasPerBakeM3] = createSignal(GAS_DEFAULTS.perBakeM3)
  const [sauceId, setSauceId] = createSignal<SauceId>('cirio')
  const [saucePerKg, setSaucePerKg] = createSignal(SAUCES.cirio.perKg)
  const [mozzarellaId, setMozzarellaId] = createSignal<MozzarellaId>('aro-stick')
  const [mozzarellaPerKg, setMozzarellaPerKg] = createSignal(MOZZARELLAS['aro-stick'].perKg)
  const [flourPerKg, setFlourPerKg] = createSignal(FLOUR_PRICES.neapolitan.perKg)
  const [pantryPerKg, setPantryPerKg] = createSignal<Record<PantryId, number>>({
    salt: PANTRY_PRICES.salt.perKg,
    yeast: PANTRY_PRICES.yeast.perKg,
    honey: PANTRY_PRICES.honey.perKg,
  })

  onMount(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    d.setHours(18, 0, 0, 0)
    setDeadlineStr(toLocalInputValue(d))
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

  // Switching flour/sauce/mozzarella swaps in that product's shelf price
  // (until you edit it in the cost card).
  createEffect(() => setFlourPerKg(FLOUR_PRICES[flourId()].perKg))
  createEffect(() => setSaucePerKg(SAUCES[sauceId()].perKg))
  createEffect(() => setMozzarellaPerKg(MOZZARELLAS[mozzarellaId()].perKg))

  const plan = createMemo<Plan | null>(() => {
    if (!mounted() || !deadlineStr()) return null
    const d = new Date(deadlineStr())
    if (Number.isNaN(d.getTime())) return null
    return buildPlan({
      now: new Date(),
      deadline: d,
      mixer: mixer(),
      balls: ing().balls,
      ing: ing(),
      kneadMinutes: flour().kneadMinutes,
      mixChip: flour().mixChip,
      coldFermentH: flour().coldFermentH,
      coldFermentMaxH: flour().coldFermentMaxH,
      poolishMinH: flour().poolishMinH,
      poolishIdealH: flour().poolishIdealH,
      poolishMaxH: flour().poolishMaxH,
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
      flourPerKg: flourPerKg(),
      pantryPerKg: pantryPerKg(),
      saucePerKg: saucePerKg(),
      mozzarellaPerKg: mozzarellaPerKg(),
      gas: includeGas() ? { perM3: gasPerM3(), perBakeM3: gasPerBakeM3() } : undefined,
    }),
  )

  return (
    <main class="page">
      <header class="hero">
        <p class="eyebrow">Vito Iacopelli’s Neapolitan dough · spiral-mixer edition</p>
        <h1>Dough calculator</h1>
        <p class="sub">
          Pick your flour and mixer, how many dough balls you want and when you want pizza. You get
          exact gram amounts and a schedule that works back from that moment.
        </p>
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
            onInput={(e) => setFlourId(e.currentTarget.value as FlourId)}
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

              <section class="card" aria-label="Schedule">
                <h2>Your timeline</h2>
                <p class="card-sub">
                  Works back from <strong>{formatFull(p()!.bakeAt)}</strong>. Local time — past
                  steps are dimmed, “Next up” is what to do next.
                </p>

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
                        </div>
                        <div class="step-body">
                          <h3>{s.title}</h3>
                          <For each={s.lines}>{(l) => <p>{l}</p>}</For>
                          <Show when={s.chip}>
                            <span class="chip">{s.chip}</span>
                          </Show>
                        </div>
                      </li>
                    )}
                  </For>
                </ol>
              </section>

              <section class="card costs" aria-label="Cost per pizza">
                <h2>Cost per pizza</h2>
                <p class="card-sub">
                  Real shelf prices from Dirk van den Broek, Makro, Aldi and AH, VAT included —
                  pick your sauce and mozzarella; every price is editable.
                </p>

                <div class="cost-controls">
                  <div class="field field-span-2">
                    <label for="sauce">Sauce</label>
                    <select
                      id="sauce"
                      value={sauceId()}
                      onInput={(e) => setSauceId(e.currentTarget.value as SauceId)}
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
                      onInput={(e) => setMozzarellaId(e.currentTarget.value as MozzarellaId)}
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

                <div class="cost-head">
                  <p class="cost-big">{formatEuro(costs().perPizza)}</p>
                  <p class="cost-sub">
                    per pizza — {formatEuro(costs().total)} for the batch ({i().balls} pizza
                    {i().balls === 1 ? '' : 's'}) · dough {formatEuro(costs().doughTotal)} ·
                    toppings {formatEuro(costs().toppingTotal)}
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
                  </div>
                  <p class="hint">
                    The flour, sauce and mozzarella prices follow the products picked above —
                    switching swaps in that product’s price until you edit it here.
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
        <p>Everything runs in your browser — no data leaves it. Times use your local timezone.</p>
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
