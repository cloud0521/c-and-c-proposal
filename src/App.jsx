import { useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import logoLogo from './logo.png'
import ringsMp4Url from './rings.mp4'

const entourage = [
  ['Maid of Honor', ['Mary Grace Mendania']], ['Best Man', ['Noel Rashed Peñacuba']],
  ['Bridesmaid', ['Jolina Mana-ay', 'Emerly Keith Belonta', 'Riza Mae Morales', 'Nenen More', 'Nofe Glydell Peñacuba']],
  ['Groomsman', ['Ronel Naynay', 'John Gerald Sa-onoy (yob2)', 'Kurt Adrian Mendania', 'Cyberhelle Ricaplaza', 'Ralfh Laurence Deles']],
  ['Principal Sponsor', ['Mr. & Mrs. Joselito Martinez', 'Mr. & Mrs. Jun Garde', 'Mr. & Mrs. Randy Santisteban', 'Mr. & Mrs. Lea Casio', 'Mr. & Mrs. Renato Mendania', 'Mr. & Mrs. Jessy Bejo', 'Mr. & Mrs. Jess Alba', 'Mr. Edwin Erlano', 'Mr. & Mrs. Roy Palmares', 'Mr. & Mrs. Adelly Diotay', 'Mr. & Mrs. Lemuel Tuvida', 'Mr. & Mrs. Vincent Geniebla', 'Mr. & Mrs. Allan De Jose', 'Mr. & Mrs. Suzette De Jose', 'Mrs. Faith Feria', 'Mr. & Mrs. Ritzan Baygar', 'Mr. & Mrs. Rogelio Salsalida', 'Mr. & Mrs. Magbanua', 'Mamcy', 'Eufemia Quilino', 'Emily Presquito', 'Belly Pateño', 'Bebing De Jose']],
  ['Candle Sponsor', ['Ziza & Redan Ortega']], ['Cord Sponsor', ['Charmie & Carl John Argando']], ['Veil Sponsor', ['Mr. & Mrs. Roberto Argando']],
  ['Flower Girl', ['Maria Zhavia Mendania', 'Jewel Jade Mendania', 'Gianna Cuizon', 'Yuna Argando', 'Feliz Perez', 'Zhydyn Diotay', 'Elly Brynn D. Marco']],
  ['Ring Bearer', ['Zidan Ziandre Ortega']], ['Bible Bearer', ['Zeke Dollosa']], ['Coin Bearer', ['Chaiff Antionne Perez']], ['Banner Bearer', ['Redan Ortega Jr.']],
]
const guests = entourage.flatMap(([role, names]) => names.map(name => ({ name, role })))

const sparkles = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 3.5 + 1.5,
  duration: Math.random() * 5 + 4,
  delay: Math.random() * 5,
}))

const floatingSparkles = Array.from({ length: 6 }).map((_, i) => ({
  id: i,
  size: Math.random() * 3 + 2,
}))

function GreenScreenVideo({ src }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let animationFrameId

    video.currentTime = 0
    video.play().catch(() => {})

    const render = () => {
      if (video.paused || video.ended) return
      if (video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = frame.data
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          if (g > 90 && r < 90 && b < 90) {
            data[i + 3] = 0
          }
        }
        ctx.putImageData(frame, 0, 0)
      }
      animationFrameId = requestAnimationFrame(render)
    }

    const handlePlay = () => render()
    video.addEventListener('play', handlePlay)
    if (!video.paused) render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      video.removeEventListener('play', handlePlay)
    }
  }, [])

  return (
    <div className="rings-container-wrapper">
      <video 
        ref={videoRef} 
        src={src} 
        loop 
        muted 
        playsInline 
        crossOrigin="anonymous"
        style={{ display: 'none' }} 
      />
      <canvas ref={canvasRef} className="rings-animation-img" />
      <div className="ring-glint glint-1"></div>
      <div className="ring-glint glint-2"></div>
      <div className="ring-glint glint-3"></div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [guest, setGuest] = useState(null)
  const [open, setOpen] = useState(false)
  const [rsvpStatus, setRsvpStatus] = useState('idle')
  const [declineError, setDeclineError] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', note: '' })
  const [hasResponded, setHasResponded] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [introStyle, setIntroStyle] = useState(null)
  const [zoomedLogoStyle, setZoomedLogoStyle] = useState(null)
  const [isClosingLogo, setIsClosingLogo] = useState(false)
  
  const guestRef = useRef(null)
  const navigationLock = useRef(false)
  const navigationTimer = useRef(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const coverLogoRef = useRef(null)
  const floatingLogoRef = useRef(null)

  const matches = useMemo(() => query.trim() ? guests.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [], [query])
  
  const updateIntroRect = () => {
    if (coverLogoRef.current) {
      const rect = coverLogoRef.current.getBoundingClientRect()
      if (rect.width > 0) {
        const windowCenterX = window.innerWidth / 2
        const windowCenterY = window.innerHeight / 2
        const logoCenterX = rect.left + rect.width / 2
        const logoCenterY = rect.top + rect.height / 2

        const deltaX = windowCenterX - logoCenterX
        const deltaY = windowCenterY - logoCenterY

        setIntroStyle({
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          '--delta-x': `${deltaX}px`,
          '--delta-y': `${deltaY}px`,
        })
      }
    }
  }

  useEffect(() => {
    updateIntroRect()
    window.addEventListener('resize', updateIntroRect)
    return () => window.removeEventListener('resize', updateIntroRect)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => { 
    if (toast) { 
      const timer = setTimeout(() => setToast(''), 4000); 
      return () => clearTimeout(timer) 
    } 
  }, [toast])

  // Cinematic Scroll-Driven Floating Logo Effect
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId = null

    const updateFloatingLogo = () => {
      rafId = null
      const logoEl = floatingLogoRef.current
      if (!logoEl) return

      if (showIntro) {
        logoEl.style.opacity = '0'
        return
      }

      const scrollTop = container.scrollTop
      const windowHeight = container.clientHeight
      const pages = container.querySelectorAll('.page')
      if (pages.length === 0) return

      const pageHeight = pages[0].clientHeight || windowHeight
      const exactPage = scrollTop / pageHeight
      const pageIndex = Math.min(Math.floor(exactPage), pages.length - 2 >= 0 ? pages.length - 1 : 0)
      const nextPageIndex = Math.min(pageIndex + 1, pages.length - 1)
      const progress = exactPage - pageIndex

      const currPageEl = pages[pageIndex]
      const nextCurrPageEl = pages[nextPageIndex]

      const currLogo = currPageEl?.querySelector('.couple-logo')
      const nextLogo = nextCurrPageEl?.querySelector('.couple-logo')

      if (!currLogo) return

      const rectA = currLogo.getBoundingClientRect()
      const rectB = nextLogo ? nextLogo.getBoundingClientRect() : rectA

      const x = rectA.left + (rectB.left - rectA.left) * progress
      const y = rectA.top + (rectB.top - rectA.top) * progress

      const lift = Math.sin(progress * Math.PI) // 0 -> 1 -> 0
      const scale = 1.0 + 1.3 * lift // 1.0 -> 2.3

      const rotateZ = Math.sin(progress * Math.PI * 2) * 2 * lift
      const rotateY = Math.cos(progress * Math.PI) * 5 * lift
      const rotateX = Math.sin(progress * Math.PI) * 4 * lift

      const oscillation = Math.sin(scrollTop * 0.05) * 6 * lift

      const shadowBlur = 30 + 30 * lift
      const shadowOpacity = 0.25 + 0.15 * lift
      const glowOpacity = 0.5 * lift

      let landingOffset = 0
      if (progress > 0.85) {
        const pLand = (progress - 0.85) / 0.15
        landingOffset = Math.sin(pLand * Math.PI * 1.5) * 4 * (1 - pLand)
      } else if (progress < 0.15 && pageIndex > 0) {
        const pLift = progress / 0.15
        landingOffset = Math.sin(pLift * Math.PI * 1.5) * 4 * (1 - pLift)
      }

      const finalY = y + oscillation + landingOffset

      logoEl.style.opacity = '1'
      logoEl.style.transform = `translate3d(${x}px, ${finalY}px, 0) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translateZ(0)`
      logoEl.style.filter = `drop-shadow(0 ${shadowBlur}px ${shadowBlur * 2}px rgba(0,0,0,${shadowOpacity})) drop-shadow(0 0 ${18 * glowOpacity}px rgba(255,220,150,${glowOpacity}))`

      // Subtle backdrop blur on page content behind logo while lifted
      pages.forEach((pEl, idx) => {
        const inner = pEl.querySelector('.page-inner')
        if (inner) {
          if (idx === pageIndex || idx === nextPageIndex) {
            const pageLift = idx === pageIndex ? (1 - progress) * lift : progress * lift
            inner.style.backdropFilter = `blur(${pageLift * 3}px)`
            inner.style.webkitBackdropFilter = `blur(${pageLift * 3}px)`
          } else {
            inner.style.backdropFilter = 'none'
            inner.style.webkitBackdropFilter = 'none'
          }
        }
      })

      // Sparkles positioning & opacity
      const sparkleEls = container.querySelectorAll('.floating-sparkle')
      sparkleEls.forEach((sp, idx) => {
        const angle = (idx / sparkleEls.length) * Math.PI * 2 + scrollTop * 0.01
        const dist = 55 + Math.sin(scrollTop * 0.02 + idx) * 15
        const spX = x + 55 + Math.cos(angle) * dist
        const spY = y + 50 + Math.sin(angle) * dist
        sp.style.transform = `translate3d(${spX}px, ${spY}px, 0) translateZ(0)`
        sp.style.opacity = lift > 0.1 ? (0.4 + Math.sin(scrollTop * 0.1 + idx) * 0.4) * lift : '0'
      })
    }

    const handleScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(updateFloatingLogo)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    updateFloatingLogo()

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [guest, showIntro])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const sections = container.querySelectorAll('.page')
    const observer = new IntersectionObserver((entries) => {
      if (navigationLock.current) return
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.dataset.index)
          setPage(index)
        }
      })
    }, { root: container, threshold: 0.55 })

    sections.forEach((sec) => observer.observe(sec))
    
    return () => {
      observer.disconnect()
    }
  }, [guest])

  const goTo = (target) => {
    navigationLock.current = true
    window.clearTimeout(navigationTimer.current)
    setPage(target)
    
    const container = containerRef.current
    if (container) {
      const targetPage = container.querySelector(`#page-${target}`)
      if (targetPage) {
        container.scrollTo({
          top: targetPage.offsetTop,
          behavior: 'smooth'
        })
      }
    }
    
    navigationTimer.current = window.setTimeout(() => { navigationLock.current = false }, 850)
  }

  const choose = (person) => { 
    setKeyboardOpen(false)
    inputRef.current?.blur()
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    guestRef.current = person
    setGuest(person)
    setForm({ name: person.name, note: '' })
    setQuery('')
    
    const cacheKey = `c&c-${person.name.trim().toLowerCase()}`
    const saved = localStorage.getItem(cacheKey) || localStorage.getItem(`cloyd-cyrin-rsvp-${person.name}`)
    setHasResponded(!!saved)
    
    setTimeout(() => {
      goTo(1)
    }, 300)
  }

  const decline = () => setDeclineError(true)
  
  const accept = async (event) => { 
    event.preventDefault(); 
    setRsvpStatus('submitting');
    
    const verifiedName = guest?.name || form.name;
    const data = { name: verifiedName, role: guest?.role || '', note: form.note, response: 'Joyfully accepts', submittedAt: new Date().toISOString() }; 
    const endpoint = import.meta.env.VITE_RSVP_ENDPOINT; 
    
    const minAnimationDelay = new Promise(resolve => setTimeout(resolve, 2500));

    try { 
      const requestPromise = (async () => {
        if (endpoint) {
          await fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
        } 
        const cacheKey = `c&c-${verifiedName.trim().toLowerCase()}`;
        localStorage.setItem(cacheKey, JSON.stringify(data)); 
      })();

      await Promise.all([requestPromise, minAnimationDelay]);

      setRsvpStatus('success'); 
      setHasResponded(true);
      setTimeout(() => {
        setOpen(false);
        setRsvpStatus('idle');
      }, 2400);
    } catch { 
      setRsvpStatus('idle');
      setToast('Your response could not be sent. Please try again.'); 
    } 
  }

  const handleCloseModal = () => {
    if (rsvpStatus === 'submitting') return;
    setOpen(false);
    setRsvpStatus('idle');
  }

  const handleFloatingLogoClick = () => {
    if (zoomedLogoStyle || !floatingLogoRef.current) return
    const rect = floatingLogoRef.current.getBoundingClientRect()
    if (rect.width > 0) {
      const windowCenterX = window.innerWidth / 2
      const windowCenterY = window.innerHeight / 2
      const logoCenterX = rect.left + rect.width / 2
      const logoCenterY = rect.top + rect.height / 2

      const deltaX = windowCenterX - logoCenterX
      const deltaY = windowCenterY - logoCenterY

      setZoomedLogoStyle({
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        '--delta-x': `${deltaX}px`,
        '--delta-y': `${deltaY}px`,
      })
      setIsClosingLogo(false)

      setTimeout(() => {
        setIsClosingLogo(true)
        setTimeout(() => {
          setZoomedLogoStyle(null)
          setIsClosingLogo(false)
        }, 400)
      }, 2000)
    }
  }

  return <main className={`invitation-app ${keyboardOpen ? 'keyboard-open' : ''}`} ref={containerRef}>
    {showIntro && introStyle && (
      <div className="logo-intro-overlay">
        <img 
          src={logoLogo} 
          alt="C & C Logo" 
          className="intro-splash-logo" 
          style={introStyle}
        />
      </div>
    )}

    {zoomedLogoStyle && (
      <div className={`logo-zoom-overlay ${isClosingLogo ? 'closing' : ''}`} onClick={() => {
        setIsClosingLogo(true)
        setTimeout(() => {
          setZoomedLogoStyle(null)
          setIsClosingLogo(false)
        }, 400)
      }}>
        <img 
          src={logoLogo} 
          alt="C & C Logo" 
          className="zoomed-splash-logo" 
          style={zoomedLogoStyle}
        />
      </div>
    )}

    {/* Single Cinematic Floating Logo & Sparkles */}
    <div style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 30 }}>
      <img
        ref={floatingLogoRef}
        src={logoLogo}
        alt="C & C Logo"
        className="floating-couple-logo"
        onClick={handleFloatingLogoClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '110px',
          height: 'auto',
          objectFit: 'contain',
          cursor: 'pointer',
          willChange: 'transform, filter',
          transform: 'translate3d(0,0,0)',
          pointerEvents: 'auto',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
          outline: 'none',
        }}
      />
      {floatingSparkles.map(s => (
        <div
          key={s.id}
          className="floating-sparkle"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: '#ffd796',
            borderRadius: '50%',
            boxShadow: '0 0 8px 2px rgba(255,215,150,0.8)',
            transform: 'translate3d(0,0,0)',
            opacity: 0,
            pointerEvents: 'none',
            willChange: 'transform, opacity',
            transition: 'opacity 0.3s ease',
          }}
        />
      ))}
    </div>

    <video src={ringsMp4Url} preload="auto" muted playsInline style={{ display: 'none' }} />

    <div className="glitters-container">
      {sparkles.map(s => (
        <div
          key={s.id}
          className="glitter"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>

    <style>{`.invitation-app{height:100vh;height:100dvh;overflow-y:auto;scroll-snap-type:y mandatory;background:#360817;color:#fff;scroll-behavior:smooth;position:relative}.invitation-app.keyboard-open{scroll-snap-type:none}.glitters-container{position:fixed;inset:0;pointer-events:none;z-index:5;overflow:hidden}.glitter{position:absolute;background:#ffe8d6;border-radius:50%;box-shadow:0 0 10px 2px #f4c2afaa;animation:floatAndTwinkle infinite ease-in-out}@keyframes floatAndTwinkle{0%{transform:translateY(0px) scale(0.7);opacity:0.15}50%{transform:translateY(-30px) scale(1.3);opacity:0.85}100%{transform:translateY(-60px) scale(0.7);opacity:0.15}}.page{min-height:100vh;min-height:100dvh;width:100%;box-sizing:border-box;display:flex;position:relative;overflow-y:auto;overflow-x:hidden;isolation:isolate;scroll-snap-align:start;scroll-snap-stop:always}.cover-collapsible{max-height:420px;opacity:1;overflow:hidden;transition:max-height .45s cubic-bezier(.16,1,.3,1),opacity .3s ease,transform .45s cubic-bezier(.16,1,.3,1);transform:translate3d(0,0,0) scale(1);transform-origin:top center}.cover.keyboard-open .cover-collapsible{max-height:0;opacity:0;transform:translate3d(0,-18px,0) scale(.94);pointer-events:none}.cover .page-inner{transition:padding .45s cubic-bezier(.16,1,.3,1)}.cover.keyboard-open .page-inner{padding-top:24px;padding-bottom:280px}.couple-logo{width:110px;height:auto;display:block;margin:0 auto 12px;object-fit:contain;opacity:0;visibility:hidden;pointer-events:none}.page-inner{width:min(1060px,100%);margin:auto;padding:clamp(45px,7vh,95px) 40px clamp(60px,8vh,95px);text-align:center;box-sizing:border-box;position:relative;border:2px double #e1a68e88;transition:backdrop-filter 0.3s ease,-webkit-backdrop-filter 0.3s ease}.page-inner::before{content:'';position:absolute;inset:10px;border:1px solid #e1a68e44;pointer-events:none}.page-inner::after{content:'❖ ❦ ❖';position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:#e1a68eaa;font-size:11px;letter-spacing:6px}.vintage-ornament{font-size:14px;color:#e1a68eaa;letter-spacing:8px;margin:6px 0}.vintage-divider{display:flex;align-items:center;justify-content:center;margin:14px auto;color:#e1a68eaa;font-size:12px;letter-spacing:8px;width:220px}.vintage-divider::before,.vintage-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,#e1a68e88,transparent)}.cover .page-inner{display:flex;flex-direction:column;justify-content:flex-start}.cover-title{font:500 clamp(42px,7.5vw,95px)/.85 'Playfair Display';letter-spacing:-.07em;margin:10px 0 16px}.cover-title i{display:block;font-size:.55em;color:#e1a68e;font-weight:400}.cover-subtitle{font:12px 'DM Mono';letter-spacing:.2em;text-transform:uppercase;color:#e7b29d;margin:clamp(8px,2vh,20px) 0}.lookup{width:min(470px,100%);position:relative;margin:clamp(0,2vh,20px) auto;transition:transform .45s cubic-bezier(.16,1,.3,1)}.cover.keyboard-open .lookup{transform:translate3d(0,-4px,0)}.lookup input{width:100%;height:50px;border:1px solid #e9af9780;background:#26040e66;padding:0 20px;color:#fff;outline:0;font:14px 'DM Sans'}.lookup input::placeholder{color:#ffffffa1}.results{position:absolute;top:55px;width:100%;z-index:10;background:#fff;color:#4a2330;box-shadow:0 14px 40px #19030bbb;max-height:210px;overflow-y:auto;-webkit-overflow-scrolling:touch}.results button{width:100%;background:#fff;border:0;border-bottom:1px solid #eadbd4;padding:12px 18px;text-align:left;display:flex;justify-content:space-between;align-items:center}.results button:hover{background:#f9edeb}.results span{font:600 17px 'Playfair Display';color:#58122a}.results small{font:9px 'DM Mono';letter-spacing:.1em;text-transform:uppercase;color:#ae7569}.page-kicker{font:10px 'DM Mono';letter-spacing:.28em;text-transform:uppercase;color:#e2a58d;margin:0 0 clamp(6px,1.5vh,14px)}.proposal-name{font:500 clamp(44px,7vw,92px)/1.15 'Playfair Display';color:#fff;margin:10px 0 16px;letter-spacing:-.05em}.proposal-role{font:500 clamp(32px,5vw,58px)/1.2 'Playfair Display';color:#e5a78e;margin:10px 0 clamp(12px,2vh,20px)}.message{max-width:550px;margin:clamp(10px,2vh,20px) auto;line-height:1.7;font-size:14px;color:#f2dfd8}.details-page{background:#f7e9e2;color:#58122a}.details-page .page-inner{border-color:#c78d8077}.details-page .page-inner::before{border-color:#c78d8044}.details-page .page-inner::after{color:#a56559aa}.details-page .vintage-ornament,.details-page .vintage-divider{color:#a56559aa}.details-page .vintage-divider::before,.details-page .vintage-divider::after{background:linear-gradient(90deg,transparent,#c78d80aa,transparent)}.details-page .page-kicker{color:#a56559}.details-title{font:500 clamp(40px,6.5vw,78px)/.9 'Playfair Display';margin:0}.mini-events{margin:clamp(15px,3vh,30px) auto 0;display:grid;grid-template-columns:1fr 1fr;max-width:800px}.mini-event{padding:clamp(16px,2.5vh,28px) 20px;background:#fff;border:1px solid #ead5cd;position:relative}.mini-event:first-child{border-right:1px solid #ead5cd}.mini-event h3{font:600 clamp(18px,2.5vw,24px)/1.1 'Playfair Display';margin:8px 0;color:#58122a}.mini-event p{font-size:13px;line-height:1.6;color:#775a62}.mini-event a{display:inline-block;margin-top:10px;color:#58122a;font-size:10px;letter-spacing:.13em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #c6907b;padding-bottom:3px}.response-page h2{font:500 clamp(40px,6.5vw,78px)/.95 'Playfair Display';margin:0}.response-actions{display:flex;justify-content:center;gap:12px;margin-top:clamp(16px,3vh,28px)}.response-actions button,.modal-actions button{width:180px;min-height:46px;border:1px solid #dba087;background:#dba087;color:#3b0918;padding:12px;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:600;cursor:pointer}.response-actions .decline-button,.modal-actions .decline-button{background:#eee5e2;border-color:#bca5a5;color:#947c80;cursor:not-allowed;opacity:.78}.modal-backdrop,.error-backdrop{position:fixed;inset:0;z-index:20;background:#250510bd;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 16px;overflow-y:auto}.rsvp-modal,.error-dialog{width:min(450px,100%);margin:auto;max-height:85dvh;overflow-y:auto;background:#fff9f6;color:#58122a;padding:28px 24px;text-align:center;position:relative;box-shadow:0 18px 55px #1b030c80;border:2px double #c9aba2;box-sizing:border-box}.rsvp-modal h2,.error-dialog h2{font:600 32px/1 'Playfair Display';margin:6px 0 16px}.rsvp-modal label{text-align:left;display:block;font:10px 'DM Mono';letter-spacing:.12em;text-transform:uppercase;margin-top:12px}.rsvp-modal input,.rsvp-modal textarea{width:100%;border:0;border-bottom:1px solid #c9aba2;background:transparent;padding:8px 0;outline:0;font:14px 'DM Sans';color:#3f2830}.rsvp-modal textarea{min-height:56px;resize:vertical}.close{position:absolute;right:15px;top:8px;border:0;background:none;color:#58122a;font-size:27px;cursor:pointer}.modal-actions{display:flex;justify-content:center;gap:12px;margin-top:18px}.error-dialog{border-top:5px solid #a5213e}.error-icon{width:48px;height:48px;margin:auto;border-radius:50%;background:#a5213e;color:#fff;display:grid;place-items:center;font:600 30px 'DM Sans'}.error-dialog p{font-size:13px;line-height:1.7;color:#725962}.error-dialog button{width:100%;margin-top:16px;border:0;background:#58122a;color:#fff;padding:12px;text-transform:uppercase;letter-spacing:.13em;font-size:10px;cursor:pointer}.toast{position:fixed;z-index:25;bottom:80px;left:50%;transform:translateX(-50%);background:#fff;color:#58122a;padding:14px 22px;box-shadow:0 7px 28px #18030c55;font-size:13px}

.pagination-dots{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:15;background:#250510aa;padding:8px 14px;border-radius:20px;backdrop-filter:blur(4px);border:1px solid #e1a68e33;box-shadow:0 4px 20px rgba(0,0,0,0.3)}
.pagination-dots button.dot{width:8px;height:8px;border-radius:50%;background:#e1a68e55;border:none;padding:0;cursor:pointer;transition:all .3s ease}
.pagination-dots button.dot.active{background:#e1a68e;transform:scale(1.35);box-shadow:0 0 8px #e1a68eaa}

.logo-intro-overlay{position:fixed;inset:0;background:#360817;z-index:99999;pointer-events:none;animation:fadeOutOverlay 0.4s ease 2.6s forwards}
.intro-splash-logo{object-fit:contain;transform-origin:center center;animation:logoIntroSequence 3s cubic-bezier(0.16,1,.3,1) forwards;pointer-events:none}
@keyframes logoIntroSequence{0%{transform:translate(var(--delta-x, 0px), var(--delta-y, 0px)) scale(2.5) rotate(0deg);filter:drop-shadow(0 0 20px rgba(255,215,150,0.6))}50%{transform:translate(var(--delta-x, 0px), var(--delta-y, 0px)) scale(2.5) rotate(0deg);filter:drop-shadow(0 0 35px rgba(255,215,150,0.95))}100%{transform:translate(0px, 0px) scale(1) rotate(0deg);filter:drop-shadow(0 0 0px rgba(255,215,150,0))}}
@keyframes fadeOutOverlay{to{opacity:0;pointer-events:none}}

.logo-zoom-overlay{position:fixed;inset:0;background:#360817df;z-index:99999;backdrop-filter:blur(4px);animation:fadeInOverlay 0.3s ease forwards}
.logo-zoom-overlay.closing{animation:fadeOutOverlay 0.4s ease forwards}

.zoomed-splash-logo{object-fit:contain;transform-origin:center center;animation:logoGrowToCenterSequence 0.4s cubic-bezier(0.16,1,.3,1) forwards, logoGlowOnly 1.6s ease-in-out 0.4s infinite;pointer-events:none}
.logo-zoom-overlay.closing .zoomed-splash-logo{animation:logoShrinkBackSequence 0.4s cubic-bezier(0.16,1,.3,1) forwards}

@keyframes logoGrowToCenterSequence{0%{transform:translate(0px,0px) scale(1) rotate(0deg);filter:drop-shadow(0 0 0px rgba(255,215,150,0))}100%{transform:translate(var(--delta-x,0px),var(--delta-y,0px)) scale(2.5) rotate(0deg);filter:drop-shadow(0 0 20px rgba(255,215,150,0.6))}}
@keyframes logoGlowOnly{0%,100%{transform:translate(var(--delta-x,0px),var(--delta-y,0px)) scale(2.5) rotate(0deg);filter:drop-shadow(0 0 15px rgba(255,215,150,0.4)) brightness(1)}50%{transform:translate(var(--delta-x,0px),var(--delta-y,0px)) scale(2.5) rotate(0deg);filter:drop-shadow(0 0 30px rgba(255,215,150,0.95)) brightness(1.15)}}
@keyframes logoShrinkBackSequence{0%{transform:translate(var(--delta-x,0px),var(--delta-y,0px)) scale(2.5) rotate(0deg);filter:drop-shadow(0 0 20px rgba(255,215,150,0.6))}100%{transform:translate(0px,0px) scale(1) rotate(0deg);filter:drop-shadow(0 0 0px rgba(255,215,150,0))}}
@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}

.floating-couple-logo{will-change:transform,filter;backface-visibility:hidden;transform-style:preserve-3d}
.floating-sparkle{will-change:transform,opacity;pointer-events:none}`}</style>
    
    <style>{`.page.active .cover-subtitle,.page.active .page-kicker{animation:slideUp .7s .16s both}.page.active .cover-title,.page.active .proposal-name,.page.active .details-title{animation:dramaticReveal .9s .25s cubic-bezier(.16,1,.3,1) both;will-change:transform,opacity;backface-visibility:hidden}.page.active .message{animation:slideUp .75s .52s both}.page.active .lookup,.page.active .mini-events,.page.active .response-actions,.page.active .proposal-role{animation:slideUp .8s .68s both}.page.active .mini-event{animation:cardPop .7s both}.page.active .mini-event:nth-child(2){animation-delay:.14s}.page.active .response-actions button{animation:buttonIn .65s .82s both}.page.active .response-actions button:nth-child(2){animation-delay:.94s}.response-actions button,.modal-actions button,.error-dialog button,.results button{transition:transform .2s cubic-bezier(.2,1.5,.5,1),box-shadow .2s,background .2s;position:relative;overflow:hidden}.response-actions button:not(.decline-button):hover,.modal-actions button:not(.decline-button):hover,.error-dialog button:hover{transform:translateY(-5px) scale(1.04);box-shadow:0 12px 24px #13020a66}.response-actions button:not(.decline-button):active,.modal-actions button:not(.decline-button):active,.error-dialog button:active{transform:scale(.93);box-shadow:none}.response-actions button:not(.decline-button):before,.modal-actions button:not(.decline-button):before,.error-dialog button:before{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,#ffffff9c 47%,transparent 64%);transform:translateX(-130%);transition:transform .55s}.response-actions button:not(.decline-button):hover:before,.modal-actions button:not(.decline-button):hover:before,.error-dialog button:hover:before{transform:translateX(130%)}.decline-button:hover{animation:declineJitter .35s linear infinite;filter:saturate(1.25)}.results{animation:resultsDrop .35s cubic-bezier(.16,1,.3,1) both}.results button{animation:resultSlide .4s both}.results button:nth-child(2){animation-delay:.05s}.results button:nth-child(3){animation-delay:.1s}.results button:nth-child(4){animation-delay:.15s}.results button:nth-child(5){animation-delay:.2s}.results button:hover{transform:translateX(7px);box-shadow:-5px 0 #c6907b inset}.modal-backdrop{animation:backdropIn .25s both}.rsvp-modal{animation:modalBurst .62s cubic-bezier(.16,1.3,.3,1) both}.error-backdrop{animation:warningFlash .45s both}.error-dialog{animation:errorImpact .7s cubic-bezier(.18,1.55,.38,1) both}.error-icon{animation:warningPulse 1.1s .4s infinite}.toast{animation:toastFly .6s cubic-bezier(.16,1.2,.3,1) both}.status-view{min-height:280px;display:flex;flex-direction:column;justify-content:center;align-items:center;animation:statusFadeIn .45s cubic-bezier(.16,1,.3,1) both}.status-view h3{font:600 32px/1.1 'Playfair Display';color:#58122a;margin:10px 0}.wedding-loader{display:flex;justify-content:center;align-items:center;height:140px;margin:5px auto 15px}.rings-container-wrapper{position:relative;display:inline-block;filter:drop-shadow(0 0 12px rgba(255,215,150,0.35))}.rings-animation-img{width:220px;height:auto;object-fit:contain;animation:ringMetallicShine 3s infinite ease-in-out}.ring-glint{position:absolute;width:6px;height:6px;background:#ffffff;border-radius:50%;box-shadow:0 0 10px 3px #ffffff, 0 0 20px 8px #ffd284;pointer-events:none;opacity:0;mix-blend-mode:screen}.ring-glint.glint-1{top:20px;left:55px;animation:realisticGlint 2.2s infinite ease-in-out;animation-delay:0.2s}.ring-glint.glint-2{top:45px;right:45px;animation:realisticGlint 2.8s infinite ease-in-out;animation-delay:1.1s}.ring-glint.glint-3{bottom:25px;left:85px;animation:realisticGlint 2.5s infinite ease-in-out;animation-delay:0.6s}@keyframes ringMetallicShine{0%,100%{filter:brightness(1) contrast(1.05)}50%{filter:brightness(1.22) contrast(1.12) drop-shadow(0 0 18px rgba(255,223,165,0.7))}}@keyframes realisticGlint{0%,100%{transform:scale(0.1) rotate(0deg);opacity:0}50%{transform:scale(1.4) rotate(45deg);opacity:0.95}}@keyframes successPop{0%{transform:scale(0) rotate(-20deg);opacity:0}70%{transform:scale(1.15) rotate(5deg)}100%{transform:scale(1) rotate(0deg);opacity:1}}@keyframes statusFadeIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}@keyframes dramaticReveal{from{opacity:0;transform:translate3d(0,35px,0) scale(.96);filter:blur(4px)}to{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}@keyframes cardPop{from{opacity:0;transform:perspective(700px) rotateX(35deg) translateY(25px)}to{opacity:1;transform:none}}@keyframes buttonIn{from{opacity:0;transform:scale(.45) rotate(-10deg)}to{opacity:1;transform:none}}@keyframes declineJitter{25%{transform:translateX(-3px) rotate(-1deg)}75%{transform:translateX(3px) rotate(1deg)}}@keyframes pagerRise{from{opacity:0;transform:translate(-50%,25px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes dotPulse{50%{box-shadow:0 0 0 6px #e7ae9133}}@keyframes resultsDrop{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:none}}@keyframes resultSlide{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}@keyframes backdropIn{from{opacity:0}to{opacity:1}}@keyframes modalBurst{0%{opacity:0;transform:scale(.38) rotate(-5deg)}68%{transform:scale(1.05) rotate(1deg)}100%{opacity:1;transform:none}}@keyframes warningFlash{0%,100%{background:#250510bd}35%{background:#a5213ebd}}@keyframes errorImpact{0%{opacity:0;transform:scale(.15) rotate(-12deg)}50%{transform:scale(1.12) rotate(3deg)}72%{transform:scale(.96) rotate(-1deg)}100%{opacity:1;transform:none}}@keyframes warningPulse{50%{transform:scale(1.18);box-shadow:0 0 0 12px #a5213e2e}}@keyframes toastFly{from{opacity:0;transform:translate(-50%,45px) scale(.7)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}`}</style>

    <section id="page-0" data-index="0" className={`page cover ${page === 0 ? 'active' : ''} ${keyboardOpen ? 'keyboard-open' : ''}`}>
      <div className="page-inner">
        <img 
          ref={coverLogoRef}
          src={logoLogo} 
          alt="C & C Logo" 
          className="couple-logo" 
          onLoad={updateIntroRect}
        />
        <div className="cover-collapsible">
          <p className="cover-subtitle">Cloyd &amp; Cyrin</p>
          <p className="cover-subtitle" style={{marginTop: '-15px'}}>December 19, 2026</p>
          <h1 className="cover-title">A special place<i>for you</i></h1>
          <div className="vintage-divider">❧</div>
          <p className="message">Find your name to receive your personal wedding proposal.</p>
        </div>
        <div className="lookup">
          <input 
            ref={inputRef}
            autoComplete="off" 
            value={query} 
            onChange={e => {
              setQuery(e.target.value);
              if (toast) setToast('');
            }} 
            onFocus={() => {
              setKeyboardOpen(true);
              setToast('');
              setTimeout(() => {
                containerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
              }, 50);
            }}
            onBlur={() => {
              setTimeout(() => setKeyboardOpen(false), 250);
            }}
            placeholder="Search your name" 
            aria-label="Search your name" 
          />
          {matches.length > 0 && (
            <div className="results">
              {matches.map(person => (
                <button 
                  key={person.name} 
                  onPointerDown={(e) => { e.preventDefault(); choose(person); }}
                >
                  <span>{person.name}</span>
                  <small>{person.role} →</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>

    {guest && (
      <>
        <section id="page-1" data-index="1" className={`page proposal-page ${page === 1 ? 'active' : ''}`}>
          <div className="page-inner">
            <img 
              src={logoLogo} 
              alt="C & C Logo" 
              className="couple-logo" 
            />
            <p className="page-kicker">A personal proposal for</p>
            <h2 className="proposal-name">{guest?.name || 'Someone special'}</h2>
            <div className="vintage-ornament">❦ ❧ ❦</div>
            <p className="page-kicker">Will you stand beside us as our</p>
            <h3 className="proposal-role">{guest?.role || 'Wedding Entourage'}?</h3>
            <div className="vintage-divider">◆</div>
            <p className="message">As we begin our forever, it would mean the world to have you share this beautiful day. Your love and support are a gift we will always treasure.</p>
            <div className="response-actions">
              {hasResponded ? (
                <div className="already-responded-badge" style={{color: '#e5a78e', font: '12px "DM Mono"', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '12px', textAlign: 'center'}}>
                  ✓ You have already responded (Joyfully Accepted)
                </div>
              ) : (
                <>
                  <button onClick={() => setOpen(true)}>Joyfully accept</button>
                  <button className="decline-button" onClick={decline}>Decline</button>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="page-2" data-index="2" className={`page details-page ${page === 2 ? 'active' : ''}`}>
          <div className="page-inner">
            <img 
              src={logoLogo} 
              alt="C & C Logo" 
              className="couple-logo" 
            />
            <p className="page-kicker">Save the date</p>
            <h2 className="details-title">Our wedding day</h2>
            <div className="vintage-divider">❧</div>
            <p className="message" style={{color:'#765963'}}>Saturday, December 19, 2026 · 9:00 AM</p>
            <div className="mini-events">
              <article className="mini-event">
                <p className="page-kicker">The ceremony</p>
                <h3>Our Lady of Salvation Parish</h3>
                <div className="vintage-ornament" style={{fontSize:'10px',margin:'4px 0'}}>✧ ✧ ✧</div>
                <p>Prk 6, Brgy. Cabacungan<br/>La Castellana, Negros Occidental</p>
                <a target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=Our+Lady+of+Salvation+Parish+Prk+6+Brgy+Cabacungan+La+Castellana">Get directions ↗</a>
              </article>
              <article className="mini-event">
                <p className="page-kicker">The reception</p>
                <h3>F&amp;C Guest House</h3>
                <div className="vintage-ornament" style={{fontSize:'10px',margin:'4px 0'}}>✧ ✧ ✧</div>
                <p>Cor. Rizal &amp; Mabini Streets<br/>Canlaon City, Negros Oriental</p>
                <a target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=F%26C+Guest+House+Canlaon+City">Get directions ↗</a>
              </article>
            </div>
          </div>
        </section>

        <section id="page-3" data-index="3" className={`page thank-you-page ${page === 3 ? 'active' : ''}`}>
          <div className="page-inner">
            <img 
              src={logoLogo} 
              alt="C & C Logo" 
              className="couple-logo" 
            />
            <p className="page-kicker">With deepest gratitude</p>
            <h2 className="proposal-name" style={{fontSize: 'clamp(38px, 6vw, 72px)'}}>Thank you</h2>
            <div className="vintage-ornament">❦ ❧ ❦</div>
            <p className="message">Thank you for being an integral part of our lives. A formal invitation with further specifics and details will follow soon as we prepare to celebrate our special day.</p>
            <div className="vintage-divider">❖</div>
            <p className="cover-subtitle" style={{marginTop: '25px'}}>Cloyd &amp; Cyrin</p>
            <p className="cover-subtitle" style={{marginTop: '-15px'}}>December 19, 2026</p>
          </div>
        </section>

        <div className="pagination-dots">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              className={`dot ${page === idx ? 'active' : ''}`}
              onClick={() => goTo(idx)}
              aria-label={`Go to section ${idx + 1}`}
            />
          ))}
        </div>
      </>
    )}

    {open && (
      <div className="modal-backdrop" onMouseDown={handleCloseModal}>
        <div className="rsvp-modal" onMouseDown={e => e.stopPropagation()}>
          {rsvpStatus !== 'submitting' && (
            <button className="close" type="button" onClick={handleCloseModal}>×</button>
          )}

          {rsvpStatus === 'idle' && (
            <form onSubmit={accept}>
              <p className="page-kicker">Cloyd &amp; Cyrin</p>
              <h2>Will you join us?</h2>
              <div className="vintage-ornament" style={{margin:'-15px 0 15px'}}>❧</div>
              <label>
                Your name
                <input required value={form.name} readOnly style={{ opacity: 0.85, cursor: 'not-allowed', backgroundColor: '#efe4de' }} />
              </label>
              <label>
                Message for the couple
                <textarea value={form.note} onChange={e => setForm({...form,note:e.target.value})} placeholder="Optional" />
              </label>
              <div className="modal-actions">
                <button type="submit">Joyfully accept</button>
                <button type="button" className="decline-button" onClick={decline}>Decline</button>
              </div>
            </form>
          )}

          {rsvpStatus === 'submitting' && (
            <div className="status-view">
              <p className="page-kicker">Cloyd &amp; Cyrin</p>
              <div className="wedding-loader">
                <GreenScreenVideo src={ringsMp4Url} />
              </div>
              <h3>Recording your RSVP...</h3>
              <p className="message" style={{color:'#725962', margin:'10px auto 0'}}>
                Please wait a moment while we save your joyful response.
              </p>
            </div>
          )}

          {rsvpStatus === 'success' && (
            <div className="status-view">
              <div className="success-icon">♥</div>
              <h3>Response Recorded!</h3>
              <div className="vintage-ornament" style={{margin:'8px 0'}}>❧ ❦ ❧</div>
              <p className="message" style={{color:'#725962', margin:'10px auto 0'}}>
                We can&apos;t wait to celebrate our special day with you!
              </p>
            </div>
          )}
        </div>
      </div>
    )}

    {declineError && <div className="error-backdrop" onMouseDown={() => setDeclineError(false)}><section className="error-dialog" role="alertdialog" onMouseDown={e => e.stopPropagation()}><div className="error-icon">!</div><h2>Request denied</h2><p>Declining this invitation is unavailable. Cloyd and Cyrin are counting on you to be part of their day.</p><button onClick={() => setDeclineError(false)}>I understand</button></section></div>}
    {toast && <div className="toast">{toast}</div>}
  </main>
}