import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import AppShell from "../components/AppShell";
import LoadingSkeleton from "../components/LoadingSkeleton";

const formatSize = (bytes) => {
  if (!bytes) return "PDF";

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 20h16" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7.5" />
        <path d="m20 20-3.6-3.6" />
      </>
    ),

    download: (
      <>
        <path d="M12 4v11" />
        <path d="m7 11 5 5 5-5" />
        <path d="M4 20h16" />
      </>
    ),

    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),

    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),

    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),

    warning: (
      <>
        <path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
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
  };

  return <svg {...common}>{icons[name]}</svg>;
}

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile] = useState(null);

  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    course_code: "",
    level: "",
  });

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fileRef = useRef(null);

  const loadProfile = async () => {
    const response = await api.get("/accounts/profile/");

    setProfile(response.data);

    setForm((current) => ({
      ...current,
      level: current.level || response.data.level || "",
    }));
  };

  const loadDocuments = async (search = "") => {
    setLoading(true);

    try {
      const response = await api.get("/attendance/documents/", {
        params: search ? { q: search } : {},
      });

      setDocuments(response.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadProfile(), loadDocuments()]).catch(() => {
      setError("Unable to load your document workspace.");
    });
  }, []);

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setNotice("");

    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("PDF must be 10 MB or smaller.");
      return;
    }

    setUploading(true);

    try {
      const data = new FormData();

      data.append("title", form.title.trim());
      data.append("description", form.description.trim());
      data.append("course_code", form.course_code.trim().toUpperCase());
      data.append("level", form.level || profile?.level || "");
      data.append("file", file);

      await api.post("/attendance/documents/", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setForm({
        title: "",
        description: "",
        course_code: "",
        level: profile?.level || "",
      });

      setFile(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      setNotice("PDF uploaded and shared with your class.");

      await loadDocuments(query);
    } catch (e) {
      const data = e.response?.data;

      const message =
        data?.file?.[0] || data?.detail || "Unable to upload this PDF.";

      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const search = async (event) => {
    event?.preventDefault();

    setError("");

    await loadDocuments(query.trim());
  };

  const download = async (doc) => {
    setDownloading(doc.id);
    setError("");

    try {
      const response = await api.get(
        `/attendance/documents/${doc.id}/download/`,
        {
          responseType: "blob",
        },
      );

      const url = URL.createObjectURL(
        new Blob([response.data], {
          type: "application/pdf",
        }),
      );

      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = doc.file_name || `${doc.title}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.detail || "Unable to download this PDF.");
    } finally {
      setDownloading(null);
    }
  };

  const clearFile = () => {
    setFile(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <AppShell role={profile?.role || "STUDENT"}>
      <div className="cp-documents-page">
        {/* =================================================
            Header
        ================================================= */}

        <header className="cp-documents-header">
          <div>
            <div className="cp-page-kicker">
              <span />
              Academic resources
            </div>

            <h1>Class library</h1>

            <p>
              Find course materials shared by your classmates and contribute
              useful PDFs to your class.
            </p>
          </div>

          <div className="cp-documents-total">
            <span className="cp-documents-total-icon">
              <Icon name="book" size={19} />
            </span>

            <div>
              <strong>{documents.length}</strong>
              <span>{documents.length === 1 ? "document" : "documents"}</span>
            </div>
          </div>
        </header>

        {/* =================================================
            Notices
        ================================================= */}

        {(notice || error) && (
          <div
            className={`cp-documents-notice ${
              notice
                ? "cp-documents-notice-success"
                : "cp-documents-notice-error"
            }`}
            role={notice ? "status" : "alert"}
          >
            <span className="cp-documents-notice-icon">
              <Icon name={notice ? "check" : "warning"} size={16} />
            </span>

            <span>{notice || error}</span>

            <button
              type="button"
              onClick={() => {
                setNotice("");
                setError("");
              }}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}

        {/* =================================================
            Workspace
        ================================================= */}

        <div className="cp-documents-layout">
          {/* =================================================
              Upload
          ================================================= */}

          <section className="cp-documents-upload">
            <div className="cp-documents-section-heading">
              <div>
                <span className="cp-documents-label">Contribute</span>

                <h2>Share a document</h2>
              </div>

              <div className="cp-documents-upload-icon">
                <Icon name="upload" size={19} />
              </div>
            </div>

            <p className="cp-documents-description">
              Upload lecture notes, past questions or other useful course
              material for authenticated members of your class.
            </p>

            <form className="cp-documents-form" onSubmit={submit}>
              <label>
                <span>
                  Document title
                  <b>*</b>
                </span>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  placeholder="e.g. CSC 202 Lecture Notes"
                  maxLength={180}
                  required
                />
              </label>

              <div className="cp-documents-form-row">
                <label>
                  <span>Course code</span>

                  <input
                    value={form.course_code}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        course_code: event.target.value.toUpperCase(),
                      })
                    }
                    placeholder="CSC 202"
                    maxLength={20}
                  />
                </label>

                <label>
                  <span>
                    Level
                    <b>*</b>
                  </span>

                  <select
                    value={form.level}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        level: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select level</option>

                    {["100", "200", "300", "400", "500"].map((level) => (
                      <option value={level} key={level}>
                        {level} Level
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                <span>
                  Description
                  <em>Optional</em>
                </span>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Briefly describe what this material contains..."
                />
              </label>

              {/* File picker */}

              <div className="cp-document-file-area">
                <span className="cp-document-file-label">
                  PDF file
                  <b>*</b>
                </span>

                {!file ? (
                  <label className="cp-document-dropzone">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) =>
                        setFile(event.target.files?.[0] || null)
                      }
                      required
                    />

                    <span className="cp-document-dropzone-icon">
                      <Icon name="file" size={21} />
                    </span>

                    <strong>Choose a PDF file</strong>

                    <span>Maximum file size: 10 MB</span>
                  </label>
                ) : (
                  <div className="cp-selected-file">
                    <div className="cp-selected-file-icon">PDF</div>

                    <div>
                      <strong title={file.name}>{file.name}</strong>

                      <span>{formatSize(file.size)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label="Remove selected file"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="cp-document-upload-button"
                disabled={uploading}
              >
                <Icon name="upload" size={16} strokeWidth={2.1} />

                {uploading ? "Uploading..." : "Upload & share"}
              </button>

              <p className="cp-document-form-note">
                Only PDF files up to 10 MB are accepted.
              </p>
            </form>
          </section>

          {/* =================================================
              Library
          ================================================= */}

          <section className="cp-documents-library">
            <div className="cp-documents-library-heading">
              <div>
                <span className="cp-documents-label">Shared material</span>

                <h2>Documents</h2>
              </div>

              <span className="cp-documents-library-count">
                {documents.length} {documents.length === 1 ? "file" : "files"}
              </span>
            </div>

            {/* Search */}

            <form className="cp-documents-search" onSubmit={search}>
              <Icon name="search" size={17} />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, course or uploader..."
                aria-label="Search documents"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    loadDocuments("");
                  }}
                  aria-label="Clear document search"
                >
                  <Icon name="close" size={14} />
                </button>
              )}

              <button type="submit" className="cp-document-search-button">
                Search
              </button>
            </form>

            {/* Library */}

            {loading ? (
              <div className="cp-documents-loading">
                <LoadingSkeleton rows={4} />
              </div>
            ) : documents.length === 0 ? (
              <div className="cp-documents-empty">
                <div className="cp-documents-empty-icon">
                  <Icon name="book" size={25} />
                </div>

                <h3>No documents found</h3>

                <p>
                  {query
                    ? "Try another search term or clear the search to view all shared material."
                    : "Be the first to share useful course material with your class."}
                </p>

                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      loadDocuments("");
                    }}
                  >
                    View all documents
                  </button>
                )}
              </div>
            ) : (
              <div className="cp-document-list">
                {documents.map((doc) => (
                  <article className="cp-document-item" key={doc.id}>
                    <div className="cp-document-pdf-icon">PDF</div>

                    <div className="cp-document-info">
                      <div className="cp-document-title-row">
                        <h3 title={doc.title}>{doc.title}</h3>

                        {doc.course_code && <span>{doc.course_code}</span>}
                      </div>

                      <div className="cp-document-meta">
                        <span>{doc.level} Level</span>

                        <i />

                        <span>{formatSize(doc.file_size)}</span>

                        <i />

                        <span>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p>
                        Uploaded by <strong>{doc.uploaded_by_name}</strong>
                      </p>

                      {doc.description && (
                        <div className="cp-document-description">
                          {doc.description}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="cp-document-download"
                      onClick={() => download(doc)}
                      disabled={downloading === doc.id}
                    >
                      <Icon name="download" size={15} strokeWidth={2} />

                      <span>
                        {downloading === doc.id ? "Downloading..." : "Download"}
                      </span>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

export default Documents;
