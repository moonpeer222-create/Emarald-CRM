import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Database Client Initialization
const supabaseUrl = `https://${projectId}.supabase.co`;
export const supabase = createClient(supabaseUrl, publicAnonKey);

/**
 * Real Document Upload Logic
 * Yeh function original photo upload karega aur database mein URL save karega.
 */
export async function uploadProductionDocument(file: File, caseId: string, docType: string) {
  const fileName = `${caseId}/${docType}_${Date.now()}.${file.name.split('.').pop()}`;

  // 1. Standard file upload to Storage bucket
  const { data: uploadData, error: uploadError } = await supabase.storage
   .from('make-documents') // bucket name from your screenshot
   .upload(fileName, file);

  if (uploadError) throw uploadError;

  // 2. Get Public URL for preview and download
  const { data: { publicUrl } } = supabase.storage
   .from('make-documents')
   .getPublicUrl(fileName);

  // 3. Insert real entry into 'documents' table (no mock data)
  const { error: dbError } = await supabase
   .from('documents')
   .insert();

  if (dbError) throw dbError;

  return publicUrl;
}