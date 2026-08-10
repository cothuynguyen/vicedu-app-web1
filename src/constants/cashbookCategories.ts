export interface CashbookCategory {
  id: string;
  name: string;
  type: 'Thu' | 'Chi';
  parentId?: string | null;
}

export const CASHBOOK_CATEGORIES: CashbookCategory[] = [
  // Parent Thu
  { id: '109.DTTC', name: 'DOANH THU TÀI CHÍNH', type: 'Thu', parentId: null },
  { id: '1091', name: 'Học viên học đầu vào trình độ Kindy', type: 'Thu', parentId: '109.DTTC' },
  { id: '1092', name: 'Học viên học đầu vào trình độ Kids', type: 'Thu', parentId: '109.DTTC' },
  { id: '1093', name: 'Học viên học đầu vào trình độ Teen', type: 'Thu', parentId: '109.DTTC' },
  { id: '1094', name: 'Học viên học đầu vào trình độ IELTs', type: 'Thu', parentId: '109.DTTC' },
  { id: '1095', name: 'Học viên VIP', type: 'Thu', parentId: '109.DTTC' },
  { id: '1096', name: 'Học viên lớp nhóm GROUP', type: 'Thu', parentId: '109.DTTC' },
  { id: '1097', name: 'Liên kết trường', type: 'Thu', parentId: '109.DTTC' },
  { id: '1098', name: 'Bán sách, Đồ dùng học viên...', type: 'Thu', parentId: '109.DTTC' },
  { id: '1099', name: 'Thu tiền Khóa học KNS chuyên sâu', type: 'Thu', parentId: '109.DTTC' },
  { id: '10910', name: 'Góp cổ đông', type: 'Thu', parentId: '109.DTTC' },
  { id: '10911', name: 'Thu học phí Tiếng Anh Quốc Tế', type: 'Thu', parentId: '109.DTTC' },
  { id: '10912', name: 'Nhập quỹ Kế toán', type: 'Thu', parentId: '109.DTTC' },

  // Parent Chi
  { id: '101.CPVPP', name: 'CHI PHÍ VĂN PHÒNG PHẨM', type: 'Chi', parentId: null },
  { id: '1011', name: 'Giấy in (A4,A5...)', type: 'Chi', parentId: '101.CPVPP' },
  { id: '1012', name: 'Bút dạ viết bảng', type: 'Chi', parentId: '101.CPVPP' },
  { id: '1013', name: 'Các loại văn phòng phẩm khác', type: 'Chi', parentId: '101.CPVPP' },
  { id: '1014', name: 'Nước uống', type: 'Chi', parentId: '101.CPVPP' },
  { id: '1015', name: 'Thiết bị vệ sinh', type: 'Chi', parentId: '101.CPVPP' },
  { id: '1016', name: 'Đổ Mực in', type: 'Chi', parentId: '101.CPVPP' },
  { id: '1017', name: 'Phô tô', type: 'Chi', parentId: '101.CPVPP' },

  { id: '102.CPSKM', name: 'CHI PHÍ MARKETING', type: 'Chi', parentId: null },
  { id: '1021', name: 'Đồ đạc phục vụ sự kiện', type: 'Chi', parentId: '102.CPSKM' },
  { id: '1022', name: 'In ấn phẩm truyền thông', type: 'Chi', parentId: '102.CPSKM' },
  { id: '1023', name: 'Sự kiện Sân khấu (in back, khung, standee...)', type: 'Chi', parentId: '102.CPSKM' },
  { id: '1024', name: 'Mini Event (Sự kiện nhỏ trong TT)', type: 'Chi', parentId: '102.CPSKM' },
  { id: '1025', name: 'Chi phí Liên kết chéo (QR code...)', type: 'Chi', parentId: '102.CPSKM' },
  { id: '1026', name: 'Liên kết trường (Biển bảng, tiền mặt, quà tặng)', type: 'Chi', parentId: '102.CPSKM' },
  { id: '1027', name: 'Xuất kho (phục vụ cho chương trình)', type: 'Chi', parentId: '102.CPSKM' },
  { id: '1028', name: 'Chạy quảng cáo', type: 'Chi', parentId: '102.CPSKM' },

  { id: '103.CPVH', name: 'CHI PHÍ VẬN HÀNH CƠ SỞ VẬT CHẤT', type: 'Chi', parentId: null },
  { id: '1031', name: 'Cước tổng đài', type: 'Chi', parentId: '103.CPVH' },
  { id: '1032', name: 'Tiền điện', type: 'Chi', parentId: '103.CPVH' },
  { id: '1033', name: 'Tiền nước', type: 'Chi', parentId: '103.CPVH' },
  { id: '1034', name: 'Tín ngưỡng, thờ cúng, lễ bái', type: 'Chi', parentId: '103.CPVH' },
  { id: '1035', name: 'Tiền thuê nhà', type: 'Chi', parentId: '103.CPVH' },
  { id: '1036', name: 'Bảo hành/đồ sửa chữa (kìm, dây thép, khoan đục...)', type: 'Chi', parentId: '103.CPVH' },
  { id: '1037', name: 'Đầu tư sắm mới', type: 'Chi', parentId: '103.CPVH' },
  { id: '1038', name: 'Cước Internet', type: 'Chi', parentId: '103.CPVH' },

  { id: '104.CPBH', name: 'CHI PHÍ BẢO HÀNH BẢO TRÌ', type: 'Chi', parentId: null },
  { id: '1041', name: 'Sơn sửa phòng', type: 'Chi', parentId: '104.CPBH' },
  { id: '1042', name: 'Trang trí phòng (Dán Decal, vẽ tranh...)', type: 'Chi', parentId: '104.CPBH' },
  { id: '1043', name: 'Sửa điện nước', type: 'Chi', parentId: '104.CPBH' },
  { id: '1044', name: 'Sửa bàn ghế', type: 'Chi', parentId: '104.CPBH' },
  { id: '1045', name: 'Thay bóng đèn', type: 'Chi', parentId: '104.CPBH' },
  { id: '1046', name: 'Khác', type: 'Chi', parentId: '104.CPBH' },

  { id: '105.CPLKC', name: 'CHI PHÍ LIÊN KẾT CHÉO', type: 'Chi', parentId: null },
  { id: '1051', name: 'In ấn phục vụ công tác LKC', type: 'Chi', parentId: '105.CPLKC' },
  { id: '1052', name: 'Khác (LKT, đối tác, chi phí lobby)', type: 'Chi', parentId: '105.CPLKC' },
  { id: '1053', name: 'Chi phí viết Hóa đơn', type: 'Chi', parentId: '105.CPLKC' },

  { id: '106.CPLUONG', name: 'CHI PHÍ LƯƠNG', type: 'Chi', parentId: null },
  { id: '1061', name: 'Nhân viên', type: 'Chi', parentId: '106.CPLUONG' },
  { id: '1062', name: 'Giáo viên Nước ngoài', type: 'Chi', parentId: '106.CPLUONG' },
  { id: '1063', name: 'Giáo viên Việt Nam', type: 'Chi', parentId: '106.CPLUONG' },
  { id: '1064', name: 'Bảo hiểm xã hội', type: 'Chi', parentId: '106.CPLUONG' },
  { id: '1065', name: 'Thưởng nhân viên', type: 'Chi', parentId: '106.CPLUONG' },
  { id: '1066', name: 'Phúc lợi (Quỹ hiếu hỉ, liên hoan)', type: 'Chi', parentId: '106.CPLUONG' },
  { id: '1067', name: 'Chia cổ đông', type: 'Chi', parentId: '106.CPLUONG' },

  { id: '107.CPKHO', name: 'CHI PHÍ VẬT TƯ KHO', type: 'Chi', parentId: null },
  { id: '1071', name: 'Áo phông học viên', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1072', name: 'Balo (Lớn, bé)', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1073', name: 'Sách Giáo trình', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1074', name: 'Vở học sinh', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1075', name: 'Túi Canvas', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1076', name: 'Túi giấy', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1077', name: 'Bóng bay', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1078', name: 'Bút chì', type: 'Chi', parentId: '107.CPKHO' },
  { id: '1079', name: 'Tờ chương trình', type: 'Chi', parentId: '107.CPKHO' },
  { id: '10710', name: 'Phong bì', type: 'Chi', parentId: '107.CPKHO' },
  { id: '10711', name: 'Khác', type: 'Chi', parentId: '107.CPKHO' },

  { id: '108.CPKHAC', name: 'CHI PHÍ KHÁC', type: 'Chi', parentId: null },
  { id: '1081', name: 'Hoàn tiền đặt cọc', type: 'Chi', parentId: '108.CPKHAC' },
  { id: '1082', name: 'Hoàn tiền học phí', type: 'Chi', parentId: '108.CPKHAC' },
  { id: '1083', name: 'Thủ tục pháp lý giáo viên, trung tâm', type: 'Chi', parentId: '108.CPKHAC' },
  { id: '1084', name: 'Quan hệ ngoại giao (bên ngoài trường học)', type: 'Chi', parentId: '108.CPKHAC' },
  { id: '1085', name: 'Gia đình', type: 'Chi', parentId: '108.CPKHAC' },
  { id: '1086', name: 'Lãi Ngân hàng hàng tháng (Lãi vay và lãi trả góp)', type: 'Chi', parentId: '108.CPKHAC' },
  { id: '1087', name: 'Thuế', type: 'Chi', parentId: '108.CPKHAC' },

  { id: '1010.CPKT', name: 'CHI PHÍ KẾ TOÁN', type: 'Chi', parentId: null },
  { id: '10101', name: 'Xuất tiền cho Kế toán chi tiêu', type: 'Chi', parentId: '1010.CPKT' },
];

export const getParentCategories = (type: 'Thu' | 'Chi') => {
  return CASHBOOK_CATEGORIES.filter(c => c.type === type && c.parentId === null);
};

export const getChildCategories = (parentId: string) => {
  return CASHBOOK_CATEGORIES.filter(c => c.parentId === parentId);
};
