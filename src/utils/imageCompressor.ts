/**
 * Hàm nén ảnh ngay tại trình duyệt bằng HTML5 Canvas.
 * Giúp thu nhỏ dung lượng ảnh (đặc biệt là ảnh chụp từ điện thoại) xuống dưới 100KB - 300KB
 * trước khi upload lên Supabase Storage, tiết kiệm băng thông và dung lượng cực kỳ hiệu quả.
 */
export const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Tính toán tỷ lệ khung hình
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Không thể khởi tạo Canvas"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Chuyển đổi Blob thành File để tương thích với Supabase Upload
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Lỗi khi chuyển đổi canvas sang blob"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
