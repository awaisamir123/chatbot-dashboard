
'use client'

import { useEffect, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { supabase } from '@/lib/supabaseClient'
import { generateChatbotScript } from '@/lib/chatbot-script'
import { User } from '@supabase/supabase-js'

type DocRow = {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  document_key: string
  created_at: string
}

export default function DashboardPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [documents, setDocuments] = useState<DocRow[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  const [showKeyModal, setShowKeyModal] = useState(false)
  const [currentDocumentKey, setCurrentDocumentKey] = useState('')
  const [currentFileName, setCurrentFileName] = useState('')

  const [showScriptModal, setShowScriptModal] = useState(false)
  const [generatedScript, setGeneratedScript] = useState('')

  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => setUser(null))
  }, [])

  const apiBase = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.origin
  }, [])

  useEffect(() => {
    if (!user) return
    loadDocuments(user.id)
  }, [user])

  const loadDocuments = async (userId: string) => {
    try {
      setIsLoadingDocs(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setDocuments((data as DocRow[]) || [])
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to load documents')
    } finally {
      setIsLoadingDocs(false)
    }
  }

  const uploadDocument = async (file: File, userId: string) => {
    const documentKey = uuidv4().replace(/-/g, '')
    const ext = file.name.split('.').pop() || 'dat'
    const path = `${userId}/${Date.now()}-${documentKey}.${ext}`

    const { data: uploadRes, error: uploadErr } = await supabase
      .storage.from('documents')
      .upload(path, file, { upsert: false })
    if (uploadErr) throw uploadErr
    if (!uploadRes?.path) throw new Error('Upload failed, path missing')

    const { data: insertRes, error: insertErr } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: uploadRes.path,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        document_key: documentKey
      })
      .select()
      .single()
    if (insertErr) throw insertErr

    return insertRes as DocRow
  }

  const handleFileUpload = async (file: File) => {
    if (!user) { toast.error('Please sign in first'); return }
    setUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) { clearInterval(progressInterval); return 90 }
          return prev + 10
        })
      }, 180)

      const created = await uploadDocument(file, user.id)
      setUploadProgress(100)
      toast.success('Document uploaded successfully')
      setCurrentDocumentKey(created.document_key)
      setCurrentFileName(file.name)
      setShowKeyModal(true)

      // prepare script in case user opens the script modal next
      const script = generateChatbotScript({
        documentKey: created.document_key,
        apiEndpoint: apiBase,
        theme: 'gradient',
        position: 'bottom-right',
        welcomeMessage: 'Hi, I can answer questions about your document.'
      })
      setGeneratedScript(script)

      await loadDocuments(user.id)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload document')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { toast.error('Max file size is 8 MB'); return }
    const allowed = ['.txt', '.pdf', '.docx', '.md']
    const ok = allowed.some(ext => file.name.toLowerCase().endsWith(ext))
    if (!ok) { toast.error('Allowed formats, .txt, .pdf, .docx, .md'); return }
    handleFileUpload(file)
    e.currentTarget.value = ''
  }

  const openScriptModalForDoc = (doc: DocRow) => {
    const script = generateChatbotScript({
      documentKey: doc.document_key,
      apiEndpoint: window.location.origin,
      theme: 'gradient',
      position: 'bottom-right',
      welcomeMessage: 'Hi, I can answer questions about your document.'
    })
    setGeneratedScript(script)
    setShowScriptModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" />
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Document Chat Dashboard</h1>
              <p className="text-sm text-gray-500">Upload a document, copy your embed script, paste it on your site</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {user ? <span>Signed in as {user.email || user.id}</span> : <span>Not signed in</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Upload a document</h2>
            <p className="mt-1 text-sm text-gray-500">Allowed formats, .txt, .pdf, .docx, .md, max 8 MB</p>
            <div className="mt-5 flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                <input type="file" className="hidden" onChange={onFileInputChange} />
                Choose file
              </label>
              {uploading && (
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Uploading, {uploadProgress}%</div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-2xl border bg-white">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Your documents</h2>
              <div className="text-sm text-gray-500">
                {isLoadingDocs ? 'Loading...' : `${documents.length} item${documents.length === 1 ? '' : 's'}`}
              </div>
            </div>

            <div className="divide-y">
              {documents.length === 0 && !isLoadingDocs && (
                <div className="px-6 py-12 text-center text-sm text-gray-500">
                  No documents yet, upload your first document
                </div>
              )}

              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-blue-50 ring-1 ring-blue-100" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">{doc.file_name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>Key, <span className="font-mono">{doc.document_key}</span></span>
                        <span>Size, {(doc.file_size / 1024).toFixed(1)} KB</span>
                        <span>Type, {doc.mime_type}</span>
                        <span>Uploaded, {new Date(doc.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentDocumentKey(doc.document_key)
                        setCurrentFileName(doc.file_name)
                        setShowKeyModal(true)
                      }}
                      className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Show Key
                    </button>
                    <button
                      onClick={() => openScriptModalForDoc(doc)}
                      className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                      Get Embed Script
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <DocumentKeyModal
        open={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        documentKey={currentDocumentKey}
        fileName={currentFileName}
        onOpenScript={() => { setShowKeyModal(false); setShowScriptModal(true) }}
      />

      <ScriptModal open={showScriptModal} onClose={() => setShowScriptModal(false)} scriptText={generatedScript} />
    </div>
  )
}

function DocumentKeyModal({
  open, onClose, documentKey, fileName, onOpenScript
}: { open: boolean, onClose: () => void, documentKey: string, fileName: string, onOpenScript: () => void }) {
  if (!open) return null
  const copyKey = async () => {
    try { await navigator.clipboard.writeText(documentKey); toast.success('Document key copied') }
    catch { toast.error('Copy failed') }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Upload Successful</h2>
          <p className="mt-1 text-gray-600">Your document is ready</p>
          <p className="mt-1 text-sm text-gray-500">{fileName}</p>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Document Key</label>
          <div className="relative">
            <input type="text" readOnly value={documentKey} className="w-full rounded-lg border bg-gray-50 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={copyKey} className="absolute right-2 top-2 rounded-md bg-white p-2 text-gray-500 ring-1 ring-gray-200 hover:text-blue-600" title="Copy key">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onOpenScript} className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-medium text-white hover:opacity-90">Get Embed Script</button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-800 hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  )
}

function ScriptModal({ open, onClose, scriptText }: { open: boolean, onClose: () => void, scriptText: string }) {
  if (!open) return null
  const copyScript = async () => {
    try { await navigator.clipboard.writeText(scriptText); toast.success('Chatbot script copied') }
    catch {
      const ta = document.createElement('textarea'); ta.value = scriptText; document.body.appendChild(ta)
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast.success('Chatbot script copied')
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800">Chatbot Script Generated</h2>
          <p className="text-gray-600">Copy this script and paste it before the closing &lt;/body&gt; tag</p>
        </div>
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-gray-700">Embed Code</label>
          <div className="relative">
            <textarea value={scriptText} readOnly className="h-64 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={copyScript} className="absolute right-2 top-2 rounded-md bg-white p-2 text-gray-400 hover:text-blue-600" title="Copy script">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={copyScript} className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-medium text-white hover:opacity-90">Copy Script</button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-800 hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  )
}
