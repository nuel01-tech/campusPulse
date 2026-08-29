import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import AppShell from '../components/AppShell';

const formatSize = (bytes) => {
  if (!bytes) return 'PDF';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ title: '', description: '', course_code: '', level: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);

  const loadProfile = async () => {
    const r = await api.get('/accounts/profile/');
    setProfile(r.data);
    setForm((current) => ({ ...current, level: current.level || r.data.level || '' }));
  };

  const loadDocuments = async (search = '') => {
    setLoading(true);
    try {
      const r = await api.get('/attendance/documents/', { params: search ? { q: search } : {} });
      setDocuments(r.data || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([loadProfile(), loadDocuments()]).catch(() => setError('Unable to load your document workspace.'));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!file) {
      setError('Choose a PDF file first.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('PDF must be 10 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('description', form.description.trim());
      data.append('course_code', form.course_code.trim().toUpperCase());
      data.append('level', form.level || profile?.level || '');
      data.append('file', file);
      await api.post('/attendance/documents/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm({ title: '', description: '', course_code: '', level: profile?.level || '' });
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setNotice('PDF uploaded and shared with your class.');
      await loadDocuments(query);
    } catch (e) {
      const data = e.response?.data;
      const message = data?.file?.[0] || data?.detail || 'Unable to upload this PDF.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const search = async (e) => {
    e?.preventDefault();
    setError('');
    await loadDocuments(query.trim());
  };

  const download = async (doc) => {
    setDownloading(doc.id);
    setError('');
    try {
      const r = await api.get(`/attendance/documents/${doc.id}/download/`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = doc.file_name || `${doc.title}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.response?.data?.detail || 'Unable to download this PDF.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AppShell role={profile?.role || 'STUDENT'}>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Class library</span>
          <h1>Documents.</h1>
          <p>Share course PDFs with your class and find material uploaded by other students or representatives.</p>
        </div>
      </div>

      {(notice || error) && <div className={`notice ${notice ? 'success' : 'error'}`}>{notice || error}</div>}

      <div className="documents-layout">
        <section className="panel document-upload-panel">
          <div className="panel-head">
            <div><span className="eyebrow">Contribute</span><h2>Upload a PDF</h2></div>
          </div>
          <p className="muted-copy">Uploads are shared with authenticated members of your department and level.</p>
          <form className="stack-form" onSubmit={submit}>
            <label>Document title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. CSC 202 Lecture Note" maxLength={180} required /></label>
            <label>Course code<input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value.toUpperCase() })} placeholder="e.g. CSC 202" maxLength={20} /></label>
            <label>Level<select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} required><option value="">Select level</option>{['100','200','300','400','500'].map(level => <option value={level} key={level}>{level} Level</option>)}</select></label>
            <label>Description <span className="field-hint">Optional</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="What is this material about?" /></label>
            <label className="file-picker">PDF file<input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required /><span>{file ? file.name : 'Choose a PDF · maximum 10 MB'}</span></label>
            <button className="button primary" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload & share'}</button>
          </form>
        </section>

        <section className="panel document-library-panel">
          <div className="panel-head">
            <div><span className="eyebrow">Shared material</span><h2>Class library</h2></div>
            <span className="library-count">{documents.length} file{documents.length === 1 ? '' : 's'}</span>
          </div>
          <form className="document-search" onSubmit={search}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, course or uploader…" />
            <button className="button secondary small" type="submit">Search</button>
          </form>
          {loading ? <div className="empty-state compact"><p>Loading documents…</p></div> : documents.length === 0 ? (
            <div className="empty-state"><span>PDF</span><h3>No documents found</h3><p>Be the first to share useful course material with your class.</p></div>
          ) : (
            <div className="document-list">
              {documents.map((doc) => (
                <article className="document-row" key={doc.id}>
                  <div className="document-icon">PDF</div>
                  <div className="document-copy"><strong>{doc.title}</strong><p>{doc.course_code || 'General material'} · {doc.level} Level · {formatSize(doc.file_size)}</p><small>Uploaded by {doc.uploaded_by_name} · {new Date(doc.created_at).toLocaleDateString()}</small>{doc.description && <span>{doc.description}</span>}</div>
                  <button className="button secondary small" onClick={() => download(doc)} disabled={downloading === doc.id}>{downloading === doc.id ? 'Downloading…' : 'Download'}</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default Documents;
