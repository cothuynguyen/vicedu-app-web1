/**
 * Hàm nén ảnh ngay tại trình duyệt bằng HTML5 Canvas.
 * Giúp thu nhỏ dung lượng ảnh trước khi upload lên Cloudflare / Supabase Storage,
 * tiết kiệm băng thông và dung lượng cực kỳ hiệu quả mà vẫn đảm bảo độ sắc nét cao.
 */
export const compressImage = (
  file: File, 
  maxWidth = 1920, 
  maxHeight = 1920, 
  quality = 0.85
): Promise<File> => {
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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
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

/**
 * Hàm nén tài liệu, hợp đồng, bảng biểu A4 với độ nét cao (2K / 2400px, quality 0.9).
 */
export const compressDocumentImage = (file: File): Promise<File> => {
  return compressImage(file, 2400, 2400, 0.9);
};
