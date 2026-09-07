import { useCallback, useEffect, useRef, useState } from "react";
import "./index.css";
import "./App.css";
import ringsMp4Url from "./rings.mp4";
import WeddingAdmin from "./WeddingAdmin";
import {
  discoverWeddingAdmin,
  searchEntourage,
  submitEntourageResponse,
} from "./lib/supabase";
import { mapEntourageRow } from "./lib/wedding";
import { PERSONAL_REVEAL_DURATION_MS, photography } from "./weddingContent";
import { useDialogAccessibility } from "./hooks/useDialogAccessibility";
import {
  EditorialPhoto,
  GreenScreenVideo,
  ProposalMonogram,
} from "./components/WeddingMedia";

const sparkles = Array.from({ length: 30 }).map((_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 3.5 + 1.5,
  duration: Math.random() * 5 + 4,
  delay: Math.random() * 5,
}));

export default function App() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [guest, setGuest] = useState(null);
  const [open, setOpen] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState("idle");
  const [declineStage, setDeclineStage] = useState(null);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ name: "", note: "" });
  const [hasResponded, setHasResponded] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [openingState, setOpeningState] = useState("idle");
  const [proposalReady, setProposalReady] = useState(false);
  const [matches, setMatches] = useState([]);
  const [adminAccessCode, setAdminAccessCode] = useState("");
  const handleCloseModal = useCallback(() => {
    if (rsvpStatus === "submitting") return;
    setOpen(false);
    setRsvpStatus("idle");
  }, [rsvpStatus]);

  const guestRef = useRef(null);
  const navigationLock = useRef(false);
  const navigationTimer = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const watermarkRef = useRef(null);
  const responseDialogRef = useDialogAccessibility(open, handleCloseModal);
  const declineDialogRef = useDialogAccessibility(Boolean(declineStage), () =>
    setDeclineStage(null),
  );

  useEffect(() => {
    const search = query.trim();
    if (search.length < 3) {
      setMatches([]);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const [rows, adminMatch] = await Promise.all([
          searchEntourage(search),
          search.length === 5
            ? discoverWeddingAdmin(search)
            : Promise.resolve(false),
        ]);
        if (cancelled) return;
        const guestMatches = rows.map(mapEntourageRow);
        setMatches(
          adminMatch
            ? [
                {
                  id: "event-owner",
                  name: "Event Owner",
                  role: "Admin Access",
                  isAdmin: true,
                  candidateCode: search.toUpperCase(),
                },
                ...guestMatches,
              ]
            : guestMatches,
        );
      } catch {
        if (!cancelled) {
          setMatches([]);
          setToast("We could not search the guest list. Please try again.");
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // One shared monogram: quiet at rest, briefly alive between chapters.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = null;

    const updateMonogram = () => {
      rafId = null;
      const logoEl = watermarkRef.current;
      if (!logoEl) return;

      if (showIntro) {
        logoEl.style.opacity = "0";
        logoEl.style.zIndex = "0";
        logoEl.style.filter = "none";
        return;
      }

      const scrollTop = container.scrollTop;
      const pages = container.querySelectorAll(".page");
      if (pages.length === 0) return;

      let pageIndex = pages.length - 1;
      for (let idx = 0; idx < pages.length - 1; idx += 1) {
        if (scrollTop < pages[idx + 1].offsetTop) {
          pageIndex = idx;
          break;
        }
      }
      const nextPageIndex = Math.min(pageIndex + 1, pages.length - 1);
      const pageStart = pages[pageIndex].offsetTop;
      const pageEnd = pages[nextPageIndex].offsetTop;
      const distance = Math.max(pageEnd - pageStart, 1);
      const rawProgress =
        nextPageIndex === pageIndex ? 0 : (scrollTop - pageStart) / distance;
      const progress = Math.min(Math.max(rawProgress, 0), 1);
      const lift = Math.sin(progress * Math.PI);
      const currentIsIvory = pageIndex === 2;
      const restingOpacity = currentIsIvory
        ? 0
        : pageIndex === 0
          ? 0.055
          : 0.032;
      const opacity = Math.min(restingOpacity + lift * 0.94, 1);
      const isFlying = lift > 0.04;

      logoEl.style.opacity = String(opacity);
      logoEl.style.zIndex = isFlying ? "10" : "0";
      logoEl.style.filter = isFlying
        ? `drop-shadow(0 ${10 + lift * 8}px ${24 + lift * 18}px rgba(35, 3, 14, ${0.32 + lift * 0.28})) drop-shadow(0 0 ${8 + lift * 12}px rgba(247, 232, 180, ${lift * 0.48}))`
        : "none";
      logoEl.style.transform = `translate3d(-50%, calc(-50% - ${lift * 34}px), 0) scale(${1 + lift * 0.11})`;
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(updateMonogram);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    updateMonogram();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [guest, showIntro]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sections = container.querySelectorAll(".page");
    const observer = new IntersectionObserver(
      (entries) => {
        if (navigationLock.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.dataset.index);
            setPage(index);
          }
        });
      },
      { root: container, threshold: 0.55 },
    );

    sections.forEach((sec) => observer.observe(sec));

    return () => {
      observer.disconnect();
    };
  }, [guest]);

  const goTo = (target) => {
    navigationLock.current = true;
    window.clearTimeout(navigationTimer.current);
    setPage(target);

    const container = containerRef.current;
    if (container) {
      const targetPage = container.querySelector(`#page-${target}`);
      if (targetPage) {
        container.scrollTo({
          top: targetPage.offsetTop,
          behavior: "smooth",
        });
      }
    }

    navigationTimer.current = window.setTimeout(() => {
      navigationLock.current = false;
    }, 850);
  };

  const choose = (person) => {
    setKeyboardOpen(false);
    inputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (person.isAdmin) {
      setAdminAccessCode(person.candidateCode);
      setQuery("");
      setMatches([]);
      return;
    }
    guestRef.current = person;
    setGuest(person);
    setProposalReady(false);
    setForm({ name: person.name, note: "" });
    setQuery("");
    setTimeout(() => setProposalReady(true), PERSONAL_REVEAL_DURATION_MS);

    // Supabase is the single source of truth for finalized responses.
    setHasResponded(person.responseStatus !== "pending");

    setTimeout(() => {
      goTo(1);
    }, 300);
  };

  const decline = () => setDeclineStage("confirm");

  const confirmDecline = async () => {
    try {
      await submitEntourageResponse({
        entourageId: guest?.id,
        response: "declined",
        message: null,
      });
      setHasResponded(true);
      setDeclineStage("complete");
    } catch {
      setDeclineStage(null);
      setToast("Your response could not be saved. Please try again.");
    }
  };

  const accept = async (event) => {
    event.preventDefault();
    setRsvpStatus("submitting");

    const minAnimationDelay = new Promise((resolve) =>
      setTimeout(resolve, 2500),
    );

    try {
      const requestPromise = submitEntourageResponse({
        entourageId: guest?.id,
        response: "accepted",
        message: form.note,
      });

      await Promise.all([requestPromise, minAnimationDelay]);

      setRsvpStatus("success");
      setHasResponded(true);
    } catch {
      setRsvpStatus("idle");
      setToast("Your response could not be sent. Please try again.");
    }
  };

  const openInvitation = () => {
    if (openingState !== "idle") return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setOpeningState("opening");
    window.setTimeout(
      () => {
        setShowIntro(false);
        setOpeningState("revealed");
        window.setTimeout(
          () => setOpeningState("complete"),
          reducedMotion ? 100 : 1000,
        );
      },
      reducedMotion ? 240 : 1800,
    );
  };

  return (
    <div
      className={`invitation-app ${keyboardOpen ? "keyboard-open" : ""} opening-${openingState}`}
      ref={containerRef}
    >
      {showIntro && (
        <div
          className={`private-entrance ${openingState === "opening" ? "is-opening" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Open your private invitation"
        >
          <div className="entrance-grain" aria-hidden="true" />
          <div className="entrance-content">
            <p className="entrance-eyebrow">A private invitation</p>
            <ProposalMonogram mode="hero" />
            <h1>
              Cloyd <i>&amp;</i> Cyrin
            </h1>
            <p>have something special to ask you</p>
            <button
              type="button"
              disabled={openingState !== "idle"}
              onClick={openInvitation}
            >
              Open your invitation
            </button>
          </div>
        </div>
      )}

      <ProposalMonogram mode="watermark" monogramRef={watermarkRef} />

      <div className="glitters-container">
        {sparkles.map((s) => (
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

      <section
        id="page-0"
        data-index="0"
        className={`page cover ${page === 0 ? "active" : ""} ${keyboardOpen ? "keyboard-open" : ""}`}
      >
        <div className="page-inner">
          <div className="cover-collapsible">
            <p className="cover-subtitle">Cloyd &amp; Cyrin</p>
            <p className="cover-subtitle cover-date">December 19, 2026</p>
            <h1 className="cover-title">
              A special place<i>for you</i>
            </h1>
            <div className="vintage-divider">❧</div>
            <p className="message cover-instruction">
              Find your name to receive your personal wedding proposal.
            </p>
          </div>
          <div className="lookup">
            <input
              ref={inputRef}
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (toast) setToast("");
              }}
              onFocus={() => {
                setKeyboardOpen(true);
                setToast("");
                setTimeout(() => {
                  containerRef.current?.scrollTo({
                    top: 0,
                    behavior: "instant",
                  });
                }, 50);
              }}
              onBlur={() => {
                setTimeout(() => setKeyboardOpen(false), 250);
              }}
              placeholder="Search your name"
              aria-label="Search your name"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={matches.length > 0}
              aria-controls={
                matches.length > 0 ? "invitation-name-results" : undefined
              }
            />
            {matches.length > 0 && (
              <div
                id="invitation-name-results"
                className="results"
                role="listbox"
                aria-label="Matching invitation names"
              >
                {matches.map((person) => (
                  <button
                    key={person.id}
                    className={person.isAdmin ? "admin-search-result" : ""}
                    role="option"
                    aria-selected="false"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      choose(person);
                    }}
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
          <section
            id="page-1"
            data-index="1"
            className={`page proposal-page ${page === 1 ? "active" : ""}`}
          >
            <div className="page-inner">
              {!proposalReady ? (
                <div className="personal-reveal" aria-live="polite">
                  <p className="page-kicker">A personal proposal for</p>
                  <h2 className="proposal-name">
                    {guest?.name || "Someone special"}
                  </h2>
                  <div className="reveal-diamond" aria-hidden="true" />
                </div>
              ) : (
                <div className="proposal-composition">
                  <EditorialPhoto
                    photo={photography.proposalHero}
                    className="proposal-photo"
                    priority
                  />
                  <p className="page-kicker">{guest?.name}</p>
                  <p className="romantic-line">
                    Some moments are simply too meaningful <br />
                    to celebrate without the people we love.
                  </p>
                  <div
                    className={`role-ornament ${guest?.category || "diamond"}`}
                    aria-hidden="true"
                  >
                    ◇
                  </div>
                  <p className="proposal-lead">
                    {guest?.lead || "Will you stand beside us as our"}
                  </p>
                  <h3 className="proposal-role">
                    {guest?.title || guest?.role || "Wedding Entourage"}?
                  </h3>
                  {guest?.tail && <p className="proposal-tail">{guest.tail}</p>}
                  <p className="message">
                    As we begin our forever, it would mean the world to have you
                    share this beautiful day. Your love and support are a gift
                    we will always treasure.
                  </p>
                  <div className="response-actions">
                    {hasResponded ? (
                      <div className="already-responded-badge">
                        Your response has been lovingly received.
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setOpen(true)}>
                          Yes, with all my heart
                        </button>
                        <button className="decline-button" onClick={decline}>
                          I&apos;m unable to accept
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section
            id="page-2"
            data-index="2"
            className={`page details-page ${page === 2 ? "active" : ""}`}
          >
            <div className="page-inner">
              <p className="page-kicker">Save the date</p>
              <h2 className="details-title">Our wedding day</h2>
              <div className="vintage-divider">❧</div>
              <p className="message wedding-date-line">
                Saturday, December 19, 2026 · 9:00 AM
              </p>
              <div className="mini-events">
                <article className="mini-event">
                  <p className="page-kicker">The ceremony</p>
                  <h3>Our Lady of Salvation Parish</h3>
                  <div className="vintage-ornament event-ornament">✧ ✧ ✧</div>
                  <p>
                    Prk 6, Brgy. Cabacungan
                    <br />
                    La Castellana, Negros Occidental
                  </p>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://www.google.com/maps/search/?api=1&query=Our+Lady+of+Salvation+Parish+Prk+6+Brgy+Cabacungan+La+Castellana"
                  >
                    Get directions ↗
                  </a>
                </article>
                <article className="mini-event">
                  <p className="page-kicker">The reception</p>
                  <h3>F&amp;C Guest House</h3>
                  <div className="vintage-ornament event-ornament">✧ ✧ ✧</div>
                  <p>
                    Cor. Rizal &amp; Mabini Streets
                    <br />
                    Canlaon City, Negros Oriental
                  </p>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://www.google.com/maps/search/?api=1&query=F%26C+Guest+House+Canlaon+City"
                  >
                    Get directions ↗
                  </a>
                </article>
              </div>
            </div>
          </section>

          <section
            id="page-3"
            data-index="3"
            className={`page thank-you-page ${page === 3 ? "active" : ""}`}
          >
            <div className="page-inner">
              <EditorialPhoto
                photo={photography.closing}
                className="closing-photo"
              />
              <p className="page-kicker">With deepest gratitude</p>
              <h2 className="proposal-name thank-you-title">Thank you</h2>
              <div className="vintage-ornament">❦ ❧ ❦</div>
              <p className="message">
                Thank you for being an integral part of our lives. A formal
                invitation with further specifics and details will follow soon
                as we prepare to celebrate our special day.
              </p>
              <div className="vintage-divider">❖</div>
              <p className="cover-subtitle closing-signature">
                Cloyd &amp; Cyrin
              </p>
              <p className="cover-subtitle cover-date">December 19, 2026</p>
            </div>
          </section>

          <div className="pagination-dots">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                className={`dot ${page === idx ? "active" : ""}`}
                onClick={() => goTo(idx)}
                aria-label={`Go to section ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {open && (
        <div className="modal-backdrop" onMouseDown={handleCloseModal}>
          <div
            ref={responseDialogRef}
            className="rsvp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="response-dialog-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {rsvpStatus !== "submitting" && (
              <button
                className="close"
                type="button"
                onClick={handleCloseModal}
                aria-label="Close response form"
              >
                ×
              </button>
            )}

            {rsvpStatus === "idle" && (
              <form onSubmit={accept}>
                <p className="page-kicker">Cloyd &amp; Cyrin</p>
                <h2 id="response-dialog-title">Will you join us?</h2>
                <div className="vintage-ornament modal-ornament">❧</div>
                <label>
                  Your name
                  <input
                    className="readonly-name"
                    required
                    value={form.name}
                    readOnly
                  />
                </label>
                <label>
                  Message for the couple
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Optional"
                  />
                </label>
                <div className="modal-actions">
                  <button type="submit">Joyfully accept</button>
                  <button
                    type="button"
                    className="decline-button"
                    onClick={decline}
                  >
                    Decline
                  </button>
                </div>
              </form>
            )}

            {rsvpStatus === "submitting" && (
              <div className="status-view">
                <p className="page-kicker">Cloyd &amp; Cyrin</p>
                <div className="wedding-loader">
                  <GreenScreenVideo src={ringsMp4Url} />
                </div>
                <h3>Recording your RSVP...</h3>
                <p className="message status-message">
                  Please wait a moment while we save your joyful response.
                </p>
              </div>
            )}

            {rsvpStatus === "success" && (
              <div className="status-view acceptance-view">
                <EditorialPhoto
                  photo={photography.acceptance}
                  className="acceptance-photo"
                />
                <p className="page-kicker">With joyful hearts</p>
                <h3>You said yes.</h3>
                <div className="reveal-diamond" aria-hidden="true" />
                <p className="message status-message">
                  And our hearts couldn&apos;t be happier. We can&apos;t imagine
                  this day without you, {guest?.shortName}.
                </p>
                <button
                  className="continue-button"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setRsvpStatus("idle");
                    goTo(2);
                  }}
                >
                  View our wedding day →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {declineStage && (
        <div
          className="decline-backdrop"
          onMouseDown={() => setDeclineStage(null)}
        >
          <section
            ref={declineDialogRef}
            className="decline-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="decline-dialog-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="page-kicker">A thoughtful response</p>
            {declineStage === "confirm" ? (
              <>
                <h2 id="decline-dialog-title">Are you sure?</h2>
                <div className="reveal-diamond" aria-hidden="true" />
                <p>
                  We completely understand that you may not be able to join us
                  in this role. Please confirm below.
                </p>
                <div className="decline-actions">
                  <button type="button" onClick={() => setDeclineStage(null)}>
                    Go back
                  </button>
                  <button
                    type="button"
                    className="quiet-action"
                    onClick={confirmDecline}
                  >
                    I&apos;m unable to accept
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="decline-dialog-title">With love, always.</h2>
                <div className="reveal-diamond" aria-hidden="true" />
                <p>
                  Thank you for letting us know. We&apos;re grateful to have you
                  in our lives regardless.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDeclineStage(null);
                    goTo(2);
                  }}
                >
                  View our wedding day →
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {adminAccessCode && (
        <WeddingAdmin
          initialCode={adminAccessCode}
          onClose={() => setAdminAccessCode("")}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
