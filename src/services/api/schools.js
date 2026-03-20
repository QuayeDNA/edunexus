import { supabase } from '../supabaseClient';

export const schoolsApi = {
  create: async (schoolData) => {
    const { data, error } = await supabase
      .from('schools')
      .insert(schoolData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  uploadLogo: async (schoolId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${schoolId}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('school-assets')
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('school-assets').getPublicUrl(path);
    return data.publicUrl;
  },
};
