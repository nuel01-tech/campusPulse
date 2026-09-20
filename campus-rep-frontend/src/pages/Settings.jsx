import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";
import AppShell from "../components/AppShell";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5v16" />
      <path d="M8 7h8" />
      <path d="M8 11h7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function Settings() {
  const [profile, setProfile] = useState(null);

  let user = {};

  try {
    const token = localStorage.getItem("access");
    user = token ? jwtDecode(token) : {};
  } catch {}

  const role = user.role === "CLASS_REP" ? "CLASS_REP" : "STUDENT";

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await api.get("/accounts/profile/");

        if (mounted) {
          setProfile(response.data);
        }
      } catch {
        // Keep JWT information as the fallback.
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const username = profile?.username || user.username || "Student";

  const firstName = profile?.first_name || username;

  const email = profile?.email || "";

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <AppShell role={role}>
      <div className="cp-settings-home">
        <header className="cp-settings-home-header">
          <div>
            <span className="cp-settings-eyebrow">
              <span className="cp-settings-eyebrow-dot" />
              Account
            </span>

            <h1>Settings</h1>

            <p>
              Manage your profile, security and notification preferences from
              one place.
            </p>
          </div>
        </header>

        <section className="cp-settings-account">
          <div className="cp-settings-account-avatar">{initials}</div>

          <div className="cp-settings-account-info">
            <span className="cp-settings-account-label">Signed in as</span>

            <h2>{firstName}</h2>

            <p>
              {role === "CLASS_REP"
                ? "Class representative account"
                : "Student account"}
              {email ? ` · ${email}` : ""}
            </p>
          </div>

          <Link to="/profile" className="cp-settings-account-action">
            View profile
            <ArrowIcon />
          </Link>
        </section>

        <div className="cp-settings-home-grid">
          <Link to="/profile" className="cp-settings-option">
            <span className="cp-settings-option-icon profile">
              <UserIcon />
            </span>

            <span className="cp-settings-option-content">
              <strong>Profile details</strong>
              <span>Manage your academic and contact information.</span>
            </span>

            <ArrowIcon />
          </Link>

          <Link to="/security" className="cp-settings-option">
            <span className="cp-settings-option-icon security">
              <LockIcon />
            </span>

            <span className="cp-settings-option-content">
              <strong>Security &amp; password</strong>
              <span>Change your password and protect your account.</span>
            </span>

            <ArrowIcon />
          </Link>

          <Link to="/preferences" className="cp-settings-option">
            <span className="cp-settings-option-icon preferences">
              <BellIcon />
            </span>

            <span className="cp-settings-option-content">
              <strong>Notification preferences</strong>
              <span>Choose which alerts and updates you receive.</span>
            </span>

            <ArrowIcon />
          </Link>

          <Link to="/documents" className="cp-settings-option">
            <span className="cp-settings-option-icon documents">
              <BookIcon />
            </span>

            <span className="cp-settings-option-content">
              <strong>Class documents</strong>
              <span>Access course materials and shared documents.</span>
            </span>

            <ArrowIcon />
          </Link>
        </div>

        <section className="cp-settings-help">
          <div>
            <span className="cp-settings-help-label">Account settings</span>

            <h2>Keep your information up to date.</h2>

            <p>
              Accurate academic and contact information helps CampusPulse
              maintain reliable attendance records and communication.
            </p>
          </div>

          <Link to="/profile" className="cp-settings-help-button">
            Review profile
            <ArrowIcon />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

export default Settings;
