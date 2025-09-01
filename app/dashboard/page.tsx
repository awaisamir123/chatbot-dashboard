// 'use client'

// import { useState, useEffect, useCallback } from 'react'
// import { getCurrentUser, signOut } from '@/lib/auth'
// import { uploadDocument, getUserDocuments } from '@/lib/storage'
// import { useRouter } from 'next/navigation'
// import toast from 'react-hot-toast'
// import { User } from '@supabase/supabase-js'
// import { Document } from '@/lib/supabaseClient'

// export default function Dashboard() {
//   const [user, setUser] = useState<User | null>(null)
//   const [documents, setDocuments] = useState<Document[]>([])
//   const [loading, setLoading] = useState(true)
//   const [uploading, setUploading] = useState(false)
//   const [uploadProgress, setUploadProgress] = useState(0)
//   const [dragOver, setDragOver] = useState(false)
//   const router = useRouter()

//   useEffect(() => {
//     checkUser()
//   }, [])

//   const checkUser = async () => {
//     try {
//       const currentUser = await getCurrentUser()
//       if (!currentUser) {
//         router.push('/')
//         return
//       }
//       setUser(currentUser)
//       await loadDocuments(currentUser.id)
//     } catch (error) {
//       console.error('Error checking user:', error)
//       router.push('/')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const loadDocuments = async (userId: string) => {
//     try {
//       const { data, error } = await getUserDocuments(userId)
//       if (error) throw error
//       setDocuments(data || [])
//     } catch (error: any) {
//       toast.error('Failed to load documents')
//       console.error('Error loading documents:', error)
//     }
//   }

//   const handleFileUpload = async (file: File) => {
//     if (!user) return

//     setUploading(true)
//     setUploadProgress(0)

//     try {
//       // Simulate progress for better UX
//       const progressInterval = setInterval(() => {
//         setUploadProgress(prev => {
//           if (prev >= 90) {
//             clearInterval(progressInterval)
//             return 90
//           }
//           return prev + 10
//         })
//       }, 200)

//       const { data, error } = await uploadDocument(file, user.id)
      
//       clearInterval(progressInterval)
//       setUploadProgress(100)

//       if (error) throw error

//       toast.success(`Document uploaded successfully! Key: ${data.document_key}`)
      
//       // Show the document key prominently
//       setTimeout(() => {
//         alert(`Document Key: ${data.document_key}\n\nPlease save this key for future reference!`)
//       }, 1000)

//       await loadDocuments(user.id)
//     } catch (error: any) {
//       toast.error(error.message || 'Failed to upload document')
//       console.error('Upload error:', error)
//     } finally {
//       setUploading(false)
//       setUploadProgress(0)
//     }
//   }

//   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (file) {
//       handleFileUpload(file)
//     }
//   }

//   const handleDrop = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setDragOver(false)
    
//     const file = e.dataTransfer.files[0]
//     if (file) {
//       handleFileUpload(file)
//     }
//   }, [])

//   const handleDragOver = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setDragOver(true)
//   }, [])

//   const handleDragLeave = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setDragOver(false)
//   }, [])

//   const handleSignOut = async () => {
//     try {
//       await signOut()
//       toast.success('Signed out successfully')
//       router.push('/')
//     } catch (error: any) {
//       toast.error('Failed to sign out')
//     }
//   }

//   const formatFileSize = (bytes: number) => {
//     if (bytes === 0) return '0 Bytes'
//     const k = 1024
//     const sizes = ['Bytes', 'KB', 'MB', 'GB']
//     const i = Math.floor(Math.log(bytes) / Math.log(k))
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
//   }

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     })
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen gradient-bg flex items-center justify-center">
//         <div className="bg-white p-8 rounded-2xl card-shadow">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="text-center mt-4 text-gray-600">Loading dashboard...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm border-b">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-4">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">Document Dashboard</h1>
//               <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
//             </div>
//             <button
//               onClick={handleSignOut}
//               className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200"
//             >
//               Sign Out
//             </button>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Upload Section */}
//         <div className="bg-white rounded-2xl card-shadow p-8 mb-8">
//           <h2 className="text-xl font-semibold text-gray-800 mb-6">Upload Document</h2>
          
//           <div
//             className={`upload-area border-2 border-dashed rounded-xl p-12 text-center ${
//               dragOver 
//                 ? 'dragover border-blue-500 bg-blue-50' 
//                 : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
//             }`}
//             onDrop={handleDrop}
//             onDragOver={handleDragOver}
//             onDragLeave={handleDragLeave}
//           >
//             {uploading ? (
//               <div>
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//                 <p className="text-gray-600 mb-4">Uploading document...</p>
//                 <div className="w-full bg-gray-200 rounded-full h-2">
//                   <div 
//                     className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
//                     style={{ width: `${uploadProgress}%` }}
//                   ></div>
//                 </div>
//                 <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
//               </div>
//             ) : (
//               <>
//                 <div className="text-4xl mb-4">📄</div>
//                 <p className="text-lg font-medium text-gray-700 mb-2">
//                   Drop your document here or click to browse
//                 </p>
//                 <p className="text-sm text-gray-500 mb-6">
//                   Support for PDF, DOC, DOCX, TXT and image files
//                 </p>
//                 <input
//                   type="file"
//                   onChange={handleFileSelect}
//                   className="hidden"
//                   id="file-upload"
//                   accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
//                 />
//                 <label
//                   htmlFor="file-upload"
//                   className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition duration-200 cursor-pointer inline-block"
//                 >
//                   Choose File
//                 </label>
//               </>
//             )}
//           </div>
//         </div>

//         {/* Documents List */}
//         <div className="bg-white rounded-2xl card-shadow p-8">
//           <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Documents</h2>
          
//           {documents.length === 0 ? (
//             <div className="text-center py-12">
//               <div className="text-4xl mb-4">📂</div>
//               <p className="text-gray-500">No documents uploaded yet</p>
//               <p className="text-sm text-gray-400 mt-2">Upload your first document to get started</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {documents.map((doc) => (
//                 <div key={doc.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-200">
//                   <div className="flex items-center justify-between">
//                     <div className="flex-1">
//                       <h3 className="font-medium text-gray-900 mb-1">{doc.file_name}</h3>
//                       <p className="text-sm text-gray-500 mb-2">
//                         {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
//                       </p>
//                       <div className="bg-gray-900 text-white px-3 py-2 rounded-md font-mono text-sm break-all">
//                         <span className="text-gray-400">Key:</span> {doc.document_key}
//                       </div>
//                     </div>
//                     <div className="ml-4">
//                       <button
//                         onClick={() => {
//                           navigator.clipboard.writeText(doc.document_key)
//                           toast.success('Document key copied to clipboard!')
//                         }}
//                         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition duration-200"
//                       >
//                         Copy Key
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   )
// }

// 'use client'

// import { useState, useEffect, useCallback } from 'react'
// import { getCurrentUser, signOut } from '@/lib/auth'
// import { uploadDocument, getUserDocuments } from '@/lib/storage'
// import { useRouter } from 'next/navigation'
// import toast from 'react-hot-toast'
// import { User } from '@supabase/supabase-js'
// import { Document } from '@/lib/supabaseClient'


// export default function Dashboard() {
//   const [user, setUser] = useState<User | null>(null)
//   const [documents, setDocuments] = useState<Document[]>([])
//   const [loading, setLoading] = useState(true)
//   const [uploading, setUploading] = useState(false)
//   const [uploadProgress, setUploadProgress] = useState(0)
//   const [dragOver, setDragOver] = useState(false)
//   const [showKeyModal, setShowKeyModal] = useState(false)
//   const [currentDocumentKey, setCurrentDocumentKey] = useState('')
//   const [currentFileName, setCurrentFileName] = useState('')
//   const router = useRouter()

//   useEffect(() => {
//     checkUser()
//   }, [])

//   const checkUser = async () => {
//     try {
//       const currentUser = await getCurrentUser()
//       if (!currentUser) {
//         router.push('/')
//         return
//       }
//       setUser(currentUser)
//       await loadDocuments(currentUser.id)
//     } catch (error) {
//       console.error('Error checking user:', error)
//       router.push('/')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const loadDocuments = async (userId: string) => {
//     try {
//       const { data, error } = await getUserDocuments(userId)
//       if (error) throw error
//       setDocuments(data || [])
//     } catch (error: any) {
//       toast.error('Failed to load documents')
//       console.error('Error loading documents:', error)
//     }
//   }

//   const handleFileUpload = async (file: File) => {
//     if (!user) return

//     setUploading(true)
//     setUploadProgress(0)

//     try {
//       // Simulate progress for better UX
//       const progressInterval = setInterval(() => {
//         setUploadProgress(prev => {
//           if (prev >= 90) {
//             clearInterval(progressInterval)
//             return 90
//           }
//           return prev + 10
//         })
//       }, 200)

//       const { data, error } = await uploadDocument(file, user.id)
      
//       clearInterval(progressInterval)
//       setUploadProgress(100)

//       if (error) throw error

//       toast.success(`Document uploaded successfully!`)
      
//       // Show the document key in modal
//       setCurrentDocumentKey(data.document_key)
//       setCurrentFileName(file.name)
//       setShowKeyModal(true)

//       await loadDocuments(user.id)
//     } catch (error: any) {
//       toast.error(error.message || 'Failed to upload document')
//       console.error('Upload error:', error)
//     } finally {
//       setUploading(false)
//       setUploadProgress(0)
//     }
//   }

//   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (file) {
//       handleFileUpload(file)
//     }
//   }

//   const handleDrop = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setDragOver(false)
    
//     const file = e.dataTransfer.files[0]
//     if (file) {
//       handleFileUpload(file)
//     }
//   }, [])

//   const handleDragOver = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setDragOver(true)
//   }, [])

//   const handleDragLeave = useCallback((e: React.DragEvent) => {
//     e.preventDefault()
//     setDragOver(false)
//   }, [])

//   const handleSignOut = async () => {
//     try {
//       await signOut()
//       toast.success('Signed out successfully')
//       router.push('/')
//     } catch (error: any) {
//       toast.error('Failed to sign out')
//     }
//   }

//   const formatFileSize = (bytes: number) => {
//     if (bytes === 0) return '0 Bytes'
//     const k = 1024
//     const sizes = ['Bytes', 'KB', 'MB', 'GB']
//     const i = Math.floor(Math.log(bytes) / Math.log(k))
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
//   }

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     })
//   }

//   const copyToClipboard = async (text: string) => {
//     try {
//       await navigator.clipboard.writeText(text)
//       toast.success('Document key copied to clipboard!')
//     } catch (err) {
//       // Fallback for browsers that don't support clipboard API
//       const textArea = document.createElement('textarea')
//       textArea.value = text
//       document.body.appendChild(textArea)
//       textArea.focus()
//       textArea.select()
//       try {
//         document.execCommand('copy')
//         toast.success('Document key copied to clipboard!')
//       } catch (err) {
//         toast.error('Failed to copy to clipboard')
//       }
//       document.body.removeChild(textArea)
//     }
//   }

//   // Document Key Modal Component
//   const DocumentKeyModal = () => {
//     if (!showKeyModal) return null

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//         <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-200 scale-100">
//           <div className="text-center mb-6">
//             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
//               </svg>
//             </div>
//             <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Successful!</h2>
//             <p className="text-gray-600 mb-2">Your document has been uploaded successfully</p>
//             <p className="text-sm text-gray-500 font-medium">{currentFileName}</p>
//           </div>

//           <div className="mb-6">
//             <label className="block text-sm font-medium text-gray-700 mb-3">
//               Document Key (Save this for future reference)
//             </label>
//             <div className="relative">
//               <input
//                 type="text"
//                 value={currentDocumentKey}
//                 readOnly
//                 className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               />
//               <button
//                 onClick={() => copyToClipboard(currentDocumentKey)}
//                 className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
//                 title="Copy to clipboard"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
//                 </svg>
//               </button>
//             </div>
//           </div>

//           <div className="flex gap-3">
//             <button
//               onClick={() => copyToClipboard(currentDocumentKey)}
//               className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-2"
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
//               </svg>
//               Copy Key
//             </button>
//             <button
//               onClick={() => {
//                 setShowKeyModal(false)
//                 setCurrentDocumentKey('')
//                 setCurrentFileName('')
//               }}
//               className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition duration-200"
//             >
//               Close
//             </button>
//           </div>

//           <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
//             <p className="text-xs text-yellow-800">
//               <span className="font-semibold">Important:</span> Please save this key securely. You'll need it to reference your document later.
//             </p>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen gradient-bg flex items-center justify-center">
//         <div className="bg-white p-8 rounded-2xl card-shadow">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="text-center mt-4 text-gray-600">Loading dashboard...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Document Key Modal */}
//       <DocumentKeyModal />

//       {/* Header */}
//       <header className="bg-white shadow-sm border-b">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-4">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">Document Dashboard</h1>
//               <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
//             </div>
//             <button
//               onClick={handleSignOut}
//               className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200"
//             >
//               Sign Out
//             </button>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Upload Section */}
//         <div className="bg-white rounded-2xl card-shadow p-8 mb-8">
//           <h2 className="text-xl font-semibold text-gray-800 mb-6">Upload Document</h2>
          
//           <div
//             className={`upload-area border-2 border-dashed rounded-xl p-12 text-center ${
//               dragOver 
//                 ? 'dragover border-blue-500 bg-blue-50' 
//                 : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
//             }`}
//             onDrop={handleDrop}
//             onDragOver={handleDragOver}
//             onDragLeave={handleDragLeave}
//           >
//             {uploading ? (
//               <div>
//                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
//                 <p className="text-gray-600 mb-4">Uploading document...</p>
//                 <div className="w-full bg-gray-200 rounded-full h-2">
//                   <div 
//                     className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
//                     style={{ width: `${uploadProgress}%` }}
//                   ></div>
//                 </div>
//                 <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
//               </div>
//             ) : (
//               <>
//                 <div className="text-4xl mb-4">📄</div>
//                 <p className="text-lg font-medium text-gray-700 mb-2">
//                   Drop your document here or click to browse
//                 </p>
//                 <p className="text-sm text-gray-500 mb-6">
//                   Support for PDF, DOC, DOCX, TXT
//                 </p>
//                 <input
//                   type="file"
//                   onChange={handleFileSelect}
//                   className="hidden"
//                   id="file-upload"
//                   accept=".pdf,.doc,.docx,.txt"
//                 />
//                 <label
//                   htmlFor="file-upload"
//                   className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition duration-200 cursor-pointer inline-block"
//                 >
//                   Choose File
//                 </label>
//               </>
//             )}
//           </div>
//         </div>

//         {/* Documents List */}
//         <div className="bg-white rounded-2xl card-shadow p-8">
//           <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Documents</h2>
          
//           {documents.length === 0 ? (
//             <div className="text-center py-12">
//               <div className="text-4xl mb-4">📂</div>
//               <p className="text-gray-500">No documents uploaded yet</p>
//               <p className="text-sm text-gray-400 mt-2">Upload your first document to get started</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {documents.map((doc) => (
//                 <div key={doc.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-200">
//                   <div className="flex items-center justify-between">
//                     <div className="flex-1">
//                       <h3 className="font-medium text-gray-900 mb-1">{doc.file_name}</h3>
//                       <p className="text-sm text-gray-500 mb-2">
//                         {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
//                       </p>
//                       <div className="bg-gray-900 text-white px-3 py-2 rounded-md font-mono text-sm break-all">
//                         <span className="text-gray-400">Key:</span> {doc.document_key}
//                       </div>
//                     </div>
//                     <div className="ml-4">
//                       <button
//                         onClick={() => copyToClipboard(doc.document_key)}
//                         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition duration-200"
//                       >
//                         Copy Key
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </main>
//     </div>
//   )
// }



// 'use client'

// import { useEffect, useMemo, useState } from 'react'
// import { v4 as uuidv4 } from 'uuid'
// import { toast, ToastContainer } from 'react-toastify'
// import 'react-toastify/dist/ReactToastify.css'
// import { supabase } from '@/lib/supabaseClient'
// import { generateChatbotScript } from '@/lib/chatbot-script'
// import { User } from '@supabase/supabase-js'

// // If you already have an auth context, replace this stub with your hook
// // Example: const { user } = useAuth()
// type UserStub = { id: string, email?: string | null }
// const useUserStub = (): { user: UserStub | null } => {
//   // Replace with your actual user logic
//   const [user, setUser] = useState<UserStub | null>(null)
//   useEffect(() => {
//     // Demo only, replace with Supabase Auth or your auth
//     setUser({ id: 'demo-user-id', email: 'demo@example.com' })
//   }, [])
//   return { user }
// }

// type DocRow = {
//   id: string
//   user_id: string
//   file_name: string
//   file_path: string
//   file_size: number
//   mime_type: string
//   document_key: string
//   created_at: string
// }

// export default function DashboardPage() {
//   // const { user } = useUserStub()

//   const [uploading, setUploading] = useState(false)
//   const [uploadProgress, setUploadProgress] = useState(0)
//   const [documents, setDocuments] = useState<DocRow[]>([])
//   const [isLoadingDocs, setIsLoadingDocs] = useState(false)

//   const [showKeyModal, setShowKeyModal] = useState(false)
//   const [currentDocumentKey, setCurrentDocumentKey] = useState('')
//   const [currentFileName, setCurrentFileName] = useState('')

//   const [showScriptModal, setShowScriptModal] = useState(false)
//   const [generatedScript, setGeneratedScript] = useState('')

//   const [user, setUser] = useState<User | null>(null)

//   useEffect(() => {
//     supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => setUser(null))
//   }, [])


//   // Config you might want to centralize
//   const apiBase = useMemo(() => {
//     if (typeof window === 'undefined') return ''
//     return window.location.origin
//   }, [])

//   useEffect(() => {
//     if (!user) return
//     loadDocuments(user.id)
//   }, [user])

//   const loadDocuments = async (userId: string) => {
//     try {
//       setIsLoadingDocs(true)
//       const { data, error } = await supabase
//         .from('documents')
//         .select('*')
//         .eq('user_id', userId)
//         .order('created_at', { ascending: false })
//       if (error) throw error
//       setDocuments((data as DocRow[]) || [])
//     } catch (err: any) {
//       console.error(err)
//       toast.error(err.message || 'Failed to load documents')
//     } finally {
//       setIsLoadingDocs(false)
//     }
//   }

//   const uploadDocument = async (file: File, userId: string) => {
//     // 1, create document_key
//     const documentKey = uuidv4().replace(/-/g, '')
//     const ext = file.name.split('.').pop() || 'dat'
//     const path = `${userId}/${Date.now()}-${documentKey}.${ext}`

//     // 2, upload to storage
//     const { data: uploadRes, error: uploadErr } = await supabase
//       .storage
//       .from('documents')
//       .upload(path, file, { upsert: false })

//     if (uploadErr) throw uploadErr
//     if (!uploadRes?.path) throw new Error('Upload failed, path missing')

//     // 3, write DB row
//     const { data: insertRes, error: insertErr } = await supabase
//       .from('documents')
//       .insert({
//         user_id: userId,
//         file_name: file.name,
//         file_path: uploadRes.path,
//         file_size: file.size,
//         mime_type: file.type || 'application/octet-stream',
//         document_key: documentKey
//       })
//       .select()
//       .single()

//     if (insertErr) throw insertErr
//     return insertRes as DocRow
//   }

//   const handleFileUpload = async (file: File) => {
//     if (!user) {
//       toast.error('Please sign in first')
//       return
//     }
//     setUploading(true)
//     setUploadProgress(0)

//     try {
//       // simple fake progress for UX, real progress requires custom uploader
//       const progressInterval = setInterval(() => {
//         setUploadProgress(prev => {
//           if (prev >= 90) {
//             clearInterval(progressInterval)
//             return 90
//           }
//           return prev + 10
//         })
//       }, 180)

//       const created = await uploadDocument(file, user.id)

//       setUploadProgress(100)
//       toast.success('Document uploaded successfully')
//       setCurrentDocumentKey(created.document_key)
//       setCurrentFileName(file.name)
//       setShowKeyModal(true)

//       // Generate embed script
//       // const script = generateChatbotScript({
//       //   documentKey: created.document_key,
//       //   apiEndpoint: apiBase,
//       //   theme: 'gradient',
//       //   position: 'bottom-right',
//       //   welcomeMessage: `Hi, I can answer questions about your document, Please enter your OpenAI API key to start.`
//       // })

//       const script = generateChatbotScript({
//         documentKey: created.document_key,
//         apiEndpoint: window.location.origin,
//         welcomeMessage: `Hi, I can answer questions about document, Please enter your OpenAI API key to start.`,
//         theme: 'gradient',
//         position: 'bottom-right'
//       })
      
//       setGeneratedScript(script)

//       await loadDocuments(user.id)
//     } catch (error: any) {
//       console.error('Upload error:', error)
//       toast.error(error.message || 'Failed to upload document')
//     } finally {
//       setUploading(false)
//       setUploadProgress(0)
//     }
//   }

//   const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return
//     if (file.size > 8 * 1024 * 1024) {
//       toast.error('Max file size is 8 MB')
//       return
//     }
//     const allowed = ['.txt', '.pdf', '.docx', '.md']
//     const ok = allowed.some(ext => file.name.toLowerCase().endsWith(ext))
//     if (!ok) {
//       toast.error('Allowed formats, .txt, .pdf, .docx, .md')
//       return
//     }
//     handleFileUpload(file)
//     e.currentTarget.value = ''
//   }

//   const openScriptModalForDoc = (doc: DocRow) => {
//     const script = generateChatbotScript({
//       documentKey: doc.document_key,
//       apiEndpoint: window.location.origin,
//       theme: 'gradient',
//       position: 'bottom-right',
//       welcomeMessage: `Hi, I can answer questions about document, Please enter your OpenAI API key to start.`
//     })
//     setGeneratedScript(script)
//     setShowScriptModal(true)
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <ToastContainer position="top-right" />

//       <header className="border-b bg-white">
//         <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600" />
//             <div>
//               <h1 className="text-xl font-semibold text-gray-900">Document Chat Dashboard</h1>
//               <p className="text-sm text-gray-500">
//                 Upload a document, copy your embed script, paste it on your site
//               </p>
//             </div>
//           </div>
//           <div className="text-sm text-gray-600">
//             {user ? <span>Signed in as {user.email || user.id}</span> : <span>Not signed in</span>}
//           </div>
//         </div>
//       </header>

//       <main className="mx-auto max-w-6xl px-4 py-8">
//         {/* Uploader */}
//         <section className="mb-8">
//           <div className="rounded-2xl border bg-white p-6">
//             <h2 className="text-lg font-semibold text-gray-900">Upload a document</h2>
//             <p className="mt-1 text-sm text-gray-500">
//               Allowed formats, .txt, .pdf, .docx, .md, max 8 MB
//             </p>

//             <div className="mt-5 flex items-center gap-3">
//               <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
//                 <input type="file" className="hidden" onChange={onFileInputChange} />
//                 Choose file
//               </label>

//               {uploading && (
//                 <div className="flex-1">
//                   <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
//                     <div
//                       className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
//                       style={{ width: `${uploadProgress}%` }}
//                     />
//                   </div>
//                   <div className="mt-1 text-xs text-gray-500">Uploading, {uploadProgress}%</div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </section>

//         {/* Documents list */}
//         <section>
//           <div className="rounded-2xl border bg-white">
//             <div className="flex items-center justify-between px-6 py-4">
//               <h2 className="text-lg font-semibold text-gray-900">Your documents</h2>
//               <div className="text-sm text-gray-500">
//                 {isLoadingDocs ? 'Loading...' : `${documents.length} item${documents.length === 1 ? '' : 's'}`}
//               </div>
//             </div>

//             <div className="divide-y">
//               {documents.length === 0 && !isLoadingDocs && (
//                 <div className="px-6 py-12 text-center text-sm text-gray-500">
//                   No documents yet, upload your first document
//                 </div>
//               )}

//               {documents.map(doc => (
//                 <div key={doc.id} className="flex items-center justify-between px-6 py-4">
//                   <div className="flex min-w-0 items-center gap-3">
//                     <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-blue-50 ring-1 ring-blue-100" />
//                     <div className="min-w-0">
//                       <div className="truncate text-sm font-medium text-gray-900">
//                         {doc.file_name}
//                       </div>
//                       <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
//                         <span>Key, <span className="font-mono">{doc.document_key}</span></span>
//                         <span>Size, {(doc.file_size / 1024).toFixed(1)} KB</span>
//                         <span>Type, {doc.mime_type}</span>
//                         <span>
//                           Uploaded, {new Date(doc.created_at).toLocaleString()}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex items-center gap-2">
//                     <button
//                       onClick={() => {
//                         setCurrentDocumentKey(doc.document_key)
//                         setCurrentFileName(doc.file_name)
//                         setShowKeyModal(true)
//                       }}
//                       className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
//                     >
//                       Show Key
//                     </button>
//                     <button
//                       onClick={() => openScriptModalForDoc(doc)}
//                       className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
//                     >
//                       Get Embed Script
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>
//       </main>

//       {/* Document Key Modal */}
//       <DocumentKeyModal
//         open={showKeyModal}
//         onClose={() => setShowKeyModal(false)}
//         documentKey={currentDocumentKey}
//         fileName={currentFileName}
//         onOpenScript={() => {
//           setShowKeyModal(false)
//           setShowScriptModal(true)
//         }}
//       />

//       {/* Script Modal */}
//       <ScriptModal
//         open={showScriptModal}
//         onClose={() => setShowScriptModal(false)}
//         scriptText={generatedScript}
//       />
//     </div>
//   )
// }

// /* ------------------------- DocumentKeyModal ------------------------- */

// function DocumentKeyModal({
//   open,
//   onClose,
//   documentKey,
//   fileName,
//   onOpenScript
// }: {
//   open: boolean
//   onClose: () => void
//   documentKey: string
//   fileName: string
//   onOpenScript: () => void
// }) {
//   if (!open) return null

//   const copyKey = async () => {
//     try {
//       await navigator.clipboard.writeText(documentKey)
//       toast.success('Document key copied')
//     } catch {
//       toast.error('Copy failed')
//     }
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
//       <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
//         <div className="text-center">
//           <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
//             <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
//             </svg>
//           </div>
//           <h2 className="text-2xl font-bold text-gray-800">Upload Successful</h2>
//           <p className="mt-1 text-gray-600">Your document is ready</p>
//           <p className="mt-1 text-sm text-gray-500">{fileName}</p>
//         </div>

//         <div className="mt-6">
//           <label className="mb-2 block text-sm font-medium text-gray-700">Document Key</label>
//           <div className="relative">
//             <input
//               type="text"
//               readOnly
//               value={documentKey}
//               className="w-full rounded-lg border bg-gray-50 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <button
//               onClick={copyKey}
//               className="absolute right-2 top-2 rounded-md bg-white p-2 text-gray-500 ring-1 ring-gray-200 hover:text-blue-600"
//               title="Copy key"
//             >
//               <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
//               </svg>
//             </button>
//           </div>
//         </div>

//         <div className="mt-6 flex gap-3">
//           <button
//             onClick={onOpenScript}
//             className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-medium text-white hover:opacity-90"
//           >
//             Get Embed Script
//           </button>
//           <button
//             onClick={onClose}
//             className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-800 hover:bg-gray-200"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// /* --------------------------- ScriptModal --------------------------- */

// function ScriptModal({
//   open,
//   onClose,
//   scriptText
// }: {
//   open: boolean
//   onClose: () => void
//   scriptText: string
// }) {
//   if (!open) return null

//   const copyScript = async () => {
//     try {
//       await navigator.clipboard.writeText(scriptText)
//       toast.success('Chatbot script copied')
//     } catch {
//       // Fallback
//       const textArea = document.createElement('textarea')
//       textArea.value = scriptText
//       document.body.appendChild(textArea)
//       textArea.select()
//       document.execCommand('copy')
//       document.body.removeChild(textArea)
//       toast.success('Chatbot script copied')
//     }
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
//       <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6">
//         <div className="mb-6 text-center">
//           <h2 className="mb-2 text-2xl font-bold text-gray-800">Chatbot Script Generated</h2>
//           <p className="text-gray-600">Copy this script and paste it before the closing &lt;/body&gt; tag</p>
//         </div>

//         <div className="mb-6">
//           <label className="mb-3 block text-sm font-medium text-gray-700">
//             Embed Code
//           </label>
//           <div className="relative">
//             <textarea
//               value={scriptText}
//               readOnly
//               className="h-64 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//             <button
//               onClick={copyScript}
//               className="absolute right-2 top-2 rounded-md bg-white p-2 text-gray-400 hover:text-blue-600"
//               title="Copy script"
//             >
//               <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
//               </svg>
//             </button>
//           </div>
//         </div>

//         <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
//           <h3 className="mb-2 font-semibold text-blue-800">How to use</h3>
//           <ol className="space-y-1 text-sm text-blue-700">
//             <li>1, Copy the script above</li>
//             <li>2, Paste it before the closing &lt;/body&gt; tag of your website</li>
//             <li>3, Visitors will see a chat icon on your website</li>
//             <li>4, They will enter their OpenAI API key to start</li>
//             <li>5, The chatbot will answer questions based on your uploaded document</li>
//           </ol>
//         </div>

//         <div className="flex gap-3">
//           <button
//             onClick={copyScript}
//             className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-medium text-white hover:opacity-90"
//           >
//             Copy Script
//           </button>
//           <button
//             onClick={onClose}
//             className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-800 hover:bg-gray-200"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }


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
