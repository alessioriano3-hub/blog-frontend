import { useEffect, useState } from "react"
import { BE_URL } from "./config"

const api = async (path, { method = "GET", body, token, form } = {}) => {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers["Content-Type"] = "application/json"
  const res = await fetch(`${BE_URL}${path}`, {
    method,
    headers,
    body: form || (body ? JSON.stringify(body) : undefined),
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || "Errore")
  return data
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("accessToken"))
  const [blogs, setBlogs] = useState([])
  const [error, setError] = useState("")
  const [auth, setAuth] = useState({ name: "", surname: "", email: "", password: "" })
  const [blog, setBlog] = useState({ title: "", category: "", content: "" })

  // Dopo il login con Google il backend ci rimanda qui con ?accessToken=...
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("accessToken")
    if (t) {
      localStorage.setItem("accessToken", t)
      setToken(t)
      window.history.replaceState({}, "", "/")
    }
  }, [])

  const loadBlogs = () =>
    api("/blogs").then((d) => setBlogs(d.blogs)).catch((e) => setError(e.message))
  useEffect(() => { loadBlogs() }, [])

  const saveToken = (t) => { localStorage.setItem("accessToken", t); setToken(t) }
  const logout = () => { localStorage.removeItem("accessToken"); setToken(null) }
  const wrap = (fn) => async (e) => {
    e.preventDefault()
    setError("")
    try { await fn() } catch (err) { setError(err.message) }
  }

  const login = wrap(async () => {
    const d = await api("/login", { method: "POST", body: { email: auth.email, password: auth.password } })
    saveToken(d.accessToken)
  })
  const register = wrap(async () => {
    const d = await api("/authors", { method: "POST", body: auth })
    saveToken(d.accessToken)
  })
  const createBlog = wrap(async () => {
    await api("/blogs", { method: "POST", body: blog, token })
    setBlog({ title: "", category: "", content: "" })
    loadBlogs()
  })
  const uploadCover = (id) => async (e) => {
    const form = new FormData()
    form.append("cover", e.target.files[0])
    try { await api(`/blogs/${id}/cover`, { method: "POST", token, form }); loadBlogs() }
    catch (err) { setError(err.message) }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, fontFamily: "sans-serif" }}>
      <h1>Blog</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!token ? (
        <form onSubmit={login} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
          <input placeholder="Nome (solo registrazione)" value={auth.name} onChange={(e) => setAuth({ ...auth, name: e.target.value })} />
          <input placeholder="Cognome (solo registrazione)" value={auth.surname} onChange={(e) => setAuth({ ...auth, surname: e.target.value })} />
          <input placeholder="Email" type="email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
          <input placeholder="Password" type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">Accedi</button>
            <button type="button" onClick={register}>Registrati</button>
            <a href={`${BE_URL}/authors/googleLogin`}><button type="button">Accedi con Google</button></a>
          </div>
        </form>
      ) : (
        <>
          <button onClick={logout}>Esci</button>
          <form onSubmit={createBlog} style={{ display: "grid", gap: 8, margin: "16px 0 24px" }}>
            <input placeholder="Titolo" value={blog.title} onChange={(e) => setBlog({ ...blog, title: e.target.value })} />
            <input placeholder="Categoria" value={blog.category} onChange={(e) => setBlog({ ...blog, category: e.target.value })} />
            <textarea placeholder="Contenuto" value={blog.content} onChange={(e) => setBlog({ ...blog, content: e.target.value })} />
            <button type="submit">Pubblica</button>
          </form>
        </>
      )}

      {blogs.map((b) => (
        <article key={b._id} style={{ borderTop: "1px solid #ddd", padding: "12px 0" }}>
          {b.cover && <img src={b.cover} alt="" style={{ maxWidth: "100%", maxHeight: 220 }} />}
          <h3>{b.title} <small>({b.category})</small></h3>
          <p>{b.content}</p>
          <small>di {b.author?.name} {b.author?.surname}</small>
          {token && <div><input type="file" accept="image/*" onChange={uploadCover(b._id)} /></div>}
        </article>
      ))}
    </div>
  )
}
