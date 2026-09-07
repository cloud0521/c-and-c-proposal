import { useEffect, useMemo, useState } from "react";
import {
  getWeddingAdminEntourageResponses,
  loginWeddingAdmin,
  logoutWeddingAdmin,
  validateWeddingAdminSession,
} from "./lib/supabase";
import { filterResponses, summarizeResponses } from "./lib/wedding";
import "./WeddingAdmin.css";

const SESSION_KEY = "dreamz-wedding-owner-session";

function formatResponseDate(value) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function SummaryIcon({ type }) {
  const paths = {
    responses: (
      <>
        <path d="M5 4h14v11H9l-4 4V4Z" />
        <path d="M8 8h8M8 11h5" />
      </>
    ),
    attending: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    declined: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m9 9 6 6m0-6-6 6" />
      </>
    ),
    guests: (
      <>
        <circle cx="9" cy="9" r="3" />
        <circle cx="16.5" cy="10" r="2.5" />
        <path d="M3.5 19c.7-3.1 2.5-4.7 5.5-4.7s4.8 1.6 5.5 4.7M14 15c2.8-.5 4.7.8 5.5 3.5" />
      </>
    ),
  };
  return (
    <svg
      className="owner-summary-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

export default function WeddingAdmin({ initialCode, onClose }) {
  const [adminCode] = useState(initialCode);
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState(
    () => sessionStorage.getItem(SESSION_KEY) || "",
  );
  const [wedding, setWedding] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [filter, setFilter] = useState("responded");
  const [activeSummary, setActiveSummary] = useState("responses");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(sessionToken ? "loading" : "login");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionToken) return undefined;
    let cancelled = false;
    const loadDashboard = async () => {
      try {
        const session = await validateWeddingAdminSession(sessionToken);
        if (!session?.valid) throw new Error("expired");
        const rows = await getWeddingAdminEntourageResponses(sessionToken);
        if (!cancelled) {
          setWedding(session);
          setProposals(rows);
          setStatus("dashboard");
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
        if (!cancelled) {
          setSessionToken("");
          setStatus("login");
          setError("Your session has expired. Please sign in again.");
        }
      }
    };
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const result = await loginWeddingAdmin({ adminCode, password });
      if (!result?.success || !result.session_token) {
        setStatus("login");
        setError(
          result?.message ||
            "Unable to verify access. Please check your credentials and try again.",
        );
        return;
      }
      sessionStorage.setItem(SESSION_KEY, result.session_token);
      setSessionToken(result.session_token);
      setPassword("");
    } catch {
      setStatus("login");
      setError(
        "Unable to verify access. Please check your credentials and try again.",
      );
    }
  };

  const handleLogout = async () => {
    setStatus("loading");
    try {
      await logoutWeddingAdmin(sessionToken);
    } catch {
      /* Clear locally even if offline. */
    }
    sessionStorage.removeItem(SESSION_KEY);
    setSessionToken("");
    setWedding(null);
    setProposals([]);
    onClose();
  };

  const visibleRsvps = useMemo(() => {
    return filterResponses(proposals, filter, search);
  }, [filter, proposals, search]);

  const { totalResponses, acceptedPeople, declinedPeople, awaitingPeople } =
    useMemo(() => summarizeResponses(proposals), [proposals]);
  const selectSummary = (summary, attendanceFilter) => {
    setActiveSummary(summary);
    setFilter(attendanceFilter);
  };

  if (status !== "dashboard") {
    return (
      <div
        className="owner-shell owner-login-shell"
        role="dialog"
        aria-modal="true"
        aria-label="Event owner access"
      >
        <section className="owner-login-card">
          <button
            className="owner-close"
            type="button"
            onClick={onClose}
            aria-label="Close owner access"
          >
            ×
          </button>
          <p className="owner-eyebrow">Private stewardship</p>
          <h2>Event Owner Access</h2>
          <div className="owner-rule" aria-hidden="true" />
          <form onSubmit={handleLogin}>
            <label>
              Access Code
              <input value={adminCode} readOnly autoComplete="username" />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase())}
                maxLength={5}
                required
                autoComplete="current-password"
                autoFocus
              />
            </label>
            {error && (
              <p className="owner-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="owner-primary"
              type="submit"
              disabled={status === "loading" || password.length !== 5}
            >
              {status === "loading" ? "Verifying access…" : "Access Dashboard"}
            </button>
          </form>
          <button className="owner-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="owner-shell owner-dashboard-shell">
      <main className="owner-dashboard">
        <header className="owner-header">
          <div>
            <p className="owner-eyebrow">Wedding entourage register</p>
            <h1>{wedding?.couple_names}</h1>
          </div>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </header>
        <section
          className="owner-summary"
          aria-label="Filter proposal responses by summary"
        >
          <button
            type="button"
            className={activeSummary === "responses" ? "active" : ""}
            aria-pressed={activeSummary === "responses"}
            onClick={() => selectSummary("responses", "responded")}
          >
            <SummaryIcon type="responses" />
            <strong>{totalResponses}</strong>
            <span>Total responses</span>
          </button>
          <button
            type="button"
            className={activeSummary === "accepted" ? "active" : ""}
            aria-pressed={activeSummary === "accepted"}
            onClick={() => selectSummary("accepted", "accepted")}
          >
            <SummaryIcon type="attending" />
            <strong>{acceptedPeople}</strong>
            <span>Accepted people</span>
          </button>
          <button
            type="button"
            className={activeSummary === "declined" ? "active" : ""}
            aria-pressed={activeSummary === "declined"}
            onClick={() => selectSummary("declined", "declined")}
          >
            <SummaryIcon type="declined" />
            <strong>{declinedPeople}</strong>
            <span>Declined people</span>
          </button>
          <button
            type="button"
            className={activeSummary === "awaiting" ? "active" : ""}
            aria-pressed={activeSummary === "awaiting"}
            onClick={() => selectSummary("awaiting", "pending")}
          >
            <SummaryIcon type="guests" />
            <strong>{awaitingPeople}</strong>
            <span>Awaiting people</span>
          </button>
        </section>
        <section className="owner-register">
          <div className="owner-register-head">
            <div>
              <p className="owner-eyebrow">Proposal replies</p>
              <h2>Responses</h2>
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name"
              aria-label="Search proposal responses"
            />
          </div>
          <div className="owner-response-list">
            {visibleRsvps.length === 0 ? (
              <p className="owner-empty">No responses to show yet.</p>
            ) : (
              visibleRsvps.map((proposal) => (
                <article className="owner-response" key={proposal.proposal_id}>
                  <div className="owner-response-title">
                    <h3>{proposal.person_name}</h3>
                    <span className={proposal.response}>
                      {proposal.response}
                    </span>
                  </div>
                  <dl>
                    <div>
                      <dt>Role</dt>
                      <dd>{proposal.role}</dd>
                    </div>
                    <div>
                      <dt>People</dt>
                      <dd>{proposal.party_size}</dd>
                    </div>
                    <div>
                      <dt>{proposal.responded_at ? "Received" : "Status"}</dt>
                      <dd>
                        {proposal.responded_at
                          ? formatResponseDate(proposal.responded_at)
                          : "Awaiting response"}
                      </dd>
                    </div>
                  </dl>
                  {proposal.message && <p>“{proposal.message}”</p>}
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
