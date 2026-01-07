import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const apiBase = process.env.REACT_APP_API_BASE;

  const addDocument = async () => {
    if (!title || !content) return toast.error("Title and content required");

    setLoading(true);

    try {
      await fetch(`${apiBase}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      toast.success("Document added successfully");
      setTitle("");
      setContent("");
    } catch {
      toast.error("Failed to save document");
    }

    setLoading(false);
  };

  const searchDocs = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/search?q=${search}`);
      const data = await res.json();

      setResults(data);

      if (data.length > 0) toast.success(`Found ${data.length} result(s)`);
      else toast.warn("No results found");
    } catch {
      toast.error("Search failed");
    }

    setLoading(false);
  };

  const aiSearch = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/ai-search?q=${search}`);
      const data = await res.json();

      setResults(data);

      if (data.length > 0)
        toast.success(`AI matched ${data.length} document(s)`);
      else toast.warn("AI could not find anything relevant");
    } catch {
      toast.error("AI search failed");
    }

    setLoading(false);
  };

  const loadAll = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/all`);
      const data = await res.json();

      setResults(data);
      toast.info(`Loaded ${data.length} document(s)`);
    } catch {
      toast.error("Failed to load documents");
    }

    setLoading(false);
  };

  const uploadFile = async () => {
    if (!file) return toast.error("Select a file first");

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: formData,
      });

      toast.success("File uploaded successfully");
      setFile(null);
    } catch {
      toast.error("File upload failed");
    }

    setLoading(false);
  };

  const deleteDocument = async () => {
    if (!confirmDelete) return;

    try {
      await fetch(`${apiBase}/${confirmDelete._id}`, {
        method: "DELETE",
      });

      toast.success("Document deleted");

      setResults(results.filter((d) => d._id !== confirmDelete._id));
      setConfirmDelete(null);
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const themes = {
    light: { bg: "#f5f7fb", card: "#ffffff", text: "#0f172a", result: "#f1f5f9" },
    dark: { bg: "#0f172a", card: "#1e293b", text: "#e5e7eb", result: "#111827" },
  };

  const t = themes[theme];

  return (
    <div className="page" style={{ background: t.bg, color: t.text }}>
      <div className="header">
        <h1>AI Document Search</h1>

        <div>
          <button className="btn btn-primary" onClick={loadAll}>
            📄 View All
          </button>

          <button
            className="btn btn-default"
            style={{ marginLeft: 10 }}
            onClick={toggleTheme}
          >
            {theme === "light" ? "🌙 Dark Mode" : "🌞 Light Mode"}
          </button>
        </div>
      </div>

      <div className="card" style={{ background: t.card }}>
        <h3>Upload PDF / DOCX</h3>

        <input
          type="file"
          className="input"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button className="btn btn-primary" onClick={uploadFile}>
          Upload
        </button>
      </div>

      <div className="card" style={{ background: t.card }}>
        <h3>Add Manual Document</h3>

        <input
          className="input"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="textarea"
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <button className="btn btn-primary" onClick={addDocument}>
          Save
        </button>
      </div>

      <div className="card" style={{ background: t.card }}>
        <h3>Search Documents</h3>

        <input
          className="input"
          placeholder="Type your question or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="btn btn-default" onClick={searchDocs}>
          Normal Search
        </button>

        <button className="btn btn-primary" onClick={aiSearch}>
          AI Search
        </button>
      </div>

      <div className="card" style={{ background: t.card }}>
        <h3>Results</h3>

        {loading && <p>Loading...</p>}
        {!loading && results.length === 0 && <p>No results yet.</p>}

        <ul style={{ padding: 0 }}>
          {results.map((doc) => (
            <li key={doc._id} className="resultItem" style={{ background: t.result }}>
              <strong>{doc.title}</strong>

              {doc.score !== undefined && (
                <div className="score">Relevance: {doc.score?.toFixed(4)}</div>
              )}

              <p>{doc.content?.slice(0, 200)}...</p>


              {doc.filePath && (
                <button
                  className="btn btn-default"
                  onClick={() => window.open(doc.filePath, "_blank")}
                >
                  Open File
                </button>
              )}

              <button className="btn btn-danger" onClick={() => setConfirmDelete(doc)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>

      {confirmDelete && (
        <div className="modalOverlay">
          <div
            className="modal"
            style={{
              background: theme === "light" ? "#ffffff" : "#1f2937",
              color: theme === "light" ? "#0f172a" : "#e5e7eb",
            }}
          >
            <h3>Confirm Delete</h3>

            <p>
              You are deleting:
              <br />
              <strong>{confirmDelete.title}</strong>
              <br />
              <br />
              This action cannot be undone.
            </p>

            <button className="btn btn-default" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>

            <button className="btn btn-danger" onClick={deleteDocument}>
              Delete
            </button>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={2500} />
    </div>
  );
}

export default App;
