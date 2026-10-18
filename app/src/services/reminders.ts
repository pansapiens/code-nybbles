/** Android reminders (plans/01 §8.2): a daily nudge at the learner's chosen time and an evening "streak at risk" one. */
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { addDays, daysBetween, type LocalDate } from '@/domain/dates'

export interface ReminderState {
  now: number
  today: LocalDate
  /** 'HH:mm'; empty or undefined means reminders are off. */
  reminderTime?: string
  streak: number
  doneToday: boolean
}
export interface Reminder {
  id: number
  at: number
  title: string
  body: string
}

const DAYS_AHEAD = 3
const RISK_HOUR = 22

const at = (date: LocalDate, hh: number, mm: number) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!, hh, mm).getTime()
}

/**
 * Which reminders to have pending, at most one daily plus one streak reminder a day. Today's are dropped once
 * a lesson is done. A future day's streak reminder needs a streak that today's lesson secures; if today is missed
 * the streak is gone by then, and the app reschedules the next time it opens.
 */
export function planReminders(s: ReminderState): Reminder[] {
  if (!s.reminderTime) return []
  const [hh, mm] = s.reminderTime.split(':').map(Number) as [number, number]
  const out: Reminder[] = []
  for (let i = 0; i < DAYS_AHEAD; i++) {
    if (i === 0 && s.doneToday) continue
    const date = addDays(s.today, i)
    const base = daysBetween('1970-01-01', date) * 2
    out.push({ id: base, at: at(date, hh, mm), title: 'Time for a Rust nybble', body: 'One short lesson keeps you moving.' })
    if (i === 0 ? s.streak > 0 : s.doneToday) {
      out.push({ id: base + 1, at: at(date, RISK_HOUR, 0), title: 'Your streak is at risk', body: 'A quick lesson before midnight keeps it going.' })
    }
  }
  return out.filter((r) => r.at > s.now)
}

/** Native only. Asks for notification permission once the learner has finished something, never at launch. */
export async function syncReminders(s: ReminderState, hasProgress: boolean) {
  if (!Capacitor.isNativePlatform()) return
  let { display } = await LocalNotifications.checkPermissions()
  if (display === 'prompt' && hasProgress && s.reminderTime) display = (await LocalNotifications.requestPermissions()).display
  if (display !== 'granted') return
  const { notifications } = await LocalNotifications.getPending()
  if (notifications.length) await LocalNotifications.cancel({ notifications })
  const plan = planReminders(s)
  // ponytail: inexact alarms (allowWhileIdle) avoid the "Alarms & reminders" settings detour; they can slip a few minutes in Doze.
  if (plan.length) {
    await LocalNotifications.schedule({
      notifications: plan.map((r) => ({ id: r.id, title: r.title, body: r.body, schedule: { at: new Date(r.at), allowWhileIdle: true }, isExactNotification: false })),
    })
  }
}
