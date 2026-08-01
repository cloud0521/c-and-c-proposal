import { useEffect, useMemo, useRef, useState } from 'react'
import logo from './logo.png'
import './index.css'

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

export default function App() {
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [guest, setGuest] = useState(null)
  const [open, setOpen] = useState(false)
  const [declineError, setDeclineError] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', note: '' })
  
  const navigationLock = useRef(false)
  const navigationTimer = useRef(null)
  const containerRef = useRef(null)

  const matches = useMemo(() => query.trim() ? guests.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [], [query])
  
  useEffect(() => { 
    if (toast) { 
      const timer = setTimeout(() => setToast(''), 4000); 
      return () => clearTimeout(timer) 
    } 
  }, [toast])

  // Prevents state thrashing and animation restarting during scroll
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
    return () => observer.disconnect()
  }, [])

  const goTo = (target) => {
    navigationLock.current = true
    window.clearTimeout(navigationTimer.current)
    setPage(target)
    document.getElementById(`page-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    navigationTimer.current = window.setTimeout(() => { navigationLock.current = false }, 850)
  }

  const choose = (person) => { setGuest(person); setForm({ name: person.name, note: '' }); setQuery(''); goTo(1) }
  const decline = () => setDeclineError(true)
  
  const accept = async (event) => { 
    event.preventDefault(); 
    const data = { name: form.name, role: guest?.role || '', note: form.note, response: 'Joyfully accepts', submittedAt: new Date().toISOString() }; 
    const endpoint = import.meta.env.VITE_RSVP_ENDPOINT; 
    try { 
      if (endpoint) await fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); 
      else localStorage.setItem(`cloyd-cyrin-rsvp-${data.name}`, JSON.stringify(data)); 
      setOpen(false); 
      setToast(endpoint ? 'Your joyful response has been recorded.' : 'Your response is saved on this device.') 
    } catch { 
      setToast('Your response could not be sent. Please try again.') 
    } 
  }

  const titles = ['Welcome', 'Your proposal', 'The day', 'Respond']
  const next = () => goTo(Math.min(page + 1, 3))
  const previous = () => goTo(Math.max(page - 1, 0))

  return <main className="invitation-app" ref={containerRef}>
    {/* Base Layout Styles with Dynamic vh Padding & Scroll-Snap Fixes */}
    <style>{`.invitation-app{height:100vh;overflow-y:auto;scroll-snap-type:y mandatory;background:#360817;color:#fff;scroll-behavior:smooth}.page{height:100vh;width:100%;box-sizing:border-box;display:flex;position:relative;overflow-y:auto;overflow-x:hidden;isolation:isolate;scroll-snap-align:start;scroll-snap-stop:always}.page-inner{width:min(1040px,100%);margin:auto;padding:clamp(50px,8vh,100px) 24px clamp(70px,10vh,100px);text-align:center;box-sizing:border-box}.logo-mark{width:clamp(100px,12vh,155px);max-height:155px;object-fit:contain;mix-blend-mode:multiply;filter:sepia(.4) saturate(1.25) contrast(1.1);animation:float 5s ease-in-out infinite}.cover .page-inner{display:grid;place-items:center;padding-bottom:clamp(90px,14vh,150px)}.cover-title{font:500 clamp(46px,8vw,105px)/.8 'Playfair Display';letter-spacing:-.07em;margin:12px 0 22px}.cover-title i{display:block;font-size:.55em;color:#e1a68e;font-weight:400}.cover-subtitle{font:12px 'DM Mono';letter-spacing:.2em;text-transform:uppercase;color:#e7b29d;margin:clamp(12px,3vh,25px) 0}.lookup{width:min(470px,100%);position:relative;margin:clamp(15px,3vh,25px) auto}.lookup input{width:100%;height:54px;border:1px solid #e9af9780;background:#26040e66;padding:0 20px;color:#fff;outline:0;font:14px 'DM Sans'}.lookup input::placeholder{color:#ffffffa1}.results{position:absolute;top:59px;width:100%;z-index:3;background:#fff;color:#4a2330;box-shadow:0 14px 40px #19030bbb}.results button{width:100%;background:#fff;border:0;border-bottom:1px solid #eadbd4;padding:13px 18px;text-align:left;display:flex;justify-content:space-between;align-items:center}.results button:hover{background:#f9edeb}.results span{font:600 17px 'Playfair Display';color:#58122a}.results small{font:9px 'DM Mono';letter-spacing:.1em;text-transform:uppercase;color:#ae7569}.page-kicker{font:10px 'DM Mono';letter-spacing:.24em;text-transform:uppercase;color:#e2a58d;margin:0 0 clamp(10px,2vh,20px)}.proposal-name{font:500 clamp(44px,7vw,92px)/.9 'Playfair Display';color:#fff;margin:0;letter-spacing:-.06em}.proposal-role{font:500 clamp(32px,5vw,56px)/1.1 'Playfair Display';color:#e5a78e;margin:clamp(10px,2vh,18px) 0}.message{max-width:550px;margin:clamp(14px,3vh,28px) auto;line-height:1.75;font-size:14px;color:#f2dfd8}.details-page{background:#f7e9e2;color:#58122a}.details-page .page-kicker{color:#a56559}.details-page:before,.details-page:after{color:#c78d80}.details-title{font:500 clamp(44px,7vw,84px)/.9 'Playfair Display';margin:0}.mini-events{margin:clamp(20px,4vh,40px) auto 0;display:grid;grid-template-columns:1fr 1fr;max-width:800px}.mini-event{padding:clamp(20px,3vh,34px) 24px;background:#fff}.mini-event:first-child{border-right:1px solid #ead5cd}.mini-event h3{font:600 clamp(20px,3vw,26px)/1.1 'Playfair Display';margin:10px 0;color:#58122a}.mini-event p{font-size:13px;line-height:1.6;color:#775a62}.mini-event a{display:inline-block;margin-top:12px;color:#58122a;font-size:10px;letter-spacing:.13em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #c6907b;padding-bottom:3px}.response-page .page-inner{max-width:700px}.response-page h2{font:500 clamp(44px,7vw,84px)/.95 'Playfair Display';margin:0}.response-page .logo-mark{width:clamp(80px,10vh,110px)}.response-actions{display:flex;justify-content:center;gap:13px;margin-top:clamp(20px,4vh,34px)}.response-actions button,.modal-actions button{width:180px;min-height:48px;border:1px solid #dba087;background:#dba087;color:#3b0918;padding:12px;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:600;cursor:pointer}.response-actions .decline-button,.modal-actions .decline-button{background:#eee5e2;border-color:#bca5a5;color:#947c80;cursor:not-allowed;opacity:.78}.pager{position:fixed;z-index:5;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px}.pager button{border:1px solid #ffffff80;background:#ffffff12;color:#fff;width:40px;height:36px;cursor:pointer}.pager button:disabled{opacity:.35}.pager-dots{display:flex;gap:7px}.pager-dots button{border:0;width:7px;height:7px;padding:0;border-radius:50%;background:#ffffff70;cursor:pointer}.pager-dots button.current{background:#e7ae91;transform:scale(1.35)}.pager-label{position:fixed;right:25px;bottom:35px;font:9px 'DM Mono';letter-spacing:.16em;text-transform:uppercase;color:#ffffffa8}.modal-backdrop,.error-backdrop{position:fixed;inset:0;z-index:20;background:#250510bd;display:grid;place-items:center;padding:20px}.rsvp-modal,.error-dialog{width:min(450px,100%);background:#fff9f6;color:#58122a;padding:43px 35px;text-align:center;position:relative;box-shadow:0 18px 55px #1b030c80}.rsvp-modal h2,.error-dialog h2{font:600 39px/1 'Playfair Display';margin:8px 0 27px}.rsvp-modal label{text-align:left;display:block;font:10px 'DM Mono';letter-spacing:.12em;text-transform:uppercase;margin-top:17px}.rsvp-modal input,.rsvp-modal textarea{width:100%;border:0;border-bottom:1px solid #c9aba2;background:transparent;padding:10px 0;outline:0;font:14px 'DM Sans';color:#3f2830}.rsvp-modal textarea{min-height:76px;resize:vertical}.close{position:absolute;right:15px;top:8px;border:0;background:none;color:#58122a;font-size:27px;cursor:pointer}.modal-actions{display:flex;justify-content:center;gap:12px;margin-top:27px}.error-dialog{border-top:5px solid #a5213e}.error-icon{width:53px;height:53px;margin:auto;border-radius:50%;background:#a5213e;color:#fff;display:grid;place-items:center;font:600 34px 'DM Sans'}.error-dialog p{font-size:13px;line-height:1.7;color:#725962}.error-dialog button{width:100%;margin-top:18px;border:0;background:#58122a;color:#fff;padding:14px;text-transform:uppercase;letter-spacing:.13em;font-size:10px;cursor:pointer}.toast{position:fixed;z-index:25;bottom:80px;left:50%;transform:translateX(-50%);background:#fff;color:#58122a;padding:15px 23px;box-shadow:0 7px 28px #18030c55;font-size:13px}@media(max-width:620px){.mini-events{grid-template-columns:1fr}.mini-event:first-child{border-right:0;border-bottom:1px solid #ead5cd}.pager-label{display:none}.page-inner{padding-top:clamp(60px,10vh,95px)}.response-actions,.modal-actions{flex-direction:column;align-items:center}}`}</style>
    
    {/* All Original Keyframes & .page.active Entrance Animations */}
    <style>{`.page.active .logo-mark{animation:logoEntrance 1s cubic-bezier(.16,1,.3,1) both,float 5s 1s ease-in-out infinite}.page.active .cover-subtitle,.page.active .page-kicker{animation:slideUp .7s .16s both}.page.active .cover-title,.page.active .proposal-name,.page.active .details-title{animation:dramaticReveal 1s .3s cubic-bezier(.16,1,.3,1) both}.page.active .message{animation:slideUp .75s .52s both}.page.active .lookup,.page.active .mini-events,.page.active .response-actions,.page.active .proposal-role{animation:slideUp .8s .68s both}.page.active .mini-event{animation:cardPop .7s both}.page.active .mini-event:nth-child(2){animation-delay:.14s}.page.active .response-actions button{animation:buttonIn .65s .82s both}.page.active .response-actions button:nth-child(2){animation-delay:.94s}.logo-mark{transition:filter .45s,transform .45s}.logo-mark:hover{transform:scale(1.12) rotate(-7deg)!important;filter:sepia(.7) saturate(1.55) contrast(1.15)!important}.response-actions button,.modal-actions button,.pager button,.error-dialog button,.results button{transition:transform .2s cubic-bezier(.2,1.5,.5,1),box-shadow .2s,background .2s;position:relative;overflow:hidden}.response-actions button:not(.decline-button):hover,.modal-actions button:not(.decline-button):hover,.error-dialog button:hover{transform:translateY(-5px) scale(1.04);box-shadow:0 12px 24px #13020a66}.response-actions button:not(.decline-button):active,.modal-actions button:not(.decline-button):active,.error-dialog button:active{transform:scale(.93);box-shadow:none}.response-actions button:not(.decline-button):before,.modal-actions button:not(.decline-button):before,.error-dialog button:before{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,#ffffff9c 47%,transparent 64%);transform:translateX(-130%);transition:transform .55s}.response-actions button:not(.decline-button):hover:before,.modal-actions button:not(.decline-button):hover:before,.error-dialog button:hover:before{transform:translateX(130%)}.decline-button:hover{animation:declineJitter .35s linear infinite;filter:saturate(1.25)}.pager{top:auto;bottom:22px;animation:pagerRise 1s 1s both}.cover .page-inner{padding-bottom:170px}.pager button:not(:disabled):hover{transform:scale(1.2) rotate(8deg);background:#dca18a;color:#58122a;border-color:#dca18a}.pager-dots button:hover{transform:scale(1.7)!important;background:#fff}.pager-dots button.current{animation:dotPulse 1.4s infinite}.results{animation:resultsDrop .35s cubic-bezier(.16,1,.3,1) both}.results button{animation:resultSlide .4s both}.results button:nth-child(2){animation-delay:.05s}.results button:nth-child(3){animation-delay:.1s}.results button:nth-child(4){animation-delay:.15s}.results button:nth-child(5){animation-delay:.2s}.results button:hover{transform:translateX(7px);box-shadow:-5px 0 #c6907b inset}.modal-backdrop{animation:backdropIn .25s both}.rsvp-modal{animation:modalBurst .62s cubic-bezier(.16,1.3,.3,1) both}.error-backdrop{animation:warningFlash .45s both}.error-dialog{animation:errorImpact .7s cubic-bezier(.18,1.55,.38,1) both}.error-icon{animation:warningPulse 1.1s .4s infinite}.toast{animation:toastFly .6s cubic-bezier(.16,1.2,.3,1) both}@keyframes logoEntrance{0%{opacity:0;transform:scale(.15) rotate(-38deg);filter:blur(10px)}70%{transform:scale(1.13) rotate(5deg);filter:blur(0)}100%{opacity:1;transform:scale(1) rotate(0)}}@keyframes dramaticReveal{from{opacity:0;letter-spacing:.18em;transform:translateY(38px) scale(.93);filter:blur(7px)}to{opacity:1;letter-spacing:normal;transform:none;filter:blur(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}@keyframes cardPop{from{opacity:0;transform:perspective(700px) rotateX(35deg) translateY(25px)}to{opacity:1;transform:none}}@keyframes buttonIn{from{opacity:0;transform:scale(.45) rotate(-10deg)}to{opacity:1;transform:none}}@keyframes declineJitter{25%{transform:translateX(-3px) rotate(-1deg)}75%{transform:translateX(3px) rotate(1deg)}}@keyframes pagerRise{from{opacity:0;transform:translate(-50%,25px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes dotPulse{50%{box-shadow:0 0 0 6px #e7ae9133}}@keyframes resultsDrop{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:none}}@keyframes resultSlide{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}@keyframes backdropIn{from{opacity:0}to{opacity:1}}@keyframes modalBurst{0%{opacity:0;transform:scale(.38) rotate(-5deg)}68%{transform:scale(1.05) rotate(1deg)}100%{opacity:1;transform:none}}@keyframes warningFlash{0%,100%{background:#250510bd}35%{background:#a5213ebd}}@keyframes errorImpact{0%{opacity:0;transform:scale(.15) rotate(-12deg)}50%{transform:scale(1.12) rotate(3deg)}72%{transform:scale(.96) rotate(-1deg)}100%{opacity:1;transform:none}}@keyframes warningPulse{50%{transform:scale(1.18);box-shadow:0 0 0 12px #a5213e2e}}@keyframes toastFly{from{opacity:0;transform:translate(-50%,45px) scale(.7)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}`}</style>

    <section id="page-0" data-index="0" className={`page cover ${page === 0 ? 'active' : ''}`}>
      <div className="page-inner">
        <img className="logo-mark" src={logo} alt="Cloyd and Cyrin wedding monogram"/>
        <p className="cover-subtitle">Cloyd &amp; Cyrin · December 19, 2026</p>
        <h1 className="cover-title">A special place<i>for you</i></h1>
        <p className="message">Find your name to receive your personal wedding proposal.</p>
        <div className="lookup">
          <input autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your name" aria-label="Search your name" />
          {matches.length > 0 && <div className="results">{matches.map(person => <button key={person.name} onClick={() => choose(person)}><span>{person.name}</span><small>{person.role} →</small></button>)}</div>}
        </div>
        <p className="cover-subtitle">Saturday · 9:00 AM</p>
      </div>
    </section>

    <section id="page-1" data-index="1" className={`page proposal-page ${page === 1 ? 'active' : ''}`}>
      <div className="page-inner">
        <img className="logo-mark" src={logo} alt=""/>
        <p className="page-kicker">A personal proposal for</p>
        <h2 className="proposal-name">{guest?.name || 'Someone special'}</h2>
        <p className="page-kicker">Will you stand beside us as our</p>
        <h3 className="proposal-role">{guest?.role || 'Wedding Entourage'}?</h3>
        <p className="message">As we begin our forever, it would mean the world to have you share this beautiful day. Your love and support are a gift we will always treasure.</p>
        <div className="response-actions">
          <button onClick={() => goTo(3)}>Joyfully respond</button>
          <button className="decline-button" onClick={decline}>Decline</button>
        </div>
      </div>
    </section>

    <section id="page-2" data-index="2" className={`page details-page ${page === 2 ? 'active' : ''}`}>
      <div className="page-inner">
        <p className="page-kicker">Save the date</p>
        <h2 className="details-title">Our wedding day</h2>
        <p className="message" style={{color:'#765963'}}>Saturday, December 19, 2026 · 9:00 AM</p>
        <div className="mini-events">
          <article className="mini-event">
            <p className="page-kicker">The ceremony</p>
            <h3>Our Lady of Salvation Parish</h3>
            <p>Prk 6, Brgy. Cabacungan<br/>La Castellana, Negros Occidental</p>
            <a target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=Our+Lady+of+Salvation+Parish+Prk+6+Brgy+Cabacungan+La+Castellana">Get directions ↗</a>
          </article>
          <article className="mini-event">
            <p className="page-kicker">The reception</p>
            <h3>F&amp;C Guest House</h3>
            <p>Cor. Rizal &amp; Mabini Streets<br/>Canlaon City, Negros Oriental</p>
            <a target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=F%26C+Guest+House+Canlaon+City">Get directions ↗</a>
          </article>
        </div>
      </div>
    </section>

    <section id="page-3" data-index="3" className={`page response-page ${page === 3 ? 'active' : ''}`}>
      <div className="page-inner">
        <img className="logo-mark" src={logo} alt=""/>
        <p className="page-kicker">Cloyd &amp; Cyrin</p>
        <h2>Will you<br/>join us?</h2>
        <p className="message">We cannot wait to celebrate this beautiful beginning with you.</p>
        <div className="response-actions">
          <button onClick={() => setOpen(true)}>Joyfully accept</button>
          <button className="decline-button" onClick={decline}>Decline</button>
        </div>
      </div>
    </section>

    <div className="pager">
      <button onClick={previous} disabled={page === 0} aria-label="Previous page">←</button>
      <div className="pager-dots">
        {titles.map((title, index) => <button aria-label={title} className={page === index ? 'current' : ''} onClick={() => goTo(index)} key={title}/>)}
      </div>
      <button onClick={next} disabled={page === 3} aria-label="Next page">→</button>
    </div>
    <p className="pager-label">{String(page + 1).padStart(2, '0')} / 04 · {titles[page]}</p>

    {open && <div className="modal-backdrop" onMouseDown={() => setOpen(false)}><form className="rsvp-modal" onSubmit={accept} onMouseDown={e => e.stopPropagation()}><button className="close" type="button" onClick={() => setOpen(false)}>×</button><p className="page-kicker">Cloyd &amp; Cyrin</p><h2>Will you join us?</h2><label>Your name<input required value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label><label>Message for the couple<textarea value={form.note} onChange={e => setForm({...form,note:e.target.value})} placeholder="Optional"/></label><div className="modal-actions"><button type="submit">Joyfully accept</button><button type="button" className="decline-button" onClick={decline}>Decline</button></div></form></div>}
    {declineError && <div className="error-backdrop" onMouseDown={() => setDeclineError(false)}><section className="error-dialog" role="alertdialog" onMouseDown={e => e.stopPropagation()}><div className="error-icon">!</div><h2>Request denied</h2><p>Declining this invitation is unavailable. Cloyd and Cyrin are counting on you to be part of their day.</p><button onClick={() => setDeclineError(false)}>I understand</button></section></div>}
    {toast && <div className="toast">{toast}</div>}
  </main>
}