import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function AssignmentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function AnnouncementIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11v2a2 2 0 0 0 2 2h2l3 5h2l-1.7-5H12l8 4V5l-8 4H5a2 2 0 0 0-2 2Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.1-1.2-6.1-3.5-8.3Z" />
      <path d="M8.7 7.2c.2-.4.4-.4.7-.4h.6c.2 0 .5.1.6.5l.9 2.1c.1.3.1.5-.1.7l-.6.8c-.2.2-.2.4 0 .7.3.5 1 1.6 2.2 2.5 1.1.8 2 .9 2.4 1 .3.1.5 0 .7-.2l.8-1c.2-.2.4-.3.7-.2l2.1 1c.3.1.4.3.4.6 0 .3-.1 1.2-.6 1.6-.5.5-1.2.7-2 .7-.7 0-1.6-.2-2.8-.7-1.1-.5-2.4-1.2-3.7-2.4-1.1-1-1.9-2.2-2.4-3-.5-.8-.8-1.7-.8-2.3 0-.8.3-1.5.7-2Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function getCategoryDetails(category) {
  switch (category) {
    case "ASSIGNMENT":
      return {
        label: "Assignment",
        icon: AssignmentIcon,
        className: "assignment",
      };

    case "VENUE_CHANGE":
      return {
        label: "Venue change",
        icon: LocationIcon,
        className: "venue",
      };

    default:
      return {
        label: "Department update",
        icon: AnnouncementIcon,
        className: "general",
      };
  }
}

function StudentAnnouncements() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = async () => {
    setLoading(true);

    try {
      const response = await api.get("/attendance/announcements/");
      setItems(response.data || []);
    } catch {
      // Keep the existing behavior: silently handle request failure.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((announcement) => {
      const matchesCategory =
        category === "ALL" || announcement.category === category;

      const matchesSearch =
        !normalizedSearch ||
        announcement.title?.toLowerCase().includes(normalizedSearch) ||
        announcement.body?.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [items, category, search]);

  const counts = useMemo(
    () => ({
      ALL: items.length,
      ASSIGNMENT: items.filter((item) => item.category === "ASSIGNMENT").length,
      VENUE_CHANGE: items.filter((item) => item.category === "VENUE_CHANGE")
        .length,
      GENERAL: items.filter((item) => item.category === "GENERAL").length,
    }),
    [items],
  );

  const shareToWhatsApp = (announcement) => {
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
      `\n\n— Shared via CampusPulse`;

    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <AppShell role="STUDENT">
      <div className="cp-student-announcements">
        <header className="cp-announcements-header">
          <div>
            <span className="cp-page-eyebrow">
              <span />
              Department updates
            </span>

            <h1>Announcements</h1>

            <p>
              Important updates, assignments and venue changes from your class
              representative.
            </p>
          </div>

          <button
            type="button"
            className="cp-announcements-refresh"
            onClick={loadAnnouncements}
            disabled={loading}
          >
            <RefreshIcon />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        <section className="cp-announcements-summary">
          <div className="cp-announcements-summary-icon">
            <AnnouncementIcon />
          </div>

          <div>
            <strong>
              {items.length === 1
                ? "1 class update"
                : `${items.length} class updates`}
            </strong>

            <span>
              {filteredItems.length !== items.length
                ? `${filteredItems.length} matching your current filters`
                : "Latest communication from your class workspace"}
            </span>
          </div>
        </section>

        <div className="cp-announcements-toolbar">
          <div className="cp-announcements-search">
            <SearchIcon />

            <input
              type="search"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search announcements"
            />

            {search && (
              <button
                type="button"
                className="cp-announcements-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div
            className="cp-announcements-filters"
            role="tablist"
            aria-label="Announcement categories"
          >
            <button
              type="button"
              role="tab"
              aria-selected={category === "ALL"}
              className={`cp-announcement-filter ${
                category === "ALL" ? "active" : ""
              }`}
              onClick={() => setCategory("ALL")}
            >
              All
              <span>{counts.ALL}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={category === "ASSIGNMENT"}
              className={`cp-announcement-filter ${
                category === "ASSIGNMENT" ? "active" : ""
              }`}
              onClick={() => setCategory("ASSIGNMENT")}
            >
              <AssignmentIcon />
              Assignments
              <span>{counts.ASSIGNMENT}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={category === "VENUE_CHANGE"}
              className={`cp-announcement-filter ${
                category === "VENUE_CHANGE" ? "active" : ""
              }`}
              onClick={() => setCategory("VENUE_CHANGE")}
            >
              <LocationIcon />
              Venue changes
              <span>{counts.VENUE_CHANGE}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={category === "GENERAL"}
              className={`cp-announcement-filter ${
                category === "GENERAL" ? "active" : ""
              }`}
              onClick={() => setCategory("GENERAL")}
            >
              <AnnouncementIcon />
              General
              <span>{counts.GENERAL}</span>
            </button>
          </div>
        </div>

        <main className="cp-announcements-list">
          {loading ? (
            <section className="cp-announcements-loading">
              <LoadingSkeleton rows={4} />
            </section>
          ) : filteredItems.length === 0 ? (
            <section className="cp-announcements-empty">
              <div className="cp-announcements-empty-icon">
                <AnnouncementIcon />
              </div>

              <span className="cp-page-eyebrow">Nothing to show</span>

              <h2>No announcements found</h2>

              <p>
                {search
                  ? "No announcements match your search. Try a different term."
                  : "Your class representative has not posted any updates in this category yet."}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="cp-announcements-empty-action"
                >
                  Clear search
                </button>
              )}
            </section>
          ) : (
            filteredItems.map((announcement, index) => {
              const details = getCategoryDetails(announcement.category);

              const CategoryIcon = details.icon;

              return (
                <article
                  className={`cp-announcement-card ${details.className}`}
                  key={announcement.id}
                  style={{
                    "--cp-announcement-index": index,
                  }}
                >
                  <div className="cp-announcement-card-top">
                    <div className="cp-announcement-category">
                      <span>
                        <CategoryIcon />
                      </span>

                      {details.label}
                    </div>

                    <time>
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </time>
                  </div>

                  <div className="cp-announcement-card-body">
                    <h2>{announcement.title}</h2>

                    <p>{announcement.body}</p>

                    {announcement.due_date && (
                      <div className="cp-announcement-deadline">
                        <span>
                          <ClockIcon />
                        </span>

                        <div>
                          <small>Submission deadline</small>

                          <strong>
                            {new Date(
                              announcement.due_date,
                            ).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="cp-announcement-card-footer">
                    <span className="cp-announcement-source">
                      CampusPulse class update
                    </span>

                    <button
                      type="button"
                      className="cp-announcement-share"
                      onClick={() => shareToWhatsApp(announcement)}
                    >
                      <WhatsAppIcon />
                      Share on WhatsApp
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </main>
      </div>
    </AppShell>
  );
}

export default StudentAnnouncements;
