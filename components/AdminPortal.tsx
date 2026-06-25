"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  adminChangePassword,
  adminBulkSaveCertificates,
  adminList,
  adminLogin,
  adminLogout,
  adminResetPassword,
  adminSave,
  adminToggleStatus,
  AdminUser,
  PageResult,
} from "@/lib/admin-api";
import { formatDate, formatDateInput, formatMoney, hasMinimumPhoneInput, normalizePhone10 } from "@/lib/format";

type Tab = "certificates" | "campaigns" | "users";
type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
  required?: boolean;
};

const roleOptions = ["Admin", "SuperAdmin"];
const scopeOptions = ["ToanHeThong"];
const statusOptions = ["HoatDong", "Khoa"];
const temporaryPasswordKey = "__temporaryPassword";

const displayValue: Record<string, string> = {
  Admin: "Admin",
  Superadmin: "SuperAdmin",
  SuperAdmin: "SuperAdmin",
  ToanHeThong: "Toàn hệ thống",
  HoatDong: "Hoạt động",
  Khoa: "Khóa",
  HienThi: "Hiển thị",
  An: "Ẩn",
};

const configs: Record<
  Tab,
  {
    title: string;
    api: "Certificates" | "Campaigns" | "Users";
    save: "Certificate" | "Campaign" | "User";
    fields: Field[];
  }
> = {
  certificates: {
    title: "Cấp Giấy chứng nhận",
    api: "Certificates",
    save: "Certificate",
    fields: [
      { key: "Mã GCN", label: "Mã GCN", required: true },
      { key: "Họ tên", label: "Họ tên", required: true },
      { key: "Chiến dịch", label: "Chiến dịch" },
      { key: "Ngày ủng hộ", label: "Ngày ủng hộ" },
      { key: "Số tiền", label: "Số tiền" },
      { key: "Số điện thoại", label: "Số điện thoại" },
      { key: "Link GCN", label: "Link GCN" },
    ],
  },
  campaigns: {
    title: "Kêu gọi ủng hộ",
    api: "Campaigns",
    save: "Campaign",
    fields: [
      {
        key: "HienThi",
        label: "Hiển thị",
        type: "select",
        options: ["HienThi", "An"],
      },
      { key: "TenDuAn", label: "Tên dự án", required: true },
      { key: "ThoiGianBatDau", label: "Thời gian bắt đầu" },
      { key: "ThoiGianKetThuc", label: "Thời gian kết thúc" },
      { key: "CuPhapUngHo", label: "Cú pháp ủng hộ" },
      { key: "SoTienKeuGoi", label: "Số tiền kêu gọi" },
      { key: "SoTienDaNhan", label: "Số tiền đã nhận" },
      { key: "MoTa", label: "Mô tả", type: "textarea" },
      { key: "GhiChu", label: "Ghi chú", type: "textarea" },
    ],
  },
  users: {
    title: "Tài khoản quản trị",
    api: "Users",
    save: "User",
    fields: [
      { key: "Email", label: "Email", required: true },
      { key: "HoTen", label: "Họ tên", required: true },
      { key: "Role", label: "Quyền", type: "select", options: roleOptions },
      {
        key: "PhamVi",
        label: "Phạm vi",
        type: "select",
        options: scopeOptions,
      },
      {
        key: "TrangThai",
        label: "Trạng thái",
        type: "select",
        options: statusOptions,
      },
      { key: "GhiChu", label: "Ghi chú", type: "textarea" },
    ],
  },
};

const blank = (tab: Tab) =>
  Object.fromEntries(
    configs[tab].fields.map((field) => [field.key, field.options?.[0] || ""]),
  );
const format = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);
const canonicalRole = (role: unknown) =>
  format(role).toLowerCase() === "superadmin" ? "SuperAdmin" : format(role);
const isSuperAdmin = (role: unknown) => canonicalRole(role) === "SuperAdmin";
const labelOf = (value: unknown) =>
  displayValue[format(value)] || format(value);
const dateFields = new Set([
  "Ngày ủng hộ",
  "ThoiGianBatDau",
  "ThoiGianKetThuc",
  "NgayTao",
  "LanDangNhapCuoi",
  "PasswordChangedAt",
]);
const moneyFields = new Set(["Số tiền", "SoTienKeuGoi", "SoTienDaNhan"]);
const hiddenCampaignStatuses = new Set(["an", "ẩn", "false", "0", "hide", "off"]);
const certificateBulkHeaders = configs.certificates.fields.map((field) => field.key);

function displayCell(field: Field, row: Record<string, unknown>) {
  const value = row[field.key];
  if (field.key === "Link GCN") {
    const href = format(value);
    return href ? (
      <a href={href} target="_blank" rel="noreferrer">
        Mở GCN ↗
      </a>
    ) : (
      ""
    );
  }
  if (field.key === "Số điện thoại") return normalizePhone10(value);
  if (dateFields.has(field.key)) return formatDate(value);
  if (moneyFields.has(field.key)) return formatMoney(value);
  return labelOf(value);
}

function rowMatchesCertificateSearch(row: Record<string, unknown>, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  const phoneTerm = term.replace(/\D/g, "");
  const haystack = [
    row["Mã GCN"],
    row["Họ tên"],
    normalizePhone10(row["Số điện thoại"]),
  ]
    .map((item) => format(item).toLowerCase())
    .join(" ");
  return haystack.includes(term) || Boolean(phoneTerm && haystack.includes(phoneTerm));
}

function certificatePreview(record: Record<string, unknown>) {
  const amount = format(record["Số tiền"]).trim();
  const isNumericAmount = /\d/.test(amount) && Number.isFinite(Number(amount.replace(/[^\d]/g, "")));
  if (isNumericAmount) {
    return { label: "Số tiền ủng hộ", value: formatMoney(amount) };
  }
  return {
    label: "Trạng thái",
    value: `Đã tham gia ${format(record["Chiến dịch"]) || "chương trình"}`,
  };
}

function isCampaignVisible(row: Record<string, unknown>) {
  const status = format(row.HienThi).trim().toLowerCase();
  return status === "" || !hiddenCampaignStatuses.has(status);
}

function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const items: Array<number | "..."> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("...");
  for (let number = start; number <= end; number += 1) items.push(number);
  if (end < totalPages - 1) items.push("...");
  items.push(totalPages);
  return items;
}

function splitBulkLine(line: string) {
  return line.includes("\t") ? line.split("\t") : line.split(",");
}

function parseCertificateBulkText(text: string) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitBulkLine);
  const firstRow = rows[0]?.map((cell) => cell.trim().toLowerCase()) || [];
  const hasHeader = certificateBulkHeaders.every((header, index) => firstRow[index] === header.toLowerCase());
  return (hasHeader ? rows.slice(1) : rows).map((row) =>
    Object.fromEntries(certificateBulkHeaders.map((header, index) => [header, row[index]?.trim() || ""])),
  );
}

export function AdminPortal() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState<Tab>("certificates");
  const [result, setResult] = useState<PageResult | null>(null);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [adminSearch, setAdminSearch] = useState("");
  const [appliedAdminSearch, setAppliedAdminSearch] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const config = configs[tab];
  const tableFields = useMemo(
    () => config.fields.filter((field) => !(tab === "campaigns" && field.key === "HienThi")),
    [config.fields, tab],
  );

  useEffect(() => {
    const saved = localStorage.getItem("flytosky-admin-session");
    if (!saved) return;
    const session = JSON.parse(saved);
    session.user = { ...session.user, role: canonicalRole(session.user?.role) };
    setToken(session.token);
    setUser(session.user);
  }, []);

  useEffect(() => {
    if (!token || user?.mustChangePassword) return;
    setLoading(true);
    adminList(token, config.api, page, tab === "certificates" ? appliedAdminSearch : "")
      .then((data) => {
        setResult(data);
        if (!data.success)
          setMessage(data.message || "Không tải được dữ liệu.");
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [token, user?.mustChangePassword, config.api, page, tab, appliedAdminSearch]);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const data = await adminLogin(login.email, login.password);
      if (!data.success || !data.token || !data.user) {
        setMessage(data.message || "Không thể đăng nhập.");
        return;
      }
      const normalizedUser = {
        ...data.user,
        role: canonicalRole(data.user.role) as AdminUser["role"],
      };
      setToken(data.token);
      setUser(normalizedUser);
      localStorage.setItem(
        "flytosky-admin-session",
        JSON.stringify({ token: data.token, user: normalizedUser }),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const data = await adminChangePassword(
      token,
      passwords.current,
      passwords.next,
    );
    if (!data.success || !data.user) {
      setMessage(data.message || "Không đổi được mật khẩu.");
      return;
    }
    const normalizedUser = {
      ...data.user,
      role: canonicalRole(data.user.role) as AdminUser["role"],
    };
    setUser(normalizedUser);
    localStorage.setItem(
      "flytosky-admin-session",
      JSON.stringify({ token, user: normalizedUser }),
    );
    setPasswords({ current: "", next: "" });
    setMessage("Đã đổi mật khẩu. Bạn có thể tiếp tục quản trị.");
  }

  function openNew() {
    setEditing(tab === "users" ? { ...blank(tab), [temporaryPasswordKey]: "" } : blank(tab));
    setMessage("");
  }

  function openBulkImport() {
    setEditing(null);
    setBulkOpen((open) => !open);
    setMessage("");
  }

  function openEdit(row: Record<string, unknown>) {
    const normalizedRow: Record<string, unknown> = { ...row, Role: canonicalRole(row.Role) };
    dateFields.forEach((field) => {
      if (normalizedRow[field]) normalizedRow[field] = formatDate(normalizedRow[field]);
    });
    setEditing(normalizedRow);
    setMessage("");
  }

  function updateLocalRow(savedRow: Record<string, unknown>, wasNew: boolean) {
    setResult((current) => {
      if (!current) return current;
      const rowNumber = format(savedRow._rowNumber);
      const exists = current.data.some((row) => format(row._rowNumber) === rowNumber);
      let data = exists
        ? current.data.map((row) => (format(row._rowNumber) === rowNumber ? { ...row, ...savedRow } : row))
        : current.data;

      if (wasNew && !exists) {
        const canShowNewRow =
          tab !== "certificates" || rowMatchesCertificateSearch(savedRow, appliedAdminSearch);
        if (canShowNewRow) data = [savedRow, ...data].slice(0, 20);
      }

      const total = wasNew && !exists ? current.total + 1 : current.total;
      return {
        ...current,
        data,
        total,
        totalPages: Math.max(1, Math.ceil(total / 20)),
      };
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const record: Record<string, unknown> = { ...editing, Role: canonicalRole(editing.Role) };
    const isNew = !record._rowNumber;
    if (tab === "certificates" && !hasMinimumPhoneInput(record["Số điện thoại"])) {
      setMessage("Số điện thoại cần nhập tối thiểu 2 số. Nếu chưa có SĐT, vui lòng nhập 00.");
      return;
    }
    if (tab === "certificates") {
      record["Số điện thoại"] = normalizePhone10(record["Số điện thoại"]);
    }
    const temp = tab === "users" && isNew ? format(record[temporaryPasswordKey]) : undefined;
    delete record[temporaryPasswordKey];
    const data = await adminSave(
      token,
      config.save,
      record,
      Number(record._rowNumber) || undefined,
      temp,
    );
    if (!data.success) {
      setMessage(data.message || "Không thể lưu.");
      return;
    }
    const savedRow = data.row || {
      ...record,
      _rowNumber: record._rowNumber || `local-${Date.now()}`,
    };
    updateLocalRow(savedRow, isNew);
    setEditing(null);
    setMessage("Đã lưu dữ liệu. Bảng đã cập nhật dòng vừa thay đổi.");
  }

  async function importBulkCertificates(event: FormEvent) {
    event.preventDefault();
    const records = parseCertificateBulkText(bulkText);
    if (records.length === 0) {
      setMessage("Chưa có dữ liệu để nhập hàng loạt.");
      return;
    }
    const invalidIndex = records.findIndex((record) => !record["Mã GCN"] || !record["Họ tên"]);
    if (invalidIndex >= 0) {
      setMessage(`Dòng ${invalidIndex + 1}: Mã GCN và Họ tên là bắt buộc.`);
      return;
    }
    const invalidPhoneIndex = records.findIndex((record) => !hasMinimumPhoneInput(record["Số điện thoại"]));
    if (invalidPhoneIndex >= 0) {
      setMessage(`Dòng ${invalidPhoneIndex + 1}: Số điện thoại cần tối thiểu 2 số. Nếu chưa có SĐT, nhập 00.`);
      return;
    }

    const normalizedRecords = records.map((record) => ({
      ...record,
      "Số điện thoại": normalizePhone10(record["Số điện thoại"]),
    }));
    const data = await adminBulkSaveCertificates(token, normalizedRecords);
    if (!data.success) {
      setMessage(data.message || "Không thể nhập hàng loạt.");
      return;
    }
    const rows = data.rows || [];
    setResult((current) => {
      if (!current) return current;
      const visibleRows = rows.filter((row) => rowMatchesCertificateSearch(row, appliedAdminSearch));
      const nextData = [...visibleRows.reverse(), ...current.data].slice(0, 20);
      const total = current.total + (data.count || rows.length);
      return { ...current, data: nextData, total, totalPages: Math.max(1, Math.ceil(total / 20)) };
    });
    setBulkText("");
    setBulkOpen(false);
    setMessage(`Đã nhập ${data.count || rows.length} dòng GCN.`);
  }

  async function submitAdminSearch(event: FormEvent) {
    event.preventDefault();
    setEditing(null);
    setMessage("");
    setPage(1);
    setAppliedAdminSearch(adminSearch.trim());
  }

  function clearAdminSearch() {
    setAdminSearch("");
    setAppliedAdminSearch("");
    setPage(1);
    setMessage("");
  }

  async function resetPassword(row: Record<string, unknown>) {
    if (!isSuperAdmin(user?.role) && isSuperAdmin(row.Role)) {
      setMessage("Admin không được reset mật khẩu của SuperAdmin.");
      return;
    }
    const temp = window.prompt("Nhập mật khẩu tạm mới (ít nhất 8 ký tự):");
    if (!temp) return;
    const data = await adminResetPassword(token, format(row.AdminID), temp);
    if (data.success) {
      setResult((current) =>
        current
          ? {
              ...current,
              data: current.data.map((item) =>
                format(item.AdminID) === format(row.AdminID)
                  ? { ...item, MustChangePassword: true, PasswordChangedAt: "" }
                  : item,
              ),
            }
          : current,
      );
    }
    setMessage(
      data.success
        ? "Đã reset mật khẩu; người dùng phải đổi khi đăng nhập."
        : data.message || "Không thể reset mật khẩu.",
    );
  }

  async function toggleUser(row: Record<string, unknown>) {
    const status = format(row.TrangThai) === "Khoa" ? "HoatDong" : "Khoa";
    const data = await adminToggleStatus(token, format(row.AdminID), status);
    setMessage(
      data.success
        ? "Đã cập nhật trạng thái tài khoản."
        : data.message || "Không thể cập nhật.",
    );
    if (data.success) {
      setResult((current) =>
        current
          ? {
              ...current,
              data: current.data.map((item) =>
                format(item.AdminID) === format(row.AdminID)
                  ? { ...item, TrangThai: status }
                  : item,
              ),
            }
          : current,
      );
    }
  }

  async function toggleCampaignVisibility(row: Record<string, unknown>) {
    const nextStatus = isCampaignVisible(row) ? "An" : "HienThi";
    const record = { ...row, HienThi: nextStatus };
    const data = await adminSave(token, "Campaign", record, Number(row._rowNumber) || undefined);
    if (!data.success) {
      setMessage(data.message || "Không thể cập nhật trạng thái hiển thị.");
      return;
    }
    updateLocalRow(data.row || record, false);
    setMessage(nextStatus === "HienThi" ? "Đã hiển thị dự án." : "Đã ẩn dự án.");
  }

  async function logout() {
    await adminLogout(token).catch(() => undefined);
    localStorage.removeItem("flytosky-admin-session");
    setToken("");
    setUser(null);
    setResult(null);
  }

  const pages = useMemo(
    () => paginationItems(page, result?.totalPages || 0),
    [page, result?.totalPages],
  );

  if (!user) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <img src="/logo.png" alt="Fly To Sky" />
          <h1>Quản trị Fly To Sky</h1>
          <p>
            Đăng nhập để quản lý giấy chứng nhận, chiến dịch và tài khoản quản
            trị.
          </p>
          <form onSubmit={submitLogin}>
            <label>
              Email
              <input
                type="email"
                required
                value={login.email}
                onChange={(event) =>
                  setLogin({ ...login, email: event.target.value })
                }
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                required
                value={login.password}
                onChange={(event) =>
                  setLogin({ ...login, password: event.target.value })
                }
              />
            </label>
            <button disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    );
  }

  if (user.mustChangePassword) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <h1>Đổi mật khẩu bắt buộc</h1>
          <p>Đây là lần đăng nhập đầu tiên hoặc mật khẩu vừa được reset.</p>
          <form onSubmit={changePassword}>
            <label>
              Mật khẩu hiện tại
              <input
                type="password"
                required
                value={passwords.current}
                onChange={(event) =>
                  setPasswords({ ...passwords, current: event.target.value })
                }
              />
            </label>
            <label>
              Mật khẩu mới (từ 8 ký tự)
              <input
                type="password"
                minLength={8}
                required
                value={passwords.next}
                onChange={(event) =>
                  setPasswords({ ...passwords, next: event.target.value })
                }
              />
            </label>
            <button>Đổi mật khẩu</button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-app">
        <header className="admin-header">
          <div>
            <img src="/logo.png" alt="Fly To Sky" />
            <div>
              <p>QUẢN TRỊ</p>
              <h1>Fly To Sky</h1>
            </div>
          </div>
          <aside>
            <span>
              {user.hoTen} · {labelOf(user.role)}
            </span>
            <button onClick={logout}>Đăng xuất</button>
          </aside>
        </header>

        <nav className="admin-tabs">
          {(Object.keys(configs) as Tab[]).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => {
                setTab(item);
                setPage(1);
                setEditing(null);
                setMessage("");
                setAdminSearch("");
                setAppliedAdminSearch("");
              }}
            >
              {configs[item].title}
            </button>
          ))}
        </nav>

        <div className="admin-toolbar">
          <div>
            <h2>{config.title}</h2>
            <p>{result ? `${result.total} bản ghi` : ""}</p>
          </div>
          {tab === "certificates" && (
            <form className="admin-search" onSubmit={submitAdminSearch}>
              <input
                value={adminSearch}
                onChange={(event) => setAdminSearch(event.target.value)}
                placeholder="Tra cứu họ tên, SĐT hoặc mã GCN"
                autoComplete="off"
              />
              <button type="submit">Tra cứu</button>
              {appliedAdminSearch && (
                <button type="button" className="secondary" onClick={clearAdminSearch}>
                  Xóa lọc
                </button>
              )}
            </form>
          )}
          {tab === "certificates" && (
            <button type="button" className="secondary" onClick={openBulkImport}>
              Nhập hàng loạt
            </button>
          )}
          <button onClick={openNew}>+ Thêm mới</button>
        </div>

        {message && <p className="admin-message">{message}</p>}

        {tab === "certificates" && bulkOpen && (
          <form className="admin-bulk-import" onSubmit={importBulkCertificates}>
            <h3>Nhập GCN hàng loạt</h3>
            <p>
              Copy dữ liệu từ Excel/Google Sheet rồi dán vào đây theo thứ tự cột:
              Mã GCN, Họ tên, Chiến dịch, Ngày ủng hộ, Số tiền, Số điện thoại, Link GCN.
            </p>
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder={"Mã GCN\tHọ tên\tChiến dịch\tNgày ủng hộ\tSố tiền\tSố điện thoại\tLink GCN\nGCN-001\tNguyễn Văn A\tChiến dịch A\t25/06/2026\t50000\t0901234567\thttps://..."}
            />
            <div className="editor-actions">
              <button type="button" className="secondary" onClick={() => setBulkOpen(false)}>
                Hủy
              </button>
              <button>Nhập dữ liệu</button>
            </div>
          </form>
        )}

        {editing && (
          <form className="admin-editor" onSubmit={save}>
            <h3>
              {editing._rowNumber ? "Chỉnh sửa" : "Thêm mới"}{" "}
              {config.title.toLowerCase()}
            </h3>
            <div className="admin-fields">
              {config.fields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.type === "textarea" ? (
                    <textarea
                      value={format(editing[field.key])}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={format(editing[field.key])}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          [field.key]: event.target.value,
                        })
                      }
                    >
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {labelOf(option)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required={field.required}
                      minLength={field.key === "Số điện thoại" ? 2 : undefined}
                      placeholder={dateFields.has(field.key) ? "dd/mm/yyyy" : field.key === "Số điện thoại" ? "Tối thiểu 2 số; nếu chưa có nhập 00" : undefined}
                      value={format(editing[field.key])}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          [field.key]: dateFields.has(field.key) ? formatDateInput(event.target.value) : event.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
              {tab === "users" && !editing._rowNumber && (
                <label>
                  Mật khẩu tạm
                  <input
                    type="password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    value={format(editing[temporaryPasswordKey])}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        [temporaryPasswordKey]: event.target.value,
                      })
                    }
                    placeholder="Ít nhất 8 ký tự"
                  />
                </label>
              )}
            </div>
            {tab === "certificates" && (
              <div className="gcn-preview">
                <p className="preview-kicker">Preview hiển thị khi tra cứu</p>
                <div className="preview-card">
                  <strong>{format(editing["Họ tên"]) || "Họ tên người nhận"}</strong>
                  <span>{format(editing["Chiến dịch"]) || "Tên chiến dịch/chương trình"}</span>
                  <dl>
                    <div>
                      <dt>Mã GCN</dt>
                      <dd>{format(editing["Mã GCN"]) || "—"}</dd>
                    </div>
                    <div>
                      <dt>Ngày cấp</dt>
                      <dd>{formatDate(editing["Ngày ủng hộ"]) || "—"}</dd>
                    </div>
                    <div>
                      <dt>Số điện thoại</dt>
                      <dd>{hasMinimumPhoneInput(editing["Số điện thoại"]) ? normalizePhone10(editing["Số điện thoại"]) : "Nhập tối thiểu 2 số, nếu chưa có nhập 00"}</dd>
                    </div>
                    <div>
                      <dt>{certificatePreview(editing).label}</dt>
                      <dd>{certificatePreview(editing).value}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
            <div className="editor-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditing(null)}
              >
                Hủy
              </button>
              <button>Lưu</button>
            </div>
          </form>
        )}

        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                {tableFields.map((field) => (
                  <th key={field.key}>{field.label}</th>
                ))}
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={tableFields.length + 1}>Đang tải...</td>
                </tr>
              ) : (
                result?.data.map((row) => (
                  <tr key={format(row._rowNumber)}>
                    {tableFields.map((field) => (
                      <td key={field.key} data-label={field.label}>{displayCell(field, row)}</td>
                    ))}
                    <td className="admin-actions" data-label="Thao tác">
                      <button
                        className="secondary"
                        onClick={() => openEdit(row)}
                      >
                        Sửa
                      </button>
                      {tab === "users" && (
                        <>
                          <button
                            className="secondary"
                            onClick={() => resetPassword(row)}
                          >
                            Reset MK
                          </button>
                          {isSuperAdmin(user.role) && (
                            <button
                              className="secondary"
                              onClick={() => toggleUser(row)}
                            >
                              {format(row.TrangThai) === "Khoa"
                                ? "Mở khóa"
                                : "Khóa"}
                            </button>
                          )}
                        </>
                      )}
                      {tab === "campaigns" && (
                        <button
                          className={isCampaignVisible(row) ? "secondary danger-soft" : "secondary success-soft"}
                          onClick={() => toggleCampaignVisibility(row)}
                        >
                          {isCampaignVisible(row) ? "Ẩn" : "Hiển thị"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(result?.totalPages || 0) > 1 && (
          <nav className="admin-pagination">
            <button
              className="pager-nav"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Trước
            </button>
            {pages.map((number, index) =>
              number === "..." ? (
                <span key={`ellipsis-${index}`} className="pager-ellipsis">
                  ...
                </span>
              ) : (
              <button
                key={number}
                className={number === page ? "active" : ""}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
              ),
            )}
            <button
              className="pager-nav"
              disabled={page >= (result?.totalPages || 1)}
              onClick={() => setPage((current) => Math.min(result?.totalPages || 1, current + 1))}
            >
              Sau
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
