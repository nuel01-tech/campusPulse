import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import "./AdminDashboard.css";

const LEVELS = ["100", "200", "300", "400", "500"];
const ROLES = [
  ["STUDENT", "Student"],
  ["CLASS_REP", "Class representative"],
];

function getErrorMessage(error, fallback) {
  const data = error.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const firstError = Object.values(data).flat()[0];
    if (typeof firstError === "string") return firstError;
  }
  return fallback;
}

function AdminDashboard() {
  const location = useLocation();
  const section = location.pathname.split("/")[2] || "overview";

  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState({ count: 0, next: null, previous: null });
  const [departments, setDepartments] = useState([]);
  const [classCodes, setClassCodes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [lecturerApprovals, setLecturerApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userDrafts, setUserDrafts] = useState({});
  const [departmentDrafts, setDepartmentDrafts] = useState({});
  const [newDepartment, setNewDepartment] = useState({ name: "", faculty: "" });
  const [newCode, setNewCode] = useState({ department: "", level: "100" });
  const [announcementDrafts, setAnnouncementDrafts] = useState({});
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    body: "",
    department: "",
    level: "100",
    category: "GENERAL",
    due_date: "",
  });
  const [documentForm, setDocumentForm] = useState({
    title: "",
    description: "",
    course_code: "",
    department: "",
    level: "100",
  });
  const [documentFile, setDocumentFile] = useState(null);
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [adminActionId, setAdminActionId] = useState(null);
  const documentInputRef = useRef(null);

  const title = useMemo(
    () =>
      ({
        overview: "Owner dashboard",
        users: "User management",
        departments: "Departments",
        classes: "Class codes",
        sessions: "Attendance sessions",
        announcements: "Announcements",
        documents: "Documents",
        audit: "Audit history",
        lecturers: "Lecturer approvals",
      })[section] || "Owner dashboard",
    [section],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/accounts/admin/summary/"),
      api.get("/accounts/admin/departments/"),
      api.get("/accounts/admin/class-codes/"),
      api.get("/accounts/admin/sessions/"),
      api.get("/accounts/admin/announcements/"),
      api.get("/accounts/admin/documents/"),
      api.get("/accounts/admin/audit/"),
    ])
      .then(([summaryResponse, departmentResponse, codeResponse, sessionResponse, announcementResponse, documentResponse, auditResponse]) => {
        if (cancelled) return;
        setSummary(summaryResponse.data);
        setDepartments(departmentResponse.data);
        setClassCodes(codeResponse.data);
        setSessions(sessionResponse.data);
        setAnnouncements(announcementResponse.data);
        setDocuments(documentResponse.data);
        setAuditEvents(auditResponse.data);
        setError("");
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError, "Unable to load administration data."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setUsersLoading(true);
      try {
        const response = await api.get("/accounts/admin/users/", {
          params: { search, page, page_size: 50 },
        });
        if (cancelled) return;
        setUsers(response.data.results);
        setUsersPage({
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
        });
        setUserDrafts({});
      } catch (requestError) {
        if (!cancelled) {
          setError(getErrorMessage(requestError, "Unable to load accounts."));
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, page]);

  useEffect(() => {
    if (section !== "audit") return;
    let cancelled = false;
    api.get("/accounts/admin/audit/")
      .then((response) => {
        if (!cancelled) setAuditEvents(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError, "Unable to load audit history."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  useEffect(() => {
    if (section !== "lecturers") return;
    let cancelled = false;
    api.get("/accounts/admin/lecturers/pending/")
      .then((response) => {
        if (!cancelled) setLecturerApprovals(response.data || []);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError, "Unable to load lecturer applications."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        summaryResponse,
        departmentResponse,
        codeResponse,
        sessionResponse,
        announcementResponse,
        documentResponse,
        auditResponse,
      ] = await Promise.all([
        api.get("/accounts/admin/summary/"),
        api.get("/accounts/admin/departments/"),
        api.get("/accounts/admin/class-codes/"),
        api.get("/accounts/admin/sessions/"),
        api.get("/accounts/admin/announcements/"),
        api.get("/accounts/admin/documents/"),
        api.get("/accounts/admin/audit/"),
      ]);
      setSummary(summaryResponse.data);
      setDepartments(departmentResponse.data);
      setClassCodes(codeResponse.data);
      setSessions(sessionResponse.data);
      setAnnouncements(announcementResponse.data);
      setDocuments(documentResponse.data);
      setAuditEvents(auditResponse.data);
      setNotice("Workspace refreshed.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to refresh administration data."));
    } finally {
      setLoading(false);
    }
  };

  const updateUserDraft = (user, field, value) => {
    setUserDrafts((current) => ({
      ...current,
      [user.id]: { ...user, ...current[user.id], [field]: value },
    }));
  };

  const saveUser = async (user, changes = userDrafts[user.id]) => {
    if (!changes) return;
    setError("");
    setNotice("");
    try {
      const response = await api.patch(`/accounts/admin/users/${user.id}/`, changes);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? response.data.user : item)),
      );
      setUserDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setNotice(response.data.detail);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to update this account."));
    }
  };

  const approveLecturer = async (lecturer) => {
    setAdminActionId(`approve-${lecturer.id}`);
    setError("");
    setNotice("");
    try {
      const response = await api.post(
        `/accounts/admin/lecturers/${lecturer.id}/approve/`,
      );
      setLecturerApprovals((current) =>
        current.filter((item) => item.id !== lecturer.id),
      );
      setNotice(response.data.detail);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to approve this lecturer."));
    } finally {
      setAdminActionId(null);
    }
  };

  const removeUserPasskeys = async (user) => {
    if (
      !window.confirm(
        `Remove all registered passkeys for ${user.first_name} ${user.last_name || user.username}? They will need to register a passkey again.`,
      )
    ) {
      return;
    }
    setAdminActionId(`passkeys-${user.id}`);
    setError("");
    setNotice("");
    try {
      const response = await api.delete(
        `/accounts/admin/users/${user.id}/passkeys/`,
      );
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, passkey_count: 0 } : item,
        ),
      );
      setNotice(response.data.detail);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to remove this user's passkeys."));
    } finally {
      setAdminActionId(null);
    }
  };

  const createDepartment = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await api.post("/accounts/admin/departments/", newDepartment);
      setDepartments((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDepartment({ name: "", faculty: "" });
      setNotice("Department created.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create department."));
    }
  };

  const saveDepartment = async (department) => {
    const changes = departmentDrafts[department.id];
    if (!changes) return;
    setError("");
    try {
      const response = await api.patch(
        `/accounts/admin/departments/${department.id}/`,
        changes,
      );
      setDepartments((current) =>
        current.map((item) => (item.id === department.id ? response.data : item)),
      );
      setUsers((current) =>
        current.map((item) =>
          item.department === department.id
            ? { ...item, department_name: response.data.name }
            : item,
        ),
      );
      setClassCodes((current) =>
        current.map((item) =>
          item.department === department.id
            ? { ...item, department_name: response.data.name }
            : item,
        ),
      );
      setSessions((current) =>
        current.map((item) =>
          item.department === department.id
            ? { ...item, department_name: response.data.name }
            : item,
        ),
      );
      setAnnouncements((current) =>
        current.map((item) =>
          item.department === department.id
            ? { ...item, department_name: response.data.name }
            : item,
        ),
      );
      setDocuments((current) =>
        current.map((item) =>
          item.department === department.id
            ? { ...item, department_name: response.data.name }
            : item,
        ),
      );
      setDepartmentDrafts((current) => {
        const next = { ...current };
        delete next[department.id];
        return next;
      });
      setNotice("Department updated. Existing class links are preserved.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to update department."));
    }
  };

  const deleteDepartment = async (department) => {
    if (!window.confirm(`Delete ${department.name}? Only empty departments can be deleted.`)) return;
    setError("");
    try {
      await api.delete(`/accounts/admin/departments/${department.id}/`);
      setDepartments((current) => current.filter((item) => item.id !== department.id));
      setNotice("Empty department deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to delete this department."));
    }
  };

  const createClassCode = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await api.post("/accounts/admin/class-codes/", newCode);
      setClassCodes((current) => {
        const exists = current.some((item) => item.id === response.data.id);
        return exists ? current : [...current, response.data];
      });
      setNotice(response.status === 201 ? "Class code created." : "That class already has a code.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create class code."));
    }
  };

  const rotateCode = async (code) => {
    if (!window.confirm(`Regenerate the code for ${code.department_name}, ${code.level} level? The current code will stop working.`)) return;
    setError("");
    try {
      const response = await api.post(`/accounts/admin/class-codes/${code.id}/rotate/`);
      setClassCodes((current) =>
        current.map((item) => (item.id === code.id ? { ...item, code: response.data.code } : item)),
      );
      setNotice("Class code regenerated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to regenerate this class code."));
    }
  };

  const endSession = async (session) => {
    if (!window.confirm(`End ${session.course_code} for ${session.department_name}? Attendance records will be kept.`)) return;
    setError("");
    try {
      const response = await api.patch(`/accounts/admin/sessions/${session.id}/`, { action: "end" });
      setSessions((current) =>
        current.map((item) => item.id === session.id ? response.data.session : item),
      );
      setNotice(response.data.detail);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to end this session."));
    }
  };

  const updateAnnouncementDraft = (announcement, field, value) => {
    setAnnouncementDrafts((current) => ({
      ...current,
      [announcement.id]: {
        ...announcement,
        ...current[announcement.id],
        [field]: value,
      },
    }));
  };

  const saveAnnouncement = async (announcement) => {
    const changes = announcementDrafts[announcement.id];
    if (!changes) return;
    setError("");
    try {
      const response = await api.patch(
        `/accounts/admin/announcements/${announcement.id}/`,
        changes,
      );
      setAnnouncements((current) =>
        current.map((item) => item.id === announcement.id ? response.data : item),
      );
      setAnnouncementDrafts((current) => {
        const next = { ...current };
        delete next[announcement.id];
        return next;
      });
      setNotice("Announcement updated.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to update announcement."));
    }
  };

  const deleteAnnouncement = async (announcement) => {
    if (!window.confirm(`Permanently delete “${announcement.title}”?`)) return;
    setError("");
    try {
      await api.delete(`/accounts/admin/announcements/${announcement.id}/`);
      setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
      setNotice("Announcement deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to delete announcement."));
    }
  };

  const deleteDocument = async (document) => {
    if (!window.confirm(`Permanently delete “${document.title}” and its file?`)) return;
    setError("");
    try {
      await api.delete(`/accounts/admin/documents/${document.id}/`);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setNotice("Document and its stored file deleted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to delete document."));
    }
  };

  const publishAnnouncement = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setPublishingAnnouncement(true);
    try {
      const response = await api.post("/accounts/admin/announcements/", {
        ...announcementForm,
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        due_date: announcementForm.category === "ASSIGNMENT"
          ? announcementForm.due_date || null
          : null,
      });
      setAnnouncements((current) => [
        response.data.announcement,
        ...current.filter((item) => item.id !== response.data.announcement.id),
      ]);
      setAnnouncementForm((current) => ({
        ...current,
        title: "",
        body: "",
        due_date: "",
      }));
      setNotice(response.data.detail);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to send this announcement."));
    } finally {
      setPublishingAnnouncement(false);
    }
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!documentFile) {
      setError("Choose a PDF file to upload.");
      return;
    }
    if (documentFile.size > 10 * 1024 * 1024) {
      setError("PDF must be 10 MB or smaller.");
      return;
    }

    setUploadingDocument(true);
    try {
      const data = new FormData();
      data.append("title", documentForm.title.trim());
      data.append("description", documentForm.description.trim());
      data.append("course_code", documentForm.course_code.trim().toUpperCase());
      data.append("department", documentForm.department);
      data.append("level", documentForm.level);
      data.append("file", documentFile);
      await api.post("/attendance/documents/", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const response = await api.get("/accounts/admin/documents/");
      setDocuments(response.data);
      setDocumentForm((current) => ({
        ...current,
        title: "",
        description: "",
        course_code: "",
      }));
      setDocumentFile(null);
      if (documentInputRef.current) documentInputRef.current.value = "";
      setNotice("Document uploaded and shared with the selected class.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to upload this document."));
    } finally {
      setUploadingDocument(false);
    }
  };

  const downloadDocument = async (documentRecord) => {
    setError("");
    try {
      const response = await api.get(
        `/attendance/documents/${documentRecord.id}/download/`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(response.data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = documentRecord.file_name || `document-${documentRecord.id}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice("Document download started.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to download this document."));
    }
  };

  const renderOverview = () => (
    <>
      <div className="cp-owner-stats">
        {[
          ["Users", summary?.users],
          ["Active users", summary?.active_users],
          ["Departments", summary?.departments],
          ["Active sessions", summary?.active_sessions],
          ["Announcements", summary?.announcements],
          ["Documents", summary?.documents],
        ].map(([label, value]) => (
          <article className="cp-owner-stat" key={label}>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </article>
        ))}
      </div>
      <section className="cp-owner-panel">
        <div className="cp-owner-panel-heading">
          <div>
            <span className="cp-owner-eyebrow">Administration record</span>
            <h2>Recent owner actions</h2>
          </div>
          <Link to="/admin/audit">View audit history</Link>
        </div>
        {summary?.recent_actions?.length ? (
          <ul className="cp-owner-activity">
            {summary.recent_actions.map((event) => (
              <li key={event.id}>
                <div><strong>{event.actor}</strong><span>{event.summary}</span></div>
                <time>{new Date(event.created_at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        ) : <p className="cp-owner-muted">Administrative actions will appear here.</p>}
      </section>
    </>
  );

  const renderUsers = () => (
    <section className="cp-owner-panel">
      <div className="cp-owner-panel-heading">
        <div>
          <span className="cp-owner-eyebrow">Accounts</span>
          <h2>{usersPage.count} users</h2>
        </div>
      </div>
      <label className="cp-owner-search">
        <span>Search users</span>
        <input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Name, username, email or matric number"
        />
      </label>
      <div className="cp-owner-table-wrap">
        <table className="cp-owner-table">
          <thead><tr><th>Account</th><th>Email / matric</th><th>Role</th><th>Department</th><th>Level</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {usersLoading ? <tr><td colSpan="7">Loading accounts…</td></tr> : users.length === 0 ? <tr><td colSpan="7">No users found.</td></tr> : users.map((user) => {
              const draft = userDrafts[user.id] || user;
              return (
                <tr key={user.id}>
                  <td><strong>{user.first_name} {user.last_name}</strong><small>@{user.username}</small></td>
                  <td>
                    <input
                      type="email"
                      aria-label={`Email for ${user.username}`}
                      value={draft.email || ""}
                      onChange={(event) => updateUserDraft(user, "email", event.target.value)}
                    />
                    <small>{user.matric_number || "No matric number"}</small>
                  </td>
                  <td>
                    {user.is_superuser ? "Owner" : user.role === "LECTURER" ? "Lecturer" : (
                      <select value={draft.role} onChange={(event) => updateUserDraft(user, "role", event.target.value)}>
                        {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    <select value={draft.department ?? ""} onChange={(event) => updateUserDraft(user, "department", event.target.value || null)}>
                      <option value="">No department</option>
                      {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={draft.level || ""} onChange={(event) => updateUserDraft(user, "level", event.target.value)}>
                      <option value="">No level</option>
                      {LEVELS.map((level) => <option key={level} value={level}>{level} Level</option>)}
                    </select>
                  </td>
                  <td><span className={`cp-owner-status ${user.lecturer_approved === false && user.role === "LECTURER" ? "is-inactive" : user.is_active ? "is-active" : "is-inactive"}`}>{user.role === "LECTURER" && !user.lecturer_approved ? "Pending approval" : user.is_active ? "Active" : "Deactivated"}</span></td>
                  <td>
                    {user.is_superuser ? <span className="cp-owner-muted">Protected</span> : (
                      <div className="cp-owner-row-actions">
                        <button type="button" className="cp-owner-button" disabled={!userDrafts[user.id]} onClick={() => saveUser(user)}>Save</button>
                        {!(user.role === "LECTURER" && !user.lecturer_approved) && (
                          <button type="button" className="cp-owner-button cp-owner-button-muted" onClick={() => saveUser(user, { is_active: !user.is_active })}>{user.is_active ? "Deactivate" : "Restore"}</button>
                        )}
                        {user.passkey_count > 0 && (
                          <button
                            type="button"
                            className="cp-owner-button cp-owner-button-muted"
                            onClick={() => removeUserPasskeys(user)}
                            disabled={adminActionId === `passkeys-${user.id}`}
                          >
                            {adminActionId === `passkeys-${user.id}`
                              ? "Removing…"
                              : `Remove ${user.passkey_count} passkey${user.passkey_count === 1 ? "" : "s"}`}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cp-owner-pagination">
        <span>Showing {users.length} of {usersPage.count}</span>
        <div>
          <button type="button" className="cp-owner-button cp-owner-button-muted" disabled={!usersPage.previous || usersLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <button type="button" className="cp-owner-button cp-owner-button-muted" disabled={!usersPage.next || usersLoading} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      </div>
      <p className="cp-owner-muted">Accounts are deactivated and restorable here; permanent user deletion is not available from this dashboard.</p>
    </section>
  );

  const renderLecturerApprovals = () => (
    <section className="cp-owner-panel">
      <div className="cp-owner-panel-heading">
        <div>
          <span className="cp-owner-eyebrow">Account verification</span>
          <h2>{lecturerApprovals.length} pending lecturer applications</h2>
        </div>
      </div>
      {lecturerApprovals.length === 0 ? (
        <p className="cp-owner-muted">There are no lecturer applications waiting for review.</p>
      ) : (
        <div className="cp-owner-table-wrap">
          <table className="cp-owner-table">
            <thead>
              <tr><th>Lecturer</th><th>Email</th><th>Department and levels</th><th>Applied</th><th>Action</th></tr>
            </thead>
            <tbody>
              {lecturerApprovals.map((lecturer) => (
                <tr key={lecturer.id}>
                  <td><strong>{lecturer.first_name} {lecturer.last_name}</strong><small>@{lecturer.username}</small></td>
                  <td>{lecturer.email}</td>
                  <td>
                    {lecturer.assignments.map((assignment) => (
                      <small key={`${assignment.department}-${assignment.level}`}>
                        {assignment.department} · {assignment.level} Level
                      </small>
                    ))}
                  </td>
                  <td>{new Date(lecturer.date_joined).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="cp-owner-button"
                      onClick={() => approveLecturer(lecturer)}
                      disabled={adminActionId === `approve-${lecturer.id}`}
                    >
                      {adminActionId === `approve-${lecturer.id}` ? "Approving…" : "Approve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="cp-owner-muted">Approval enables lecturer sign-in, session creation, attendance control, and Excel exports for the selected classes.</p>
    </section>
  );

  const renderDepartments = () => (
    <>
      <section className="cp-owner-panel">
        <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Academic structure</span><h2>Add a department</h2></div></div>
        <form className="cp-owner-form-row" onSubmit={createDepartment}>
          <label><span>Department name</span><input required value={newDepartment.name} onChange={(event) => setNewDepartment({ ...newDepartment, name: event.target.value })} /></label>
          <label><span>Faculty</span><input required value={newDepartment.faculty} onChange={(event) => setNewDepartment({ ...newDepartment, faculty: event.target.value })} /></label>
          <button type="submit" className="cp-owner-button">Add department</button>
        </form>
      </section>
      <section className="cp-owner-panel">
        <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Existing records</span><h2>{departments.length} departments</h2></div></div>
        <div className="cp-owner-table-wrap">
          <table className="cp-owner-table"><thead><tr><th>Department name</th><th>Faculty</th><th>Actions</th></tr></thead><tbody>
            {departments.map((department) => {
              const draft = departmentDrafts[department.id] || department;
              return <tr key={department.id}>
                <td><input value={draft.name} onChange={(event) => setDepartmentDrafts((current) => ({ ...current, [department.id]: { ...draft, name: event.target.value } }))} /></td>
                <td><input value={draft.faculty} onChange={(event) => setDepartmentDrafts((current) => ({ ...current, [department.id]: { ...draft, faculty: event.target.value } }))} /></td>
                <td><div className="cp-owner-row-actions">
                  <button type="button" className="cp-owner-button" disabled={!departmentDrafts[department.id]} onClick={() => saveDepartment(department)}>Save</button>
                  <button type="button" className="cp-owner-button cp-owner-button-danger" onClick={() => deleteDepartment(department)}>Delete</button>
                </div></td>
              </tr>;
            })}
          </tbody></table>
        </div>
        <p className="cp-owner-muted">Renaming preserves linked accounts and class codes. Deleting a department is blocked while it has users, codes, sessions, announcements or documents.</p>
      </section>
    </>
  );

  const renderClassCodes = () => (
    <>
      <section className="cp-owner-panel">
        <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Cohort access</span><h2>Create a class code</h2></div></div>
        <form className="cp-owner-form-row" onSubmit={createClassCode}>
          <label><span>Department</span><select required value={newCode.department} onChange={(event) => setNewCode({ ...newCode, department: event.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label><span>Level</span><select value={newCode.level} onChange={(event) => setNewCode({ ...newCode, level: event.target.value })}>{LEVELS.map((level) => <option key={level} value={level}>{level} Level</option>)}</select></label>
          <button type="submit" className="cp-owner-button">Create or show code</button>
        </form>
      </section>
      <section className="cp-owner-panel">
        <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Department + level-specific</span><h2>{classCodes.length} class codes</h2></div></div>
        <div className="cp-owner-table-wrap"><table className="cp-owner-table"><thead><tr><th>Department</th><th>Level</th><th>Current code</th><th>Action</th></tr></thead><tbody>
          {classCodes.map((code) => <tr key={code.id}><td>{code.department_name}</td><td>{code.level}</td><td><code className="cp-owner-code">{code.code}</code></td><td><button type="button" className="cp-owner-button cp-owner-button-danger" onClick={() => rotateCode(code)}>Regenerate</button></td></tr>)}
          {classCodes.length === 0 && <tr><td colSpan="4">No class codes have been created.</td></tr>}
        </tbody></table></div>
        <p className="cp-owner-muted">A code only applies to the listed department and level. Regenerating it immediately invalidates the previous code.</p>
      </section>
    </>
  );

  const renderSessions = () => (
    <section className="cp-owner-panel">
      <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Attendance</span><h2>{sessions.length} sessions</h2></div></div>
      <div className="cp-owner-table-wrap"><table className="cp-owner-table"><thead><tr><th>Course / venue</th><th>Class</th><th>Attendees</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>
        {sessions.map((session) => <tr key={session.id}><td><strong>{session.course_code}</strong><small>{session.venue_name}</small></td><td>{session.department_name}<small>{session.level} Level</small></td><td>{session.attendee_count}</td><td>{session.has_ended ? "Ended" : session.is_active ? "Active" : "Inactive"}</td><td>{new Date(session.created_at).toLocaleString()}</td><td>{session.is_active && !session.has_ended ? <button type="button" className="cp-owner-button cp-owner-button-danger" onClick={() => endSession(session)}>End session</button> : "—"}</td></tr>)}
        {sessions.length === 0 && <tr><td colSpan="6">No attendance sessions.</td></tr>}
      </tbody></table></div>
      <p className="cp-owner-muted">Ending a session preserves its attendance records. Session deletion is not available here.</p>
    </section>
  );

  const renderAnnouncements = () => (
    <>
      <section className="cp-owner-panel">
        <div className="cp-owner-panel-heading">
          <div><span className="cp-owner-eyebrow">Class communications</span><h2>Send an announcement</h2></div>
        </div>
        <form className="cp-owner-compose-form" onSubmit={publishAnnouncement}>
          <div className="cp-owner-form-row">
            <label><span>Title</span><input required maxLength="150" value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} /></label>
            <label><span>Category</span><select value={announcementForm.category} onChange={(event) => setAnnouncementForm({ ...announcementForm, category: event.target.value, due_date: "" })}><option value="GENERAL">General</option><option value="ASSIGNMENT">Assignment</option><option value="VENUE_CHANGE">Venue change</option></select></label>
          </div>
          <label><span>Message</span><textarea required rows="4" value={announcementForm.body} onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })} /></label>
          <div className="cp-owner-form-row">
            <label><span>Department</span><select required value={announcementForm.department} onChange={(event) => setAnnouncementForm({ ...announcementForm, department: event.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label><span>Level</span><select value={announcementForm.level} onChange={(event) => setAnnouncementForm({ ...announcementForm, level: event.target.value })}>{LEVELS.map((level) => <option key={level} value={level}>{level} Level</option>)}</select></label>
            {announcementForm.category === "ASSIGNMENT" && <label><span>Due date</span><input type="date" value={announcementForm.due_date} onChange={(event) => setAnnouncementForm({ ...announcementForm, due_date: event.target.value })} /> </label>}
          </div>
          <p className="cp-owner-muted">This announcement goes to active students in the selected department and level.</p>
          <button type="submit" className="cp-owner-button" disabled={publishingAnnouncement}>{publishingAnnouncement ? "Sending…" : "Send announcement"}</button>
        </form>
      </section>
      <section className="cp-owner-panel">
      <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Previously posted</span><h2>{announcements.length} announcements</h2></div></div>
      <div className="cp-owner-edit-list">
        {announcements.map((announcement) => {
          const draft = announcementDrafts[announcement.id] || announcement;
          return <article className="cp-owner-edit-card" key={announcement.id}>
            <div className="cp-owner-form-row">
              <label><span>Title</span><input value={draft.title} onChange={(event) => updateAnnouncementDraft(announcement, "title", event.target.value)} /></label>
              <label><span>Category</span><select value={draft.category} onChange={(event) => updateAnnouncementDraft(announcement, "category", event.target.value)}><option value="GENERAL">General</option><option value="ASSIGNMENT">Assignment</option><option value="VENUE_CHANGE">Venue change</option></select></label>
            </div>
            <label><span>Message</span><textarea rows="3" value={draft.body} onChange={(event) => updateAnnouncementDraft(announcement, "body", event.target.value)} /></label>
            <div className="cp-owner-form-row">
              <label><span>Department</span><select value={draft.department} onChange={(event) => updateAnnouncementDraft(announcement, "department", Number(event.target.value))}>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
              <label><span>Level</span><select value={draft.level} onChange={(event) => updateAnnouncementDraft(announcement, "level", event.target.value)}>{LEVELS.map((level) => <option key={level} value={level}>{level} Level</option>)}</select></label>
              <label><span>Due date</span><input type="date" value={draft.due_date || ""} onChange={(event) => updateAnnouncementDraft(announcement, "due_date", event.target.value || null)} /></label>
            </div>
            <div className="cp-owner-edit-footer"><span>Posted by @{announcement.posted_by} · {new Date(announcement.created_at).toLocaleString()}</span><div className="cp-owner-row-actions"><button type="button" className="cp-owner-button" disabled={!announcementDrafts[announcement.id]} onClick={() => saveAnnouncement(announcement)}>Save</button><button type="button" className="cp-owner-button cp-owner-button-danger" onClick={() => deleteAnnouncement(announcement)}>Delete</button></div></div>
          </article>;
        })}
        {announcements.length === 0 && <p className="cp-owner-muted">No announcements.</p>}
      </div>
      </section>
    </>
  );

  const renderDocuments = () => (
    <>
    <section className="cp-owner-panel">
      <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Class materials</span><h2>Upload a document</h2></div></div>
      <form className="cp-owner-compose-form" onSubmit={uploadDocument}>
        <div className="cp-owner-form-row">
          <label><span>Document title</span><input required maxLength="180" value={documentForm.title} onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })} /></label>
          <label><span>Course code (optional)</span><input maxLength="20" value={documentForm.course_code} onChange={(event) => setDocumentForm({ ...documentForm, course_code: event.target.value })} /></label>
        </div>
        <label><span>Description (optional)</span><textarea rows="3" value={documentForm.description} onChange={(event) => setDocumentForm({ ...documentForm, description: event.target.value })} /></label>
        <div className="cp-owner-form-row">
          <label><span>Department</span><select required value={documentForm.department} onChange={(event) => setDocumentForm({ ...documentForm, department: event.target.value })}><option value="">Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <label><span>Level</span><select value={documentForm.level} onChange={(event) => setDocumentForm({ ...documentForm, level: event.target.value })}>{LEVELS.map((level) => <option key={level} value={level}>{level} Level</option>)}</select></label>
          <label><span>PDF file (max 10 MB)</span><input ref={documentInputRef} type="file" accept="application/pdf,.pdf" required onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} /></label>
        </div>
        <p className="cp-owner-muted">The PDF will be available to students in the selected department and level.</p>
        <button type="submit" className="cp-owner-button" disabled={uploadingDocument}>{uploadingDocument ? "Uploading…" : "Upload and share PDF"}</button>
      </form>
    </section>
    <section className="cp-owner-panel">
      <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Shared materials</span><h2>{documents.length} documents</h2></div></div>
      <div className="cp-owner-table-wrap"><table className="cp-owner-table"><thead><tr><th>Document</th><th>Course</th><th>Class</th><th>Uploaded by</th><th>Created</th><th>Action</th></tr></thead><tbody>
        {documents.map((document) => <tr key={document.id}><td><strong>{document.title}</strong><small>{document.file_name}</small></td><td>{document.course_code || "—"}</td><td>{document.department_name}<small>{document.level} Level</small></td><td>@{document.uploaded_by}</td><td>{new Date(document.created_at).toLocaleString()}</td><td><div className="cp-owner-row-actions"><button type="button" className="cp-owner-button cp-owner-button-muted" onClick={() => downloadDocument(document)}>Download</button><button type="button" className="cp-owner-button cp-owner-button-danger" onClick={() => deleteDocument(document)}>Delete file</button></div></td></tr>)}
        {documents.length === 0 && <tr><td colSpan="6">No documents.</td></tr>}
      </tbody></table></div>
    </section>
    </>
  );

  const renderAudit = () => (
    <section className="cp-owner-panel">
      <div className="cp-owner-panel-heading"><div><span className="cp-owner-eyebrow">Accountability</span><h2>Recent activity</h2></div></div>
      <div className="cp-owner-table-wrap"><table className="cp-owner-table"><thead><tr><th>Time</th><th>Actor</th><th>Type</th><th>Action</th><th>Details</th></tr></thead><tbody>
        {auditEvents.map((event) => <tr key={event.id}><td>{new Date(event.created_at).toLocaleString()}</td><td>@{event.actor}</td><td>{event.type === "ADMIN" ? "Owner admin" : "Class representative"}</td><td>{event.action}</td><td>{event.summary}</td></tr>)}
        {auditEvents.length === 0 && <tr><td colSpan="5">No audit events recorded yet.</td></tr>}
      </tbody></table></div>
      <p className="cp-owner-muted">This combines owner changes made in this workspace and existing class-representative session activity.</p>
    </section>
  );

  const content = {
    overview: renderOverview,
    users: renderUsers,
    departments: renderDepartments,
    classes: renderClassCodes,
    sessions: renderSessions,
    announcements: renderAnnouncements,
    documents: renderDocuments,
    audit: renderAudit,
    lecturers: renderLecturerApprovals,
  }[section] || renderOverview;

  return (
    <AppShell role="SUPER_ADMIN">
      <div className="cp-owner-page">
        <header className="cp-owner-header">
          <div>
            <span className="cp-owner-eyebrow">CampusPulse · owner workspace</span>
            <h1>{title}</h1>
            <p>Manage accounts and academic operations with changes recorded for review.</p>
          </div>
          <div className="cp-owner-header-actions">
            <Link to="/admin/lecturers" className="cp-owner-button cp-owner-button-muted">Lecturer approvals</Link>
            <button type="button" className="cp-owner-button cp-owner-button-muted" onClick={reload} disabled={loading}>{loading ? "Refreshing…" : "Refresh data"}</button>
          </div>
        </header>
        {error && <div className="cp-owner-feedback is-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
        {notice && <div className="cp-owner-feedback is-success" role="status">{notice}<button type="button" onClick={() => setNotice("")}>Dismiss</button></div>}
        {loading ? <div className="cp-owner-panel cp-owner-loading">Loading owner workspace…</div> : content()}
      </div>
    </AppShell>
  );
}

export default AdminDashboard;
