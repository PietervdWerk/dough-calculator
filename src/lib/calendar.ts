/**
 * Calendar export for the dough schedule.
 *
 * Two shapes are supported:
 * - the whole schedule as one iCalendar file with a VEVENT per step, so a
 *   single import puts every step in the calendar with its own reminder;
 * - one step as a standalone iCalendar file, or as a single-event deep link
 *   for Google/Outlook/Yahoo.
 *
 * Everything is generated in the browser; nothing is uploaded anywhere.
 */

import { formatFull, type Plan, type ScheduleStep, type StepKind } from './recipe'

/** How long each step is blocked out in the calendar, in minutes. */
const STEP_DURATION_MIN: Record<StepKind, number> = {
  poolish: 15,
  mix: 20,
  rest: 5,
  ball: 20,
  out: 5,
  preheat: 45,
  bake: 20,
}

/** Every event gets a heads-up this long before it starts. */
export const REMINDER_MIN = 10

const PRODID = '-//Dough Calculator//Pizza Dough Schedule//EN'
const UID_DOMAIN = 'dough-calculator.codeover.nl'

/**
 * Google, Outlook and Yahoo can only pre-fill a single event from a link, so
 * the only way to add every step as its own event is to import a calendar file.
 * These pages are where that file gets uploaded.
 */
export const GOOGLE_IMPORT_URL = 'https://calendar.google.com/calendar/r/settings/import'
export const OUTLOOK_CALENDAR_URL = 'https://outlook.live.com/calendar/0/'

export interface CalendarMeta {
  balls: number
  flourName: string
  mixerName: string
}

export interface SingleEventLinks {
  google: string
  outlook: string
  yahoo: string
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** iCalendar UTC timestamp: 20261104T170000Z */
function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  )
}

/** ISO timestamp without milliseconds for Outlook links. */
function isoStamp(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Escape a TEXT property value (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Fold a content line at 75 octets (RFC 5545 §3.1). A continuation line starts
 * with a space, which counts toward its own 75-octet budget. Iterating code
 * points keeps multibyte characters and surrogate pairs intact.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder()
  let result = ''
  let lineBytes = 0

  for (const char of line) {
    const charBytes = encoder.encode(char).length
    if (lineBytes + charBytes > 75) {
      result += '\r\n '
      lineBytes = 1 // the leading continuation space
    }
    result += char
    lineBytes += charBytes
  }

  return result
}

/** Small stable hash so re-downloading the same plan updates the same events. */
function hash(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** URL-encode query values with %20 instead of '+'. */
function queryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString().replace(/\+/g, '%20')
}

/** The human-readable details shared by every calendar format. */
function stepDescription(step: ScheduleStep, plan: Plan, meta: CalendarMeta): string {
  const sections: string[] = []

  if (step.equipment.length > 0) {
    sections.push(['EQUIPMENT', ...step.equipment.map((item) => `- ${item}`)].join('\n'))
  }

  if (step.ingredients.length > 0) {
    sections.push(
      [
        'INGREDIENTS',
        ...step.ingredients.map((item) =>
          `- ${item.amount ? `${item.amount} ${item.name}` : item.name}`,
        ),
      ].join('\n'),
    )
  }

  sections.push(
    [
      'STEPS',
      ...step.instructions.map((line, index) => `${index + 1}. ${line}`),
    ].join('\n'),
  )

  const timing = step.chip ? `\n\nTiming: ${step.chip}` : ''

  return `${sections.join('\n\n')}${timing}

${meta.balls} dough ball${meta.balls === 1 ? '' : 's'} · ${meta.flourName} · ${meta.mixerName}
Pizza ready ${formatFull(plan.bakeAt)}
Schedule from the Dough Calculator.`
}

export function stepDurationMinutes(kind: StepKind): number {
  return STEP_DURATION_MIN[kind]
}

/* ------------------------------------------------------------------ */
/* iCalendar                                                           */
/* ------------------------------------------------------------------ */

function stepEvent(
  step: ScheduleStep,
  plan: Plan,
  meta: CalendarMeta,
  generatedAt: Date,
): string[] {
  const start = step.at
  const end = new Date(start.getTime() + stepDurationMinutes(step.kind) * 60_000)
  const uid = hash(
    `${plan.deadline.toISOString()}|${step.kind}|${start.toISOString()}|${meta.balls}`,
  )
  const summary = `Pizza: ${step.title}`

  return [
    'BEGIN:VEVENT',
    `UID:dough-${uid}@${UID_DOMAIN}`,
    `DTSTAMP:${utcStamp(generatedAt)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(stepDescription(step, plan, meta))}`,
    'CATEGORIES:Pizza',
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    `TRIGGER:-PT${REMINDER_MIN}M`,
    'END:VALARM',
    'END:VEVENT',
  ]
}

/** Build an iCalendar document containing one event per schedule step. */
export function buildCalendar(
  plan: Plan,
  meta: CalendarMeta,
  generatedAt: Date = new Date(),
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...plan.steps.flatMap((step) => stepEvent(step, plan, meta, generatedAt)),
    'END:VCALENDAR',
  ]

  return `${lines.map(foldLine).join('\r\n')}\r\n`
}

/** Build a calendar file containing just one schedule step. */
export function buildStepCalendar(
  step: ScheduleStep,
  plan: Plan,
  meta: CalendarMeta,
  generatedAt: Date = new Date(),
): string {
  return buildCalendar({ ...plan, steps: [step] }, meta, generatedAt)
}

/** Download filename based on the day the pizza is ready. */
export function calendarFilename(plan: Plan): string {
  return `pizza-dough-${localDate(plan.deadline)}.ics`
}

/** Download filename for a single step, e.g. pizza-dough-poolish-2026-11-02.ics */
export function calendarStepFilename(step: ScheduleStep): string {
  return `pizza-dough-${step.kind}-${localDate(step.at)}.ics`
}

/* ------------------------------------------------------------------ */
/* Single-event provider links                                         */
/* ------------------------------------------------------------------ */

/**
 * Direct one-click event creation for a single step. These links only support
 * one event each, which is why the full schedule uses the .ics import instead.
 */
export function singleEventLinks(
  step: ScheduleStep,
  plan: Plan,
  meta: CalendarMeta,
): SingleEventLinks {
  const start = step.at
  const end = new Date(start.getTime() + stepDurationMinutes(step.kind) * 60_000)
  const title = `Pizza: ${step.title}`
  const details = stepDescription(step, plan, meta)

  return {
    google: `https://calendar.google.com/calendar/render?${queryString({
      action: 'TEMPLATE',
      text: title,
      dates: `${utcStamp(start)}/${utcStamp(end)}`,
      details,
    })}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${queryString({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: title,
      startdt: isoStamp(start),
      enddt: isoStamp(end),
      body: details,
      allday: 'false',
    })}`,
    yahoo: `https://calendar.yahoo.com/?${queryString({
      v: '60',
      view: 'd',
      type: '20',
      title,
      st: utcStamp(start),
      et: utcStamp(end),
      desc: details,
    })}`,
  }
}

/* ------------------------------------------------------------------ */
/* Download                                                            */
/* ------------------------------------------------------------------ */

/** Trigger a browser download for the generated calendar file. */
export function downloadCalendar(ics: string, filename: string): void {
  if (typeof document === 'undefined') return

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
