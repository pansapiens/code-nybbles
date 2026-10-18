import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/** Answer feedback: short synthesised tones (no audio files to precache) and vibration. */
export type Cue = 'correct' | 'wrong' | 'complete'

// [frequency Hz, start s, duration s]
const TONES: Record<Cue, [number, number, number][]> = {
  correct: [
    [880, 0, 0.09],
    [1318.5, 0.08, 0.16],
  ],
  wrong: [
    [233, 0, 0.12],
    [185, 0.11, 0.2],
  ],
  complete: [
    [523.3, 0, 0.12],
    [659.3, 0.1, 0.12],
    [784, 0.2, 0.12],
    [1046.5, 0.3, 0.3],
  ],
}
const VIBRATION: Record<Cue, number[]> = { correct: [15], wrong: [40, 60, 40], complete: [20, 40, 20, 40, 60] }

// navigator.vibrate is unreliable in the Android WebView; the plugin uses the system haptic effects.
function haptic(cue: Cue) {
  if (!Capacitor.isNativePlatform()) return navigator.vibrate?.(VIBRATION[cue])
  if (cue === 'correct') return Haptics.impact({ style: ImpactStyle.Light })
  return Haptics.notification({ type: cue === 'wrong' ? NotificationType.Error : NotificationType.Success })
}

let ctx: AudioContext | undefined

function play(cue: Cue) {
  ctx ??= new AudioContext()
  void ctx.resume() // autoplay policy: created on the first tap, so resuming is allowed
  const t0 = ctx.currentTime
  for (const [freq, start, dur] of TONES[cue]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = cue === 'wrong' ? 'triangle' : 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t0 + start)
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0 + start)
    osc.stop(t0 + start + dur + 0.02)
  }
}

export function feedback(cue: Cue, opts: { sound: boolean; haptics: boolean }) {
  try {
    if (opts.sound && typeof AudioContext !== 'undefined') play(cue)
    if (opts.haptics) void haptic(cue)
  } catch {
    // Feedback is decoration; never let it break the lesson.
  }
}
