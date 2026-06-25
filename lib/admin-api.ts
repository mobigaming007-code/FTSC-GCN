const endpoint =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzjh97dG0GhaSWzt_dHJpiS9s1J_2ZmNrvBOPE5PSkhSh_GN5153V_7uif28dZz0Wqm/exec";
const apiKey = process.env.NEXT_PUBLIC_APPS_SCRIPT_KEY || "FLY2SKY_SECRET_0209";

export type AdminUser = {
  adminId: string;
  email: string;
  hoTen: string;
  role: "Admin" | "SuperAdmin";
  mustChangePassword: boolean;
};
export type PageResult = {
  success: boolean;
  message?: string;
  mustChangePassword?: boolean;
  data: Record<string, unknown>[];
  page: number;
  totalPages: number;
  total: number;
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ ...body, auth: apiKey }),
  });
  if (!response.ok) throw new Error("Không thể kết nối máy chủ.");
  return response.json() as Promise<T>;
}

export const adminLogin = (email: string, password: string) =>
  call<{
    success: boolean;
    message?: string;
    token?: string;
    user?: AdminUser;
    mustChangePassword?: boolean;
  }>({ action: "adminLogin", email, password });
export const adminChangePassword = (
  token: string,
  currentPassword: string,
  newPassword: string,
) =>
  call<{ success: boolean; message?: string; user?: AdminUser }>({
    action: "adminChangePassword",
    token,
    currentPassword,
    newPassword,
  });
export const adminList = (
  token: string,
  type: "Certificates" | "Campaigns" | "Users",
  page: number,
  query = "",
) => call<PageResult>({ action: `adminList${type}`, token, page, query });
export const adminSave = (
  token: string,
  type: "Certificate" | "Campaign" | "User",
  record: Record<string, unknown>,
  rowNumber?: number,
  temporaryPassword?: string,
) =>
  call<{ success: boolean; message?: string; row?: Record<string, unknown> }>({
    action: `adminSave${type}`,
    token,
    record,
    rowNumber,
    temporaryPassword,
  });
export const adminBulkSaveCertificates = (
  token: string,
  records: Record<string, unknown>[],
) =>
  call<{ success: boolean; message?: string; rows?: Record<string, unknown>[]; count?: number }>({
    action: "adminBulkSaveCertificates",
    token,
    records,
  });
export const adminResetPassword = (
  token: string,
  adminId: string,
  temporaryPassword: string,
) =>
  call<{ success: boolean; message?: string }>({
    action: "adminResetPassword",
    token,
    adminId,
    temporaryPassword,
  });
export const adminToggleStatus = (
  token: string,
  adminId: string,
  status: string,
) =>
  call<{ success: boolean; message?: string }>({
    action: "adminToggleUserStatus",
    token,
    adminId,
    status,
  });
export const adminLogout = (token: string) =>
  call<{ success: boolean }>({ action: "adminLogout", token });
