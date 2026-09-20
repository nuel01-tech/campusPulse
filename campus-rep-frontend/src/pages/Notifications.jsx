import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api/axios";
import LoadingSkeleton from "../components/LoadingSkeleton";

const getNotificationMeta = (type) => {
  switch (type) {
    case "SESSION":
      return {
        label: "Session",
        icon: "◉",
        className: "session",
      };

    case "ANNOUNCEMENT":
      return {
        label: "Announcement",
        icon: "✦",
        className: "announcement",
      };

    default:
      return {
        label: "System",
        icon: "i",
        className: "system",
      };
  }
};

function Notifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    setLoading(true);

    try {
      const r = await api.get("/attendance/notifications/");
      setItems(r.data || []);
      setError("");
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mark = async (id) => {
    try {
      await api.patch(`/attendance/notifications/${id}/read/`);

      setItems((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification,
        ),
      );
    } catch {
      setError("Unable to update this notification.");
    }
  };

  const all = async () => {
    try {
      await api.patch("/attendance/notifications/read-all/");

      setItems((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );
    } catch {
      setError("Unable to mark notifications as read.");
    }
  };

  const enable = async () => {
    setEnabling(true);
    setError("");

    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        throw new Error("Browser notifications are not supported here.");
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const reg = await navigator.serviceWorker.ready;

      const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!key) {
        throw new Error("Push key is not configured.");
      }

      const padding = "=".repeat((4 - (key.length % 4)) % 4);

      const raw = atob((key + padding).replace(/-/g, "+").replace(/_/g, "/"));

      const appKey = Uint8Array.from(
        [...raw].map((character) => character.charCodeAt(0)),
      );

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appKey,
      });

      await api.post("/accounts/save-subscription/", sub.toJSON());

      await load();
    } catch (e) {
      setError(e.message || "Could not enable notifications.");
    } finally {
      setEnabling(false);
    }
  };

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    if (filter === "UNREAD") {
      return items.filter((item) => !item.is_read);
    }

    if (filter === "SESSION") {
      return items.filter((item) => item.type === "SESSION");
    }

    if (filter === "ANNOUNCEMENT") {
      return items.filter((item) => item.type === "ANNOUNCEMENT");
    }

    return items;
  }, [items, filter]);

  return (
    <AppShell>
      <div className="cp-notifications-page">
        {/* =====================================================
            PAGE HEADER
            ===================================================== */}
        <header className="cp-notifications-header">
          <div className="cp-notifications-heading">
            <span className="cp-page-eyebrow">Communication</span>

            <div className="cp-notifications-title-row">
              <div>
                <h1>Notifications</h1>

                <p>
                  Stay up to date with sessions, announcements and important
                  account activity.
                </p>
              </div>

              {unreadCount > 0 && (
                <span className="cp-notifications-total">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="cp-notifications-enable"
            onClick={enable}
            disabled={enabling}
          >
            <span className="cp-notifications-enable-icon">
              {enabling ? "…" : "•"}
            </span>

            <span>
              {enabling ? "Enabling alerts…" : "Enable browser alerts"}
            </span>
          </button>
        </header>

        {/* =====================================================
            ERROR
            ===================================================== */}
        {error && (
          <div className="cp-notifications-alert" role="alert">
            <span className="cp-notifications-alert-icon">!</span>

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* =====================================================
            INBOX
            ===================================================== */}
        <section className="cp-notifications-panel">
          <div className="cp-notifications-panel-header">
            <div>
              <span className="cp-page-eyebrow">Your inbox</span>

              <h2>Activity</h2>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="cp-notifications-mark-all"
                onClick={all}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* =================================================
              FILTERS
              ================================================= */}
          <div className="cp-notifications-toolbar">
            <div
              className="cp-notifications-filters"
              role="tablist"
              aria-label="Notification filters"
            >
              <button
                type="button"
                className={filter === "ALL" ? "active" : ""}
                onClick={() => setFilter("ALL")}
              >
                All
                <span>{items.length}</span>
              </button>

              <button
                type="button"
                className={filter === "UNREAD" ? "active" : ""}
                onClick={() => setFilter("UNREAD")}
              >
                Unread
                <span>{unreadCount}</span>
              </button>

              <button
                type="button"
                className={filter === "SESSION" ? "active" : ""}
                onClick={() => setFilter("SESSION")}
              >
                Sessions
              </button>

              <button
                type="button"
                className={filter === "ANNOUNCEMENT" ? "active" : ""}
                onClick={() => setFilter("ANNOUNCEMENT")}
              >
                Announcements
              </button>
            </div>
          </div>

          {/* =================================================
              LOADING
              ================================================= */}
          {loading ? (
            <div className="cp-notifications-loading">
              <LoadingSkeleton rows={5} />
            </div>
          ) : filteredItems.length === 0 ? (
            /* ===============================================
               EMPTY
               =============================================== */
            <div className="cp-notifications-empty">
              <div className="cp-notifications-empty-mark">
                <span>✓</span>
              </div>

              <span className="cp-page-eyebrow">All clear</span>

              <h3>
                {filter === "UNREAD"
                  ? "You are all caught up."
                  : "No notifications yet."}
              </h3>

              <p>
                {filter === "UNREAD"
                  ? "There are no unread updates waiting for you."
                  : "Session activity and class announcements will appear here when they are available."}
              </p>

              {filter !== "ALL" && (
                <button
                  type="button"
                  className="cp-notifications-empty-action"
                  onClick={() => setFilter("ALL")}
                >
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            /* ===============================================
               LIST
               =============================================== */
            <div className="cp-notification-list">
              {filteredItems.map((notification, index) => {
                const meta = getNotificationMeta(notification.type);

                return (
                  <button
                    type="button"
                    className={`cp-notification-item ${
                      notification.is_read ? "is-read" : "is-unread"
                    }`}
                    key={notification.id}
                    onClick={() =>
                      !notification.is_read && mark(notification.id)
                    }
                    style={{
                      "--cp-notification-index": index,
                    }}
                  >
                    <span
                      className={`cp-notification-icon ${meta.className}`}
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </span>

                    <span className="cp-notification-content">
                      <span className="cp-notification-topline">
                        <span className="cp-notification-type">
                          {meta.label}
                        </span>

                        {!notification.is_read && (
                          <span className="cp-notification-unread-label">
                            New
                          </span>
                        )}
                      </span>

                      <strong>{notification.title}</strong>

                      <span className="cp-notification-body">
                        {notification.body}
                      </span>

                      <time>
                        {new Date(notification.created_at).toLocaleString()}
                      </time>
                    </span>

                    {!notification.is_read && (
                      <span
                        className="cp-notification-dot"
                        aria-label="Unread"
                      />
                    )}

                    <span className="cp-notification-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default Notifications;
