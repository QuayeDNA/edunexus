import { supabase } from '../supabaseClient';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const buildObjectName = (file) => {
  const ext = (file?.name?.split('.').pop() || 'jpg').toLowerCase();
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${id}.${ext}`;
};

export const storageApi = {
  uploadPublicImage: async ({ file, folder, bucket = 'student-photos' }) => {
    if (!file) throw new Error('Please select an image file.');
    if (!file.type?.startsWith('image/')) {
      throw new Error('Only image files are allowed.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Image must be 5MB or less.');
    }

    const objectName = buildObjectName(file);
    const objectPath = folder ? `${folder}/${objectName}` : objectName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    return {
      path: objectPath,
      publicUrl: data.publicUrl,
    };
  },
};
