import { useEffect, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";

function AnnouncementIcon({ type }) {
  if (type === "ASSIGNMENT") {
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (type === "VENUE_CHANGE") {
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5h16v12H7l-3 3V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" />
      <path d="M8.8 8.2c.2-.4.4-.4.7-.4h.4c.2 0 .4.1.5.4l.7 1.5c.1.2.1.4-.1.6l-.5.6c.5.9 1.2 1.6 2.1 2.1l.6-.5c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.4c0 .3 0 .5-.4.7-.4.2-1.2.3-2.1-.1-1.1-.5-2.2-1.3-3.1-2.2-.9-.9-1.7-2-2.2-3.1-.4-.9-.3-1.7-.1-2.1Z" />
    </svg>
  );
}

function RepAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [dueDate, setDueDate] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = async () => {
    setLoading(true);

    try {
      const r = await api.get("/attendance/announcements/");
      setAnnouncements(r.data || []);
      setError("");
    } catch {
      setError("Unable to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();

    setError("");
    setNotice("");
    setIsPosting(true);

    try {
      await api.post("/attendance/announcements/create/", {
        title,
        body,
        category,
        due_date: category === "ASSIGNMENT" && dueDate ? dueDate : null,
      });

      setTitle("");
      setBody("");
      setDueDate("");
      setCategory("GENERAL");

      setNotice("Announcement published to all class members.");

      setShowComposer(false);

      await loadAnnouncements();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to post announcement.");
    } finally {
      setIsPosting(false);
    }
  };

  const closeComposer = () => {
    if (isPosting) return;

    setShowComposer(false);
    setError("");
  };

  const broadcastToWhatsApp = (announcement) => {
    const text =
      `📢 *${announcement.title}*\n\n` +
      `${announcement.body}` +
      `${
        announcement.due_date
          ? `\n\n⏳ *Due Date:* ${new Date(
              announcement.due_date,
            ).toLocaleDateString()}`
          : ""
      }` +
      `\n\n— Class Rep Announcement via CampusPulse`;

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  const getCategoryLabel = (value) => {
    if (value === "ASSIGNMENT") return "Assignment";
    if (value === "VENUE_CHANGE") return "Venue / Time Change";
    return "General Notice";
  };

  return (
    <AppShell role="CLASS_REP">
      <div className="cp-rep-announcements-page">
        {/* Header */}
        <header className="cp-announcements-header">
          <div>
            <span className="cp-page-eyebrow">Class communication</span>

            <h1>Announcements</h1>

            <p>
              Publish verified class updates, assignments, deadlines and venue
              changes from one place.
            </p>
          </div>

          <div className="cp-announcements-header-actions">
            <button
              type="button"
              className="cp-announcements-refresh"
              onClick={loadAnnouncements}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span>
              {loading ? "Loading…" : "Refresh"}
            </button>

            <button
              type="button"
              className="cp-announcements-new"
              onClick={() => {
                setShowComposer((current) => !current);
                setError("");
              }}
            >
              <span>
                {showComposer ? "Close composer" : "New announcement"}
              </span>

              {!showComposer && <span aria-hidden="true">+</span>}
            </button>
          </div>
        </header>

        {(notice || error) && (
          <div
            className={`cp-announcements-feedback ${
              notice ? "success" : "error"
            }`}
            role={error ? "alert" : "status"}
          >
            <span className="cp-announcements-feedback-mark">
              {notice ? "✓" : "!"}
            </span>

            <span>{notice || error}</span>
          </div>
        )}

        {/* Composer */}
        {showComposer && (
          <section className="cp-announcement-composer">
            <div className="cp-composer-header">
              <div>
                <span className="cp-page-eyebrow">Composer</span>

                <h2>Publish a class update</h2>

                <p>
                  Keep the message clear and specific so students can act on it
                  quickly.
                </p>
              </div>

              <button
                type="button"
                className="cp-composer-close"
                onClick={closeComposer}
                disabled={isPosting}
                aria-label="Close announcement composer"
              >
                ×
              </button>
            </div>

            <form className="cp-announcement-form" onSubmit={handlePost}>
              <div className="cp-announcement-form-grid">
                <label>
                  <span>Category</span>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="GENERAL">General Notice</option>

                    <option value="ASSIGNMENT">Assignment</option>

                    <option value="VENUE_CHANGE">Venue / Time Change</option>
                  </select>
                </label>

                {category === "ASSIGNMENT" && (
                  <label>
                    <span>Due date</span>

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </label>
                )}
              </div>

              <label>
                <span>Title</span>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CSC 202 Assignment 1"
                  maxLength={180}
                  required
                />
              </label>

              <label>
                <span>Message</span>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="Write the information your classmates need to know..."
                  required
                />
              </label>

              <div className="cp-composer-footer">
                <span>
                  This announcement will be available to authenticated class
                  members.
                </span>

                <div className="cp-composer-actions">
                  <button
                    type="button"
                    className="cp-composer-cancel"
                    onClick={closeComposer}
                    disabled={isPosting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="cp-composer-submit"
                    disabled={isPosting}
                  >
                    {isPosting ? "Publishing…" : "Publish announcement"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* Announcement repository */}
        <section className="cp-announcements-section">
          <div className="cp-announcements-section-head">
            <div>
              <span className="cp-page-eyebrow">Published</span>

              <h2>Class announcements</h2>
            </div>

            {!loading && (
              <span className="cp-announcements-count">
                {announcements.length}{" "}
                {announcements.length === 1 ? "announcement" : "announcements"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="cp-announcements-loading">
              <LoadingSkeleton rows={4} />
            </div>
          ) : announcements.length === 0 ? (
            <div className="cp-announcements-empty">
              <div className="cp-announcements-empty-icon">
                <AnnouncementIcon type="GENERAL" />
              </div>

              <h3>No announcements posted yet</h3>

              <p>
                Share important course information, venue changes or assignment
                deadlines with your class.
              </p>

              <button
                type="button"
                className="cp-empty-create"
                onClick={() => setShowComposer(true)}
              >
                Write first announcement
              </button>
            </div>
          ) : (
            <div className="cp-announcement-list">
              {announcements.map((announcement) => (
                <article className="cp-announcement-card" key={announcement.id}>
                  <div className="cp-announcement-card-top">
                    <div className="cp-announcement-category">
                      <span className="cp-announcement-category-icon">
                        <AnnouncementIcon type={announcement.category} />
                      </span>

                      <span>{getCategoryLabel(announcement.category)}</span>
                    </div>

                    <time dateTime={announcement.created_at}>
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </time>
                  </div>

                  <div className="cp-announcement-card-body">
                    <h3>{announcement.title}</h3>

                    <p>{announcement.body}</p>
                  </div>

                  {announcement.due_date && (
                    <div className="cp-announcement-deadline">
                      <span className="cp-deadline-mark">⏳</span>

                      <span>
                        <strong>Deadline</strong>

                        {new Date(announcement.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="cp-announcement-card-footer">
                    <span className="cp-announcement-source">
                      Published by class representative
                    </span>

                    <button
                      type="button"
                      className="cp-whatsapp-button"
                      onClick={() => broadcastToWhatsApp(announcement)}
                    >
                      <WhatsAppIcon />
                      <span>Broadcast to WhatsApp</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default RepAnnouncements;
