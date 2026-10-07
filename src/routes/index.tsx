import { createFileRoute } from '@tanstack/solid-router'
import {
  For,
  Show,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import { MIXERS, MIXER_LIST, type MixerId } from '../lib/mixers'
import {
  BALL_WEIGHT_G,
  HYDRATION_PCT,
  buildPlan,
  checkCapacity,
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
          'Scale Vito Iacopelli’s Neapolitan dough to any number of dough balls, pick your spiral mixer (Autentico 700 or Revo Bake Titan 7.5 PRO) and get exact grams plus a clock-perfect schedule before you bake.',
      },
    ],
  }),
  component: Home,
})

function Home() {
  const [mixerId, setMixerId] = createSignal<MixerId>('autentico')
  const [balls, setBalls] = createSignal(4)
  const [deadlineStr, setDeadlineStr] = createSignal('')
  const [mounted, setMounted] = createSignal(false)

  onMount(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    d.setHours(18, 0, 0, 0)
    setDeadlineStr(toLocalInputValue(d))
    setMounted(true)
  })

  const clampBalls = (n: number) => Math.min(30, Math.max(1, Math.round(n) || 1))

  const mixer = createMemo(() => MIXERS[mixerId()])
  const ing = createMemo(() => scaleIngredients(clampBalls(balls())))
  const capacity = createMemo(() => checkCapacity(mixer(), ing().balls, ing()))

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
    })
  })

  return (
    <main class="page">
      <header class="hero">
        <p class="eyebrow">Vito Iacopelli’s Neapolitan dough · spiral-mixer edition</p>
        <h1>Dough calculator</h1>
        <p class="sub">
          Pick your mixer, how many dough balls you want and when you want pizza. You get exact
          gram amounts and a schedule that works back from that moment.
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
          const dayNumber = (d: Date) => {
            const start = new Date(p()!.poolishStart)
            start.setHours(0, 0, 0, 0)
            const day = new Date(d)
            day.setHours(0, 0, 0, 0)
            return Math.round((day.getTime() - start.getTime()) / 86_400_000) + 1
          }
          return (
            <div class="results">
              <section class="card" aria-label="Ingredients">
                <h2>Ingredients</h2>
                <p class="card-sub">
                  Vito’s ratios: {HYDRATION_PCT}% hydration · 2.5% salt · 25% poolish
                </p>

                <h3>
                  Poolish <span class="tag">the day before</span>
                </h3>
                <dl class="rows">
                  <Row label="Tipo 00 flour" value={`${formatG(i().poolishFlourG)} g`} />
                  <Row label="Cold water" value={`${formatG(i().poolishWaterG)} g`} />
                  <Row label="Dry yeast" value={`${formatG(i().yeastG)} g`} />
                  <Row label="Honey" value={`${formatG(i().honeyG)} g`} />
                </dl>

                <h3>
                  Dough <span class="tag">next day</span>
                </h3>
                <dl class="rows">
                  <Row label="Poolish" value={`all of it (~${formatG(i().poolishTotalG)} g)`} />
                  <Row label="Tipo 00 flour" value={`${formatG(i().doughFlourG)} g`} />
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
              </section>

              <section class="card" aria-label="Schedule">
                <h2>Your timeline</h2>
                <p class="card-sub">
                  Works back from <strong>{formatFull(p()!.bakeAt)}</strong>. Local time.
                </p>

                <Show when={p()!.warnings.length > 0}>
                  <div class="banner warn" role="note">
                    {p()!.warnings.join(' ')}
                  </div>
                </Show>

                <ol class="timeline">
                  <For each={p()!.steps}>
                    {(s) => (
                      <li class={`step step-${s.kind}`}>
                        <div class="step-when">
                          <span class="day-pill">Day {dayNumber(s.at)}</span>
                          <time datetime={s.at.toISOString()}>{formatStepTime(s.at)}</time>
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
                        {m().phases.knead.what} · {m().phases.knead.minutes}
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
