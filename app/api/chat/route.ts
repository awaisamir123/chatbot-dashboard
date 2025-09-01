import { NextRequest, NextResponse } from 'next/server'
// import { supabase } from '@/lib/supabase'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { question, documentKey, apiKey } = await request.json()

    if (!question || !documentKey || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify document exists
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .select('file_name, file_path')
      .eq('document_key', documentKey)
      .single()

    if (dbError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get document content
    const { data: fileData, error: storageError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (storageError || !fileData) {
      return NextResponse.json({ error: 'Failed to retrieve document' }, { status: 500 })
    }

    const documentContent = await fileData.text()

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that answers questions based only on the provided document content. If the information is not in the document, say so clearly.'
          },
          {
            role: 'user',
            content: `Document content:
${documentContent}

Question: ${question}

Please answer based only on the document content above.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      return NextResponse.json({ 
        error: errorData.error?.message || 'OpenAI API error' 
      }, { status: openaiResponse.status })
    }

    const openaiData = await openaiResponse.json()
    const answer = openaiData.choices?.[0]?.message?.content || 'No response generated'

    return NextResponse.json({ 
      success: true, 
      answer,
      documentName: document.file_name 
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
  