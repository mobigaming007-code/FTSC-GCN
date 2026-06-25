export type LookupResult = { maGCN: string; hoTen: string; chienDich: string; ngayUngHo: string; soTien: string | number; sdt: string; linkGCN?: string };
export type Campaign = { tenDuAn: string; thoiGianBatDau?: string; thoiGianKetThuc?: string; cuPhapUngHo?: string; soTienKeuGoi?: number; soTienDaNhan?: number; tienDo?: number };

// Giữ nguyên cấu hình của giao diện HTML cũ; biến môi trường cho phép thay thế khi deploy.
const endpoint = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzjh97dG0GhaSWzt_dHJpiS9s1J_2ZmNrvBOPE5PSkhSh_GN5153V_7uif28dZz0Wqm/exec";
const apiKey = process.env.NEXT_PUBLIC_APPS_SCRIPT_KEY || "FLY2SKY_SECRET_0209";

async function request<T>(body: object): Promise<T> {
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ ...body, auth: apiKey }) });
  if (!response.ok) throw new Error("Không thể kết nối máy chủ.");
  return response.json() as Promise<T>;
}

export const searchCertificates = (query: string) => request<{ success: boolean; message?: string; data?: LookupResult[] }>({ action: "search", query });
export const getCampaigns = () => request<{ success: boolean; data?: Campaign[] }>({ action: "getCampaigns" });
