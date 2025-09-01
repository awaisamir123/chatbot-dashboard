// import { supabase } from './supabaseClient'
// import { v4 as uuidv4 } from 'uuid'

// export const uploadDocument = async (file: File, userId: string) => {
//   try {
//     // Generate unique file path
//     const fileExt = file.name.split('.').pop()
//     const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
//     const filePath = `documents/${userId}/${fileName}`

//     // Upload file to Supabase Storage
//     const { data: uploadData, error: uploadError } = await supabase.storage
//       .from('documents')
//       .upload(filePath, file)

//     if (uploadError) {
//       throw uploadError
//     }

//     // Generate document key
//     const documentKey = uuidv4()

//     // Save file metadata to database
//     const { data: dbData, error: dbError } = await supabase
//       .from('documents')
//       .insert({
//         user_id: userId,
//         file_name: file.name,
//         file_path: filePath,
//         file_size: file.size,
//         mime_type: file.type,
//         document_key: documentKey,
//       })
//       .select()
//       .single()

//     if (dbError) {
//       // If database insert fails, delete the uploaded file
//       await supabase.storage.from('documents').remove([filePath])
//       throw dbError
//     }

//     return { data: dbData, error: null }
//   } catch (error) {
//     return { data: null, error }
//   }
// }

// export const getUserDocuments = async (userId: string) => {
//   const { data, error } = await supabase
//     .from('documents')
//     .select('*')
//     .eq('user_id', userId)
//     .order('created_at', { ascending: false })

//   return { data, error }
// }

// lib/storage.ts - FIXED VERSION
import { supabase } from './supabaseClient'
import { v4 as uuidv4 } from 'uuid'

export const uploadDocument = async (file: File, userId: string) => {
  try {
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 50MB.');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload PDF, DOC, DOCX, TXT, or image files.');
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${timestamp}-${randomString}.${fileExt}`
    
    // Create file path: documents/userId/fileName
    const filePath = `${userId}/${fileName}`

    console.log('Uploading file:', {
      fileName,
      filePath,
      fileSize: file.size,
      fileType: file.type
    });

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    console.log('File uploaded successfully:', uploadData)

    // Generate unique document key
    const documentKey = uuidv4()

    // Save file metadata to database
    const documentData = {
      user_id: userId,
      file_name: file.name,
      file_path: uploadData.path,
      file_size: file.size,
      mime_type: file.type,
      document_key: documentKey,
    }

    console.log('Saving to database:', documentData)

    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      
      // If database insert fails, try to delete the uploaded file
      try {
        await supabase.storage.from('documents').remove([uploadData.path])
        console.log('Cleaned up uploaded file due to database error')
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError)
      }
      
      throw new Error(`Database error: ${dbError.message}`)
    }

    console.log('Document saved successfully:', dbData)
    return { data: dbData, error: null }

  } catch (error: any) {
    console.error('uploadDocument error:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error occurred') 
    }
  }
}

export const getUserDocuments = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get documents error:', error)
      throw error
    }

    return { data: data || [], error: null }
  } catch (error: any) {
    console.error('getUserDocuments error:', error)
    return { data: [], error }
  }
}

export const deleteDocument = async (documentId: string, filePath: string) => {
  try {
    // Delete from database first
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      throw dbError
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      // Don't throw here as the database record is already deleted
    }

    return { error: null }
  } catch (error: any) {
    console.error('deleteDocument error:', error)
    return { error }
  }
}

export const getDocumentUrl = async (filePath: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) {
      throw error
    }

    return { data: data.signedUrl, error: null }
  } catch (error: any) {
    console.error('getDocumentUrl error:', error)
    return { data: null, error }
  }
}
