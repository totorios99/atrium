'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/utils/api.js'

const FADE_S   = 1.1           // crossfade length, video + audio
const SOUND_KEY = 'hype-sound' // 'on' | 'off' — per-viewer preference
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
 * Two layers (A/B) swap roles: the front one plays, the back one holds the
 * next clip preloaded. Near the end of the front clip the back one starts and
 * the layers crossfade. Each layer = blurred poster filling the band (ambient)
 * + the clip at native aspect, edges feathered by a mask — never cropped,
 * because burned-in subtitles and heads sit at the edges of some clips.
 */
export default function HypeHero() {
  const [clips, setClips]   = useState([])
  const [slots, setSlots]   = useState([0, 1])      // clip index per layer
  const [front, setFront]   = useState(0)
  const [sound, setSound]   = useState(false)       // audible right now
  const [still, setStill]   = useState(false)       // reduced motion → poster only
  const [started, setStarted] = useState(false)     // front clip has played a frame → back may preload
  const hero   = useRef(null)
  const vids   = [useRef(null), useRef(null)]
  const fading = useRef(false)
  const vis    = useRef(1)                          // 1 at top → 0 scrolled past

  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    manifestP?.then(m => {
      const list = Array.isArray(m?.clips) ? m.clips.filter(c => c.video && c.poster) : []
      if (!list.length) return
      const r = firstPick(list)
      setClips(list)
      setSlots([r, (r + 1) % list.length])
    }).catch(() => {})
  }, [])

  // sound: muted until a gesture (autoplay policy); 'off' preference wins
  useEffect(() => {
    if (!clips.length || readPref() === 'off') return
    const on = e => { if (!e.target.closest?.('.hype-sound')) setSound(true) }   // the toggle handles its own click
    window.addEventListener('pointerdown', on, { once: true })
    window.addEventListener('keydown', on, { once: true })
    return () => { window.removeEventListener('pointerdown', on); window.removeEventListener('keydown', on) }
  }, [clips.length])

  // scroll → opacity/scale via CSS var; pause when out of view or tab hidden
  useEffect(() => {
    if (!clips.length) return
    const el = hero.current
    const sync = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / (el.offsetHeight || 1)))
      vis.current = 1 - p
      el.style.setProperty('--hype-p', p.toFixed(3))
      const v = vids[front].current
      if (!v || still) return
      if (p >= 1 || document.hidden) v.pause()
      else if (v.paused) v.play().catch(() => {})
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    document.addEventListener('visibilitychange', sync)
    return () => { window.removeEventListener('scroll', sync); document.removeEventListener('visibilitychange', sync) }
  }, [clips.length, front, still])

  // volume: ease each layer toward (front ? 1 : 0) × scroll visibility.
  // Covers the audio crossfade and the scroll fade in one loop. iOS ignores .volume (read-only there).
  useEffect(() => {
    if (!clips.length || still) return
    let raf
    const tick = () => {
      vids.forEach((r, i) => {
        const v = r.current
        if (!v) return
        v.muted = !sound
        const target = (i === front ? 1 : 0) * vis.current
        v.volume = Math.min(1, Math.max(0, v.volume + (target - v.volume) * 0.06))
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [clips.length, front, sound, still])

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

  const toggleSound = e => {
    e.stopPropagation()
    const next = !sound
    setSound(next)
    savePref(next ? 'on' : 'off')
  }

  if (!clips.length) return null

  return (
    <section ref={hero} className="hype" aria-label="Motivation reel">
      {[0, 1].map(i => {
        const c = clips[slots[i]]
        if (!c) return null
        return (
          <div key={i} className={`hype-layer${i === front ? ' on' : ''}`} aria-hidden={i !== front}>
            <img className="hype-ambient" src={src(c.fill || c.poster)} alt="" />   {/* fill: optional mid-clip still; poster = first frame (may be black) */}
            {still ? (
              <img className="hype-clip" src={src(c.poster)} alt="" style={{ aspectRatio: `${c.width} / ${c.height}` }} />
            ) : (
              <video
                ref={vids[i]}
                className="hype-clip"
                src={src(c.video)}
                poster={src(c.poster)}
                style={{ aspectRatio: `${c.width} / ${c.height}` }}
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
      <div className="hype-caption">{clips[slots[front]]?.title}</div>
      {!still && (
        <button className="hype-sound" onClick={toggleSound} aria-label={sound ? 'Mute' : 'Unmute'} aria-pressed={sound}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" />
            {sound
              ? <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.8a6 6 0 0 1 0 8.4" />
              : <path d="M10.5 6l3 4M13.5 6l-3 4" />}
          </svg>
        </button>
      )}
    </section>
  )
}
