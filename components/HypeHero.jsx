'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/utils/api.js'

const FADE_S    = 1.1           // clip crossfade, video + audio
const INTRO_MS  = 7000          // intro auto-recedes after this
const SOUND_KEY = 'hype-sound'  // 'on' = music in ambient too · 'off' = never · unset = intro only
const src = rel => `/api/hype/${rel}`

// start fetching at hydration, not after the dashboard's own data loads
const manifestP = typeof window !== 'undefined' ? api.getHypeManifest().catch(() => null) : null

// first clip: random among the light ones (≤ 720p) so playback starts fast; heavy clips come later in rotation
function firstPick(list) {
  const light = list.map((c, i) => [c, i]).filter(([c]) => (c.width || 0) * (c.height || 0) <= 1280 * 720)
  const pool  = light.length ? light : list.map((c, i) => [c, i])
  return pool[Math.floor(Math.random() * pool.length)][1]
}

const readPref = () => { try { return localStorage.getItem(SOUND_KEY) } catch { return null } }
const savePref = v  => { try { localStorage.setItem(SOUND_KEY, v) } catch {} }

/*
 * Fixed full-viewport reel behind the whole app.
 *  intro   — sharp clip, content hidden. Ends on scroll / wheel / key / "enter" / INTRO_MS.
 *  ambient — same <video> elements, CSS blur + darken; content fades in on top.
 * Two layers swap roles: front plays, back holds the next clip preloaded; near
 * the end of the front clip they crossfade. Clips render at native aspect over a
 * blurred poster — never cropped (subtitles / heads sit at the edges).
 */
export default function HypeHero() {
  const [clips, setClips]       = useState([])
  const [slots, setSlots]       = useState([0, 1])   // clip index per layer
  const [front, setFront]       = useState(0)
  const [phase, setPhase]       = useState('intro')
  const [unlocked, setUnlocked] = useState(false)    // a user gesture happened → audio allowed
  const [pref, setPref]         = useState(null)
  const [still, setStill]       = useState(false)    // reduced motion → blurred poster only
  const [started, setStarted]   = useState(false)    // front clip has played a frame → back may preload
  const vids   = [useRef(null), useRef(null)]
  const fading = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setStill(reduce)
    if (reduce) setPhase('ambient')
    setPref(readPref())
    manifestP?.then(m => {
      const list = Array.isArray(m?.clips) ? m.clips.filter(c => c.video && c.poster) : []
      if (!list.length) return
      const r = firstPick(list)
      setClips(list)
      setSlots([r, (r + 1) % list.length])
    }).catch(() => {})
  }, [])

  // page-level state for CSS: hides content during intro, strengthens glass over video
  useEffect(() => {
    const root = document.documentElement
    if (clips.length) root.dataset.hype = phase
    return () => { delete root.dataset.hype }
  }, [clips.length, phase])

  // first gesture unlocks audio (autoplay policy)
  useEffect(() => {
    if (!clips.length || unlocked) return
    const on = () => setUnlocked(true)
    window.addEventListener('pointerdown', on)
    window.addEventListener('keydown', on)
    return () => { window.removeEventListener('pointerdown', on); window.removeEventListener('keydown', on) }
  }, [clips.length, unlocked])

  // intro → ambient on scroll intent, any key, or timeout. A click alone only unmutes.
  useEffect(() => {
    if (!clips.length || phase !== 'intro') return
    const recede = () => setPhase('ambient')
    const t = setTimeout(recede, INTRO_MS)
    const evs = ['wheel', 'touchmove', 'scroll', 'keydown']
    evs.forEach(e => window.addEventListener(e, recede, { passive: true }))
    return () => { clearTimeout(t); evs.forEach(e => window.removeEventListener(e, recede)) }
  }, [clips.length, phase])

  // pause while the tab is hidden
  useEffect(() => {
    if (!clips.length || still) return
    const sync = () => {
      const v = vids[front].current
      if (!v) return
      if (document.hidden) v.pause()
      else if (v.paused) v.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [clips.length, front, still])

  const audible = unlocked && pref !== 'off' && (phase === 'intro' || pref === 'on')

  // ease each layer's volume toward its target — covers clip crossfade and intro→ambient ramp.
  // iOS ignores .volume (read-only), so there it just mutes/unmutes.
  useEffect(() => {
    if (!clips.length || still) return
    const level = phase === 'intro' ? 1 : 0.5
    let raf
    const tick = () => {
      vids.forEach((r, i) => {
        const v = r.current
        if (!v) return
        const target = audible && i === front ? level : 0
        v.volume = Math.min(1, Math.max(0, v.volume + (target - v.volume) * 0.05))
        v.muted = !unlocked || pref === 'off' || (target === 0 && v.volume < 0.01)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [clips.length, front, audible, unlocked, pref, phase, still])

  const onTime = i => e => {
    const v = e.currentTarget
    if (i !== front || fading.current || clips.length < 2) return
    if (v.duration && v.currentTime >= v.duration - FADE_S) {
      fading.current = true
      const back = vids[1 - i].current
      back.currentTime = 0
      back.volume = 0
      back.play().catch(() => {})
      setFront(1 - i)
      // once the old layer is invisible, load the clip after next into it
      setTimeout(() => {
        setSlots(s => { const n = [...s]; n[i] = (s[1 - i] + 1) % clips.length; return n })
        fading.current = false
      }, FADE_S * 1000 + 100)
    }
  }

  const toggleSound = () => {
    const next = audible ? 'off' : 'on'
    setUnlocked(true)
    setPref(next)
    savePref(next)
  }

  if (!clips.length) return null

  return (
    <>
      <div className={`hype ${phase}`} aria-hidden="true">
        {[0, 1].map(i => {
          const c = clips[slots[i]]
          if (!c || (still && i !== front)) return null
          return (
            <div key={i} className={`hype-layer${i === front ? ' on' : ''}`}>
              <img className="hype-fill" src={src(c.fill || c.poster)} alt="" />   {/* fill: mid-clip still; poster = first frame (may be black) */}
              {still ? (
                <img className="hype-clip" src={src(c.poster)} alt="" style={{ aspectRatio: `${c.width} / ${c.height}`, '--native-h': `${c.height}px` }} />
              ) : (
                <video
                  ref={vids[i]}
                  className="hype-clip"
                  src={src(c.video)}
                  poster={src(c.poster)}
                  style={{ aspectRatio: `${c.width} / ${c.height}`, '--native-h': `${c.height}px` }}
                  muted
                  playsInline
                  // only the next clip preloads, and only once the first one plays (no bandwidth race)
                  preload={i === front || started ? 'auto' : 'none'}
                  autoPlay={i === front}
                  onCanPlay={e => { if (i === front) e.currentTarget.play().catch(() => {}) }}
                  onPlaying={() => setStarted(true)}
                  loop={clips.length === 1}
                  onTimeUpdate={onTime(i)}
                />
              )}
            </div>
          )
        })}
      </div>

      {phase === 'intro' && (
        <div className="hype-intro-ui">
          <div className="hype-caption">{clips[slots[front]]?.title}</div>
          <button className="hype-enter" onClick={() => setPhase('ambient')} aria-label="Enter dashboard">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
          </button>
        </div>
      )}

      {!still && (
        <button className="hype-sound" onClick={toggleSound} aria-label={audible ? 'Mute music' : 'Play music'} aria-pressed={audible}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" />
            {audible
              ? <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.8a6 6 0 0 1 0 8.4" />
              : <path d="M10.5 6l3 4M13.5 6l-3 4" />}
          </svg>
        </button>
      )}
    </>
  )
}
