'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/utils/api.js'

const FADE_S    = 1.1           // clip crossfade, video + audio
const SOUND_KEY = 'hype-sound'  // 'on' = music · anything else = muted
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
 * Fixed full-viewport reel = the app's background. Dashboard is visible from the
 * first paint; glass cards blur the video behind them, gaps show it sharp.
 * Two layers swap roles: front plays, back holds the next clip preloaded; near
 * the end of the front clip they crossfade. Clips render at native aspect over a
 * blurred poster — never cropped (subtitles / heads sit at the edges).
 */
export default function HypeHero() {
  const [clips, setClips]       = useState([])
  const [slots, setSlots]       = useState([0, 1])   // clip index per layer
  const [front, setFront]       = useState(0)
  const [unlocked, setUnlocked] = useState(false)    // a user gesture happened → audio allowed
  const [pref, setPref]         = useState(null)
  const [still, setStill]       = useState(false)    // reduced motion → blurred poster only
  const [started, setStarted]   = useState(false)    // front clip has played a frame → back may preload
  const vids   = [useRef(null), useRef(null)]
  const fading = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setStill(reduce)
    setPref(readPref())
    manifestP?.then(m => {
      const list = Array.isArray(m?.clips) ? m.clips.filter(c => c.video && c.poster) : []
      if (!list.length) return
      const r = firstPick(list)
      setClips(list)
      setSlots([r, (r + 1) % list.length])
    }).catch(() => {})
  }, [])

  // page-level flag for CSS: tinted glass over video
  useEffect(() => {
    if (!clips.length) return
    document.documentElement.dataset.hype = ''
    return () => { delete document.documentElement.dataset.hype }
  }, [clips.length])

  // first gesture unlocks audio (autoplay policy)
  useEffect(() => {
    if (!clips.length || unlocked) return
    const on = () => setUnlocked(true)
    window.addEventListener('pointerdown', on)
    window.addEventListener('keydown', on)
    return () => { window.removeEventListener('pointerdown', on); window.removeEventListener('keydown', on) }
  }, [clips.length, unlocked])

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

  const audible = unlocked && pref === 'on'

  // ease each layer's volume toward its target — covers clip crossfade and mute/unmute.
  // iOS ignores .volume (read-only), so there it just mutes/unmutes.
  useEffect(() => {
    if (!clips.length || still) return
    const level = 0.6
    let raf
    const tick = () => {
      vids.forEach((r, i) => {
        const v = r.current
        if (!v) return
        const target = audible && i === front ? level : 0
        v.volume = Math.min(1, Math.max(0, v.volume + (target - v.volume) * 0.05))
        v.muted = !audible || (target === 0 && v.volume < 0.01)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [clips.length, front, audible, still])

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
      <div className="hype" aria-hidden="true">
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
