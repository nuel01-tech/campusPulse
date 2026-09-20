import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { jwtDecode } from "jwt-decode";

function getRole() {
  try {
    const token = localStorage.getItem("access");

    if (token) {
      return jwtDecode(token).role || "STUDENT";
    }
  } catch {}

  return "STUDENT";
}

/* -------------------------------------------------------
   Icons
------------------------------------------------------- */

function Icon({ name, size = 18, strokeWidth = 1.9 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const icons = {
    search: (
      <>
        <circle cx="11" cy="11" r="7.5" />
        <path d="m20 20-3.6-3.6" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 0 0-14-5.3L4 8" />
        <path d="M4 4v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 14 5.3l2-2.3" />
        <path d="M20 20v-4h-4" />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),

    crown: (
      <>
        <path d="m3 7 4.2 4L12 4l4.8 7L21 7l-1.5 12h-15L3 7Z" />
        <path d="M5 16h14" />
      </>
    ),

    message: (
      <>
        <path d="M21 11.5a8 8 0 0 1-8.5 8 8.5 8.5 0 0 1-3.8-.9L3 20l1.8-5.3A8 8 0 1 1 21 11.5Z" />
      </>
    ),

    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 15H6L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </>
    ),

    pause: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8v8" />
        <path d="M14 8v8" />
      </>
    ),

    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 5 4-5 4V8Z" />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),

    warning: (
      <>
        <path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),

    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),

    phone: (
      <>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.8 2Z" />
      </>
    ),
  };

  return <svg {...common}>{icons[name]}</svg>;
}

/* -------------------------------------------------------
   Avatar
------------------------------------------------------- */

function Avatar({ person, size = 58 }) {
  const initials =
    [person.first_name, person.last_name]
      .filter(Boolean)
      .map((name) => name[0].toUpperCase())
      .join("") ||
    person.username?.[0]?.toUpperCase() ||
    "?";

  const avatarVariants = [
    "cp-directory-avatar-green",
    "cp-directory-avatar-gold",
    "cp-directory-avatar-deep",
    "cp-directory-avatar-soft",
  ];

  const index = (person.username?.charCodeAt(0) || 0) % avatarVariants.length;

  if (person.profile_picture) {
    return (
      <img
        className="cp-directory-avatar-image"
        src={person.profile_picture}
        alt={`${person.first_name || person.username}'s profile`}
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  return (
    <div
      className={`cp-directory-avatar ${avatarVariants[index]}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/* -------------------------------------------------------
   Student card
------------------------------------------------------- */

function StudentCard({ person }) {
  const isRep = person.role === "CLASS_REP";

  const fullName =
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.username;

  return (
    <article className="cp-person-card">
      <div className="cp-person-card-main">
        <Avatar person={person} size={58} />

        <div className="cp-person-identity">
          <div className="cp-person-name-row">
            <h3 title={fullName}>{fullName}</h3>

            {isRep && (
              <span className="cp-role-badge cp-role-badge-rep">
                <Icon name="crown" size={13} strokeWidth={2} />
                Rep
              </span>
            )}
          </div>

          <span className="cp-person-username">@{person.username}</span>
        </div>
      </div>

      <div className="cp-person-card-footer">
        <span className="cp-level-badge">
          {person.level_label || `${person.level} Level`}
        </span>

        {isRep && (
          <span className="cp-directory-member-label">
            Class representative
          </span>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------
   Rep card
------------------------------------------------------- */

function RepCard({ person, onToggleSuspend, onDeleteAccount }) {
  const isRep = person.role === "CLASS_REP";

  const fullName =
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.username;

  const rawPhone = (person.phone_number || "").replace(/\D/g, "");

  const whatsappNumber = rawPhone.startsWith("00")
    ? rawPhone.slice(2)
    : rawPhone.startsWith("0")
      ? `234${rawPhone.slice(1)}`
      : rawPhone;

  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "";

  const isSuspended = person.is_active === false;

  return (
    <article
      className={`cp-person-card cp-person-card-admin ${
        isSuspended ? "cp-person-card-suspended" : ""
      }`}
    >
      <div className="cp-admin-card-top">
        <div className="cp-person-card-main">
          <Avatar person={person} size={58} />

          <div className="cp-person-identity">
            <div className="cp-person-name-row">
              <h3 title={fullName}>{fullName}</h3>

              {isRep ? (
                <span className="cp-role-badge cp-role-badge-rep">
                  <Icon name="crown" size={13} strokeWidth={2} />
                  Rep
                </span>
              ) : (
                <span
                  className={`cp-account-status ${
                    isSuspended
                      ? "cp-account-status-suspended"
                      : "cp-account-status-active"
                  }`}
                >
                  <span />
                  {isSuspended ? "Suspended" : "Active"}
                </span>
              )}
            </div>

            <span className="cp-person-username">@{person.username}</span>
          </div>
        </div>
      </div>

      <div className="cp-admin-details">
        <div className="cp-admin-detail">
          <span>Matric number</span>
          <strong>{person.matric_number || "Not added"}</strong>
        </div>

        <div className="cp-admin-detail">
          <span>Email</span>
          <strong title={person.email || ""}>
            {person.email || "Not added"}
          </strong>
        </div>
      </div>

      <div className="cp-person-card-meta">
        <span className="cp-level-badge">
          {person.level_label || `${person.level} Level`}
        </span>

        {isSuspended && (
          <span className="cp-suspended-label">Account restricted</span>
        )}
      </div>

      <div className="cp-admin-card-actions">
        {whatsappUrl ? (
          <a
            className="cp-whatsapp-button"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            title="Open WhatsApp chat with student"
          >
            <Icon name="message" size={15} strokeWidth={2} />
            WhatsApp
          </a>
        ) : (
          <div className="cp-whatsapp-button cp-whatsapp-disabled">
            <Icon name="phone" size={15} strokeWidth={2} />
            No phone
          </div>
        )}

        {!isRep && (
          <div className="cp-moderation-actions">
            <button
              type="button"
              className={`cp-small-action ${
                isSuspended
                  ? "cp-small-action-activate"
                  : "cp-small-action-suspend"
              }`}
              onClick={() => onToggleSuspend(person)}
            >
              <Icon
                name={isSuspended ? "play" : "pause"}
                size={14}
                strokeWidth={2}
              />
              {isSuspended ? "Reactivate" : "Suspend"}
            </button>

            <button
              type="button"
              className="cp-small-action cp-small-action-delete"
              onClick={() => onDeleteAccount(person)}
            >
              <Icon name="trash" size={14} strokeWidth={2} />
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------
   Classmates
------------------------------------------------------- */

function Classmates() {
  const currentRole = getRole();
  const isRepRole = currentRole === "CLASS_REP";

  const [classmates, setClassmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [search, setSearch] = useState("");

  const [suspendModal, setSuspendModal] = useState({
    open: false,
    person: null,
    processing: false,
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    person: null,
    processing: false,
  });

  const loadClassmates = async () => {
    setLoading(true);
    setError("");

    try {
      const [classmatesRes, profileRes] = await Promise.allSettled([
        api.get("/accounts/classmates/"),
        api.get("/accounts/profile/"),
      ]);

      if (classmatesRes.status === "fulfilled") {
        const raw = classmatesRes.value.data;
        const data = Array.isArray(raw) ? raw : raw?.results || [];
        setClassmates(data);
      } else {
        const err = classmatesRes.reason;
        if (!err?.response) {
          setError("Unable to connect to the server. Make sure the backend server is running.");
        } else {
          setError(
            err.response?.data?.detail ||
              "Unable to load your classmates. Please try again.",
          );
        }
      }

      if (profileRes.status === "fulfilled") {
        const p = profileRes.value.data;
        if (!p.department || !p.level) {
          setError(
            "Your department or current level is not set. Please update your profile to see your classmates.",
          );
        }
      }
    } catch {
      setError("An unexpected error occurred while loading your classmates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassmates();
  }, []);

  const handleToggleSuspendConfirm = async () => {
    if (!suspendModal.person) return;

    setSuspendModal((prev) => ({
      ...prev,
      processing: true,
    }));

    setError("");

    try {
      const response = await api.patch(
        `/accounts/classmates/${suspendModal.person.id}/toggle-suspend/`,
      );

      setSuccessNotice(
        response.data.detail || "Student account status updated.",
      );

      setClassmates((prev) =>
        prev.map((classmate) =>
          classmate.id === suspendModal.person.id
            ? {
                ...classmate,
                is_active: response.data.is_active,
              }
            : classmate,
        ),
      );

      setSuspendModal({
        open: false,
        person: null,
        processing: false,
      });

      setTimeout(() => setSuccessNotice(""), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to update student status.");

      setSuspendModal((prev) => ({
        ...prev,
        processing: false,
      }));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.person) return;

    setDeleteModal((prev) => ({
      ...prev,
      processing: true,
    }));

    setError("");

    try {
      const response = await api.delete(
        `/accounts/classmates/${deleteModal.person.id}/delete-account/`,
      );

      setSuccessNotice(
        response.data.detail || "Mistaken account deleted successfully.",
      );

      setClassmates((prev) =>
        prev.filter((classmate) => classmate.id !== deleteModal.person.id),
      );

      setDeleteModal({
        open: false,
        person: null,
        processing: false,
      });

      setTimeout(() => setSuccessNotice(""), 4000);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to delete student account.");

      setDeleteModal((prev) => ({
        ...prev,
        processing: false,
      }));
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return classmates;
    }

    return classmates.filter((person) => {
      return (
        person.first_name?.toLowerCase().includes(query) ||
        person.last_name?.toLowerCase().includes(query) ||
        person.username?.toLowerCase().includes(query) ||
        person.email?.toLowerCase().includes(query) ||
        person.matric_number?.toLowerCase().includes(query)
      );
    });
  }, [classmates, search]);

  const reps = filtered.filter((person) => person.role === "CLASS_REP");

  const students = filtered.filter((person) => person.role !== "CLASS_REP");

  return (
    <AppShell role={currentRole}>
      <div className="cp-directory-page">
        {/* -------------------------------------------
            Header
        -------------------------------------------- */}

        <header className="cp-directory-header">
          <div className="cp-directory-heading">
            <div className="cp-page-kicker">
              <span />
              Class community
            </div>

            <h1>Classmates</h1>

            <p>Find and connect with students in your department and level.</p>
          </div>

          <div className="cp-directory-header-stat">
            <span className="cp-directory-header-stat-icon">
              <Icon name="users" size={19} />
            </span>

            <div>
              <strong>{classmates.length}</strong>
              <span>{classmates.length === 1 ? "member" : "members"}</span>
            </div>
          </div>
        </header>

        {/* -------------------------------------------
            Notices
        -------------------------------------------- */}

        {successNotice && (
          <div
            className="cp-directory-notice cp-directory-notice-success"
            role="status"
          >
            <span className="cp-notice-icon">
              <Icon name="check" size={16} />
            </span>

            <span>{successNotice}</span>

            <button
              type="button"
              onClick={() => setSuccessNotice("")}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        {error && (
          <div
            className="cp-directory-notice cp-directory-notice-error"
            role="alert"
          >
            <span className="cp-notice-icon">
              <Icon name="warning" size={16} />
            </span>

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        {/* -------------------------------------------
            Toolbar
        -------------------------------------------- */}

        <section className="cp-directory-toolbar">
          <div className="cp-directory-search">
            <Icon name="search" size={18} />

            <input
              type="text"
              placeholder={
                isRepRole
                  ? "Search name, username, matric or email..."
                  : "Search classmates by name or username..."
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search classmates"
            />

            {search && (
              <button
                type="button"
                className="cp-directory-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </div>

          <div className="cp-directory-toolbar-actions">
            <span className="cp-directory-result-count">
              <strong>{filtered.length}</strong>
              <span>{filtered.length === 1 ? "result" : "results"}</span>
            </span>

            <button
              type="button"
              className="cp-directory-refresh"
              onClick={loadClassmates}
              disabled={loading}
            >
              <Icon name="refresh" size={15} strokeWidth={2.2} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </section>

        {/* -------------------------------------------
            Loading
        -------------------------------------------- */}

        {loading ? (
          <div className="cp-directory-loading">
            <LoadingSkeleton rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          /* -----------------------------------------
             Empty state
          ------------------------------------------ */

          <section className="cp-directory-empty">
            <div className="cp-directory-empty-icon">
              <Icon name="users" size={29} />
            </div>

            <h2>
              {search ? "No classmates found" : "Your class directory is empty"}
            </h2>

            <p>
              {search
                ? "Try a different name, username or matric number."
                : "Students will appear here after joining your class with the correct class code."}
            </p>

            {search && (
              <button
                type="button"
                className="cp-directory-empty-button"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            )}
          </section>
        ) : (
          <div className="cp-directory-sections">
            {/* ---------------------------------------
                Class Representatives
            ---------------------------------------- */}

            {reps.length > 0 && (
              <section className="cp-directory-section">
                <div className="cp-directory-section-heading">
                  <div>
                    <div className="cp-section-label">
                      <Icon name="crown" size={14} strokeWidth={2} />
                      Leadership
                    </div>

                    <h2>
                      Class Representative
                      {reps.length > 1 ? "s" : ""}
                    </h2>
                  </div>

                  <span className="cp-section-count cp-section-count-gold">
                    {reps.length}
                  </span>
                </div>

                <div className="cp-directory-grid">
                  {reps.map((person) =>
                    isRepRole ? (
                      <RepCard
                        key={person.id}
                        person={person}
                        onToggleSuspend={(target) =>
                          setSuspendModal({
                            open: true,
                            person: target,
                            processing: false,
                          })
                        }
                        onDeleteAccount={(target) =>
                          setDeleteModal({
                            open: true,
                            person: target,
                            processing: false,
                          })
                        }
                      />
                    ) : (
                      <StudentCard key={person.id} person={person} />
                    ),
                  )}
                </div>
              </section>
            )}

            {/* ---------------------------------------
                Students
            ---------------------------------------- */}

            {students.length > 0 && (
              <section className="cp-directory-section">
                <div className="cp-directory-section-heading">
                  <div>
                    <div className="cp-section-label">
                      <Icon name="users" size={14} strokeWidth={2} />
                      Students
                    </div>

                    <h2>All Classmates</h2>
                  </div>

                  <span className="cp-section-count">{students.length}</span>
                </div>

                <div className="cp-directory-grid">
                  {students.map((person) =>
                    isRepRole ? (
                      <RepCard
                        key={person.id}
                        person={person}
                        onToggleSuspend={(target) =>
                          setSuspendModal({
                            open: true,
                            person: target,
                            processing: false,
                          })
                        }
                        onDeleteAccount={(target) =>
                          setDeleteModal({
                            open: true,
                            person: target,
                            processing: false,
                          })
                        }
                      />
                    ) : (
                      <StudentCard key={person.id} person={person} />
                    ),
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* -------------------------------------------
            Suspend / Reactivate modal
        -------------------------------------------- */}

        {suspendModal.open && suspendModal.person && (
          <div
            className="cp-directory-modal-backdrop"
            onClick={() =>
              !suspendModal.processing &&
              setSuspendModal({
                open: false,
                person: null,
                processing: false,
              })
            }
          >
            <div
              className="cp-directory-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="cp-modal-icon cp-modal-icon-warning">
                <Icon name="warning" size={22} />
              </div>

              <div className="cp-modal-content">
                <div className="cp-modal-heading">
                  <h3>
                    {suspendModal.person.is_active === false
                      ? "Reactivate account?"
                      : "Suspend student account?"}
                  </h3>

                  <p>
                    {suspendModal.person.first_name}{" "}
                    {suspendModal.person.last_name}
                    {" · "}@{suspendModal.person.username}
                  </p>
                </div>

                <div className="cp-modal-message">
                  {suspendModal.person.is_active === false
                    ? "Reactivating this account will restore the student’s access to attendance, announcements and class activities."
                    : "Suspending this account will temporarily block the student from attendance and class portal activities until reactivated."}
                </div>

                <div className="cp-modal-actions">
                  <button
                    type="button"
                    className="cp-modal-button cp-modal-button-secondary"
                    disabled={suspendModal.processing}
                    onClick={() =>
                      setSuspendModal({
                        open: false,
                        person: null,
                        processing: false,
                      })
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={`cp-modal-button ${
                      suspendModal.person.is_active === false
                        ? "cp-modal-button-primary"
                        : "cp-modal-button-danger"
                    }`}
                    disabled={suspendModal.processing}
                    onClick={handleToggleSuspendConfirm}
                  >
                    {suspendModal.processing
                      ? "Updating..."
                      : suspendModal.person.is_active === false
                        ? "Reactivate account"
                        : "Suspend account"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------
            Delete modal
        -------------------------------------------- */}

        {deleteModal.open && deleteModal.person && (
          <div
            className="cp-directory-modal-backdrop"
            onClick={() =>
              !deleteModal.processing &&
              setDeleteModal({
                open: false,
                person: null,
                processing: false,
              })
            }
          >
            <div
              className="cp-directory-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="cp-modal-icon cp-modal-icon-danger">
                <Icon name="trash" size={21} />
              </div>

              <div className="cp-modal-content">
                <div className="cp-modal-heading">
                  <h3>Delete mistaken account?</h3>

                  <p>
                    {deleteModal.person.first_name}{" "}
                    {deleteModal.person.last_name}
                    {" · "}@{deleteModal.person.username}
                  </p>
                </div>

                <div className="cp-modal-danger-message">
                  <strong>Permanent action</strong>

                  <span>
                    Use this only for duplicate or mistakenly registered
                    accounts. The account and its associated attendance/profile
                    data will be permanently deleted.
                  </span>
                </div>

                <div className="cp-modal-actions">
                  <button
                    type="button"
                    className="cp-modal-button cp-modal-button-secondary"
                    disabled={deleteModal.processing}
                    onClick={() =>
                      setDeleteModal({
                        open: false,
                        person: null,
                        processing: false,
                      })
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="cp-modal-button cp-modal-button-danger"
                    disabled={deleteModal.processing}
                    onClick={handleDeleteConfirm}
                  >
                    {deleteModal.processing ? "Deleting..." : "Delete account"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default Classmates;
