# Dough Calculator

A tiny single-page calculator for **Vito Iacopelli’s classic Neapolitan pizza dough**, scaled to your batch and scheduled around the moment you want pizza.

- **Scale:** choose how many dough balls you want — everything is rescaled from Vito’s official recipe (62.5 % hydration, 25 % poolish, 24 h cold ferment).
- **Mixer-aware:** pick the **Autentico 700** (Vito’s mixer) or the **Revo Bake Titan Tilt 7.5 PRO** and get the exact speed settings for the mixing phase, matched by RPM. Batch-size warnings for the mixer’s minimum/maximum load are included.
- **Scheduled:** give a “pizza ready at” time and the page back-plans the whole process — when to make the poolish, when to mix (with speeds), when to ball, when to take the balls out of the fridge, when to preheat and when to bake. If your deadline is too soon, it tells you the earliest achievable date and shows that plan instead.

The default is Vito’s recipe for **4 balls**, ready in **2 days at 18:00** local time.

## How the schedule works

The recipe is a 2–3 day double-fermentation dough. The calculator works backwards from the “pizza ready at” moment:

| Offset before bake | Step |
| --- | --- |
| −3 h | Balls come out of the fridge (2–4 h warm-up window) |
| −24 h | Ball the dough into the cold ferment (can be stretched to 48 h) |
| −45 min | Mix block: mixing (15–20 min) + rest (5 min) + balling |
| −19 h | Make the poolish (window: 16–24 h in the fridge) |

If “now” is already inside the poolish window, the poolish start time is clamped to now and the chip shows the shortened ferment. If the deadline is less than ~43 h 45 m away (16 h poolish + 45 min mix + 24 h cold + 3 h warm-up), the page shows the earliest feasible plan instead.

## Mixer speed mapping

The two machines are matched by actual spiral RPM, not by dial numbers:

| Phase | Autentico 700 (dial ≈ rpm) | Revo Bake Titan Tilt 7.5 PRO (level ≈ rpm) |
| --- | --- | --- |
| Incorporate poolish + flour | Dial 1 (≈ 42 rpm) | Level 1 (≈ 45 rpm) |
| Add water in doses | Dial 2–3 (≈ 58–75 rpm) | Level 2 (≈ 85 rpm) |
| Knead 12–15 min | Dial 4–5 (≈ 91–108 rpm) | Level 3 (≈ 125 rpm) |

Sources: the Autentico instruction manual (spiral 42–190 rpm, bowl 8–36 rpm) and the official Revo speed chart (levels 1–11 = 45/85/125/164/202/240/278/316/355/392/420 rpm ± 10 % under load).

> On the Revo, pizza dough only ever needs levels 1–3; level 4 is the ceiling for very wet doughs. Levels 5–11 are faster than Vito’s mixer goes for dough — never use them for this recipe.

## Tech

- **[TanStack Start](https://tanstack.com/start)** with **SolidJS** (`@tanstack/solid-start`, file-based routing).
- Static **prerendering** enabled — the whole app is a static page (`dist/client/`), no server required.
- Deployed to **Cloudflare Pages** with `wrangler` (production + preview branches).

## Commands

```bash
pnpm dev             # local dev server on :3000
pnpm build           # prerendered static build → dist/client
pnpm deploy          # build + deploy production to Cloudflare Pages
pnpm deploy:preview  # build + deploy to the `preview` branch on Cloudflare Pages
```

## Recipe & data sources

- Recipe: [Autentico — “Autentico’s Classic Neapolitan Pizza Dough Recipe”](https://autenti.co/blogs/recipes/autentico-s-classic-neapolitan-pizza-dough-recipe) (Vito Iacopelli’s official machine recipe).
- Mixer specs: [Autentico 700 product page](https://autenti.co/products/autentico-700-spiral-dough-mixer) and its instruction manual (model 10 MO VV: spiral 42 ÷ 190 rpm, tank 8 ÷ 36 rpm).
- Your machine: [Revo Bake Titan Tilt 7.5 PRO support page](https://revobake.com/pages/revo-bake-titan-tilt-7-5-pro) — official speed chart and user manual.

Nothing you enter leaves the browser — all calculations are client-side.
