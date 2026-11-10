import { Maximize, Minimize, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ActionLink, Container, SectionHeading, SectionShell } from '../primitives'
import type { VideoPlayerSection } from '../types'
import { formatTime, httpsOnly } from './video-player-utils'
import './video-player.css'

const SPEEDS = [0.5, 1, 1.5, 2] as const

const formats = new Set(['wide', 'classic', 'square', 'story'])

/**
 * Player de vídeo de vendas (VSL): capa com botão grande de play e, durante o vídeo,
 * controles em vidro fosco que aparecem ao passar o mouse, ao focar pelo teclado,
 * ao tocar na tela ou com o vídeo pausado. Sem dependências extras (efeitos em CSS).
 */
export default function VideoPlayer({ section }: { section: VideoPlayerSection }) {
  const titleId = `${section.id}-title`
  const src = httpsOnly(section.videoUrl) || httpsOnly(section.externalUrl)
  const poster = httpsOnly(section.posterUrl)
  const format = formats.has(section.format) ? section.format : 'wide'
  const label = section.videoLabel?.trim() || section.title
  const captions = httpsOnly(section.captionsUrl)

  const frameRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [hover, setHover] = useState(false)
  const [touched, setTouched] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [fullscreen, setFullscreen] = useState(false)

  // Toque na tela mostra os controles por alguns segundos (não há "passar o mouse" no celular).
  useEffect(() => {
    if (!touched) return
    const timer = window.setTimeout(() => setTouched(false), 3000)
    return () => window.clearTimeout(timer)
  }, [touched])

  // Tela cheia acompanha o documento onde o player está (site ou iframe da prévia).
  useEffect(() => {
    const doc = frameRef.current?.ownerDocument
    if (!doc) return
    const onChange = () => setFullscreen(doc.fullscreenElement === frameRef.current)
    doc.addEventListener('fullscreenchange', onChange)
    return () => doc.removeEventListener('fullscreenchange', onChange)
  }, [])

  const play = () => {
    const video = videoRef.current
    if (!video) return
    setStarted(true)
    void video.play().catch(() => setPlaying(false))
  }
  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) play()
    else video.pause()
  }
  const seek = (percent: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
    video.currentTime = (percent / 100) * video.duration
    setCurrent(video.currentTime)
  }
  const changeVolume = (percent: number) => {
    const video = videoRef.current
    if (!video) return
    const next = percent / 100
    video.volume = next
    video.muted = next === 0
    setVolume(next)
    setMuted(next === 0)
  }
  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !muted
    video.muted = nextMuted
    // Desmutar com volume zerado volta ao volume máximo (senão o botão "não faria nada").
    if (!nextMuted && volume === 0) {
      video.volume = 1
      setVolume(1)
    }
    setMuted(nextMuted)
  }
  const changeSpeed = (value: number) => {
    if (videoRef.current) videoRef.current.playbackRate = value
    setSpeed(value)
  }
  const toggleFullscreen = () => {
    const frame = frameRef.current
    const doc = frame?.ownerDocument
    if (!frame || !doc) return
    if (doc.fullscreenElement) void doc.exitFullscreen()
    else if (frame.requestFullscreen) void frame.requestFullscreen().catch(() => undefined)
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0
  const shownVolume = muted ? 0 : volume
  const controlsVisible = started && (hover || touched || !playing)
  const VolumeIcon = shownVolume === 0 ? VolumeX : shownVolume > 0.5 ? Volume2 : Volume1

  return (
    <SectionShell tone={section.tone} background={section.background} text={section.text} anchor={section.anchor} labelledBy={titleId}>
      <Container>
        <SectionHeading id={titleId} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />

        <div
          ref={frameRef}
          data-reveal
          data-format={format}
          data-controls={controlsVisible ? 'on' : 'off'}
          className="vp-frame mt-12"
          onPointerEnter={(event) => event.pointerType === 'mouse' && setHover(true)}
          onPointerLeave={(event) => event.pointerType === 'mouse' && setHover(false)}
          onPointerDown={(event) => event.pointerType !== 'mouse' && setTouched(true)}
        >
          {src ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- o <track> é condicional: só existe quando o painel recebe o .vtt (campo "Legendas"). */}
              <video
                ref={videoRef}
                className="vp-video"
                src={src}
                poster={poster || undefined}
                preload="metadata"
                playsInline
                aria-label={label}
                onClick={toggle}
                onPlay={() => {
                  setStarted(true)
                  setPlaying(true)
                }}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                onDurationChange={(event) => setDuration(event.currentTarget.duration)}
                onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
              >
                {/* Legendas (WebVTT) quando enviadas; o navegador oferece ligar/desligar. */}
                {captions ? <track kind="captions" src={captions} srcLang="pt-BR" label="Português" default /> : null}
              </video>

              {!started ? (
                <button type="button" className="vp-big-play" onClick={play} aria-label={`Assistir: ${label}`}>
                  <span className="vp-big-play-ring" aria-hidden="true" />
                  <Play aria-hidden="true" className="size-9 translate-x-0.5" fill="currentColor" />
                </button>
              ) : null}

              {started ? (
                <div className="vp-controls" role="group" aria-label="Controles do vídeo">
                  <div className="flex items-center gap-3">
                    <span className="vp-time">{formatTime(current)}</span>
                    <input
                      type="range"
                      className="vp-range flex-1"
                      min={0}
                      max={100}
                      step={0.1}
                      value={progress}
                      aria-label="Posição do vídeo"
                      aria-valuetext={`${formatTime(current)} de ${formatTime(duration)}`}
                      style={{ '--vp-fill': `${progress}%` } as CSSProperties}
                      onChange={(event) => seek(Number(event.target.value))}
                    />
                    <span className="vp-time">{formatTime(duration)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 sm:gap-3">
                      <button type="button" className="vp-btn" onClick={toggle} aria-label={playing ? 'Pausar' : 'Reproduzir'}>
                        {playing ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5" />}
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" className="vp-btn" onClick={toggleMute} aria-label={shownVolume === 0 ? 'Ativar som' : 'Silenciar'}>
                          <VolumeIcon aria-hidden="true" className="size-5" />
                        </button>
                        <input
                          type="range"
                          className="vp-range vp-volume"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(shownVolume * 100)}
                          aria-label="Volume"
                          aria-valuetext={`${Math.round(shownVolume * 100)}%`}
                          style={{ '--vp-fill': `${shownVolume * 100}%` } as CSSProperties}
                          onChange={(event) => changeVolume(Number(event.target.value))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <div role="group" aria-label="Velocidade" className="flex items-center gap-0.5">
                        {SPEEDS.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="vp-btn vp-speed"
                            aria-pressed={speed === value}
                            aria-label={`Velocidade ${String(value).replace('.', ',')}x`}
                            onClick={() => changeSpeed(value)}
                          >
                            {String(value).replace('.', ',')}x
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="vp-btn"
                        onClick={toggleFullscreen}
                        aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                      >
                        {fullscreen ? <Minimize aria-hidden="true" className="size-5" /> : <Maximize aria-hidden="true" className="size-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            // Sem vídeo ainda: capa (ou fundo escuro) com aviso, sem player quebrado.
            <div className="vp-empty" style={poster ? { backgroundImage: `url("${poster}")` } : undefined}>
              <span className="vp-big-play vp-big-play--idle" aria-hidden="true">
                <Play className="size-9 translate-x-0.5" fill="currentColor" />
              </span>
              <p className="vp-empty-text">Vídeo em breve</p>
            </div>
          )}
        </div>

        {section.cta ? (
          <div data-reveal className="mt-10 flex justify-center">
            <ActionLink link={section.cta} arrow />
          </div>
        ) : null}
      </Container>
    </SectionShell>
  )
}
