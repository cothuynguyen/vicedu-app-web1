export const uploadImageToCloudflare = async (file: File | Blob): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to upload image');
  }
  
  return data.url;
};
