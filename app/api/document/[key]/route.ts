import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const documentKey = params.key

    if (!documentKey) {
      return NextResponse.json({ error: 'Document key is required' }, { status: 400 })
    }

    // Get document metadata from database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .select('*')
      .eq('document_key', documentKey)
      .single()

    if (dbError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get file content from storage
    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (storageError || !fileData) {
      return NextResponse.json({ error: 'Failed to retrieve document content' }, { status: 500 })
    }

    // Convert file to text based on mime type
    let content = ''
    
    if (document.mime_type === 'text/plain') {
      content = await fileData.text()
    } else if (document.mime_type === 'application/pdf') {
      // For PDF, you might want to use a server-side PDF parser
      content = 'PDF content extraction not implemented on server side. Please use client-side processing.'
    } else {
      content = await fileData.text()
    }

    return NextResponse.json({
      success: true,
      document: {
        name: document.file_name,
        key: document.document_key,
        size: document.file_size,
        type: document.mime_type,
        uploadedAt: document.created_at
      },
      content: content.slice(0, 50000) // Limit content size
    })

  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}