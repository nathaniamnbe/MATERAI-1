import { useEffect, useState } from "react";
import { fileToBase64 } from "../utils/file";
import { createDocument } from "../services/googleSheets";
import {
  getCabangOptions,
  getUlokOptions,
  getLingkupOptions,
} from "../services/googleSheets";

// Tambahkan helper untuk ambil cabang user dari localStorage
const SESSION_KEY = "MATERAI_USER";
function getSessionCabang() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return String(obj?.cabang || "").trim();
  } catch {
    return "";
  }
}

const initial = { cabang: "", ulok: "", lingkup: "" };

export default function CreateDocument() {
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // state opsi
  const [cabangOps, setCabangOps] = useState([]);
  const [ulokOps, setUlokOps] = useState([]);
  const [lingkupOps, setLingkupOps] = useState([]);

  // load cabang saat halaman dibuka
useEffect(() => {
  (async () => {
    try {
      const ops = await getCabangOptions(); // sudah otomatis sesuai cabang login
      setCabangOps(ops);
      setForm((s) => ({ ...s, cabang: ops[0] || "" })); // isi otomatis
    } catch (e) {
      console.error(e);
      setError(e.message || "Cabang belum diinput untuk akun ini.");
    }
  })();
}, []);


  // ketika cabang berubah → reset ulok & lingkup, lalu ambil opsi ulok
  useEffect(() => {
    if (!form.cabang) {
      setUlokOps([]);
      setLingkupOps([]);
      setForm((s) => ({ ...s, ulok: "", lingkup: "" }));
      return;
    }
(async () => {
  try {
    const ops = await getUlokOptions(); // tanpa argumen cabang
    setUlokOps(ops);
    setLingkupOps([]);
    setForm((s) => ({ ...s, ulok: "", lingkup: "" }));
  } catch (e) {
    console.error(e);
    setError(e.message || "Gagal memuat nomor ulok.");
  }
})();

  }, [form.cabang]);

  // ketika ulok berubah → reset lingkup, lalu ambil opsi lingkup
  useEffect(() => {
    if (!form.cabang || !form.ulok) {
      setLingkupOps([]);
      setForm((s) => ({ ...s, lingkup: "" }));
      return;
    }
(async () => {
  try {
    const ops = await getLingkupOptions(form.ulok); // cukup kirim ulok
    setLingkupOps(ops);
    setForm((s) => ({ ...s, lingkup: "" }));
  } catch (e) {
    console.error(e);
    setError(e.message || "Gagal memuat lingkup kerja.");
  }
})();

  }, [form.ulok]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!form.cabang || !form.ulok || !form.lingkup || !file) {
      setError("Lengkapi semua field dan pilih file.");
      return;
    }
    try {
      setSubmitting(true);
      const f = await fileToBase64(file);
      const payload = {
        cabang: form.cabang.trim(),
        ulok: form.ulok.trim(),
        lingkup: form.lingkup.trim(),
        file: {
          name: f.name,
          mimeType: f.mimeType,
          size: f.size,
          base64: f.base64,
          extension: f.extension,
        },
      };
      const saved = await createDocument(payload);
      setResult(saved);
      setForm(initial);
      setFile(null);
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
      setError(err.message || "Terjadi kesalahan saat menyimpan.");
    }
  };

  return (
    <div className="card" aria-busy={submitting}>
      {/* Overlay loading penuh layar */}
      {submitting && (
        <div className="savingOverlay" role="alert" aria-live="assertive">
          <div className="loader" />
          <div style={{ marginTop: 12, fontWeight: 600 }}>
            Mengunggah & menyimpan…
          </div>
        </div>
      )}



      <form
        onSubmit={onSubmit}
        style={{ pointerEvents: submitting ? "none" : "auto" }}
      >
        <div className="row">
          <div className="col">
            <label>Cabang</label>
            <select
              value={form.cabang}
              onChange={() => {}} // dikunci
              disabled
              title="Cabang dikunci sesuai akun login"
            >
              {cabangOps.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="col">
            <label>Nomor Ulok</label>
            <select
              value={form.ulok}
              onChange={(e) => setForm((s) => ({ ...s, ulok: e.target.value }))}
              disabled={!form.cabang || ulokOps.length === 0 || submitting}
              required
            >
              <option value="">Pilih nomor ulok…</option>
              {ulokOps.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="col">
            <label>Lingkup Kerja</label>
            <select
              value={form.lingkup}
              onChange={(e) =>
                setForm((s) => ({ ...s, lingkup: e.target.value }))
              }
              disabled={!form.ulok || lingkupOps.length === 0 || submitting}
              required
            >
              <option value="">Pilih lingkup…</option>
              {lingkupOps.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload file */}
        <div className="mt-5 mb-3">
          <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
            Upload File (PDF / Gambar)
          </label>

          <input
            type="file"
            accept=".pdf,image/*"
            onChange={onFileChange}
            required
            disabled={submitting}
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "10px",
            }}
          />

          <small style={{ display: "block", marginTop: 6, color: "#666" }}>
            Unggah dokumen yang sudah termeterai.
          </small>
        </div>

        {/* Error / info */}
        {error && (
          <div
            className="mt-3 p-2 rounded"
            style={{ background: "#fdecea", color: "#b00020" }}
          >
            {error}
          </div>
        )}
        {result && (
          <div
            className="mt-3 p-2 rounded"
            style={{ background: "#e8f5e9", color: "#1b5e20" }}
          >
            Dokumen berhasil disimpan.
          </div>
        )}

        {/* Tombol submit */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: "#d32f2f",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 24px",
              fontWeight: 600,
              cursor: submitting ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {submitting && <span className="btnSpinner" aria-hidden="true" />}
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>

      {/* CSS: spinner + overlay */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .loader {
          width: 56px; height: 56px;
          border: 5px solid #eaeaea;
          border-top-color: #d32f2f;
          border-radius: 50%;
          animation: spin .9s linear infinite;
        }

        .btnSpinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.8);
          border-right-color: transparent;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        .savingOverlay {
          position: fixed;
          inset: 0;
          background: rgba(255,255,255,.85);
          backdrop-filter: blur(2px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
          color: #333;
        }
      `}</style>
    </div>
  );
}
