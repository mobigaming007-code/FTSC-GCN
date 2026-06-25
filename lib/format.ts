const dateOnlyFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return dateOnlyFormatter.format(value);

  const text = String(value).trim();
  const compact = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compact) {
    return `${compact[1]}/${compact[2]}/${compact[3]}`;
  }

  const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[1].padStart(2, "0")}/${ddmmyyyy[2].padStart(2, "0")}/${ddmmyyyy[3]}`;
  }

  const yyyymmdd = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yyyymmdd) {
    return `${yyyymmdd[3].padStart(2, "0")}/${yyyymmdd[2].padStart(2, "0")}/${yyyymmdd[1]}`;
  }

  return text;
}

export function formatDateInput(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizePhone10(value: unknown) {
  let phone = String(value ?? "").replace(/\D/g, "");
  if (phone.startsWith("84") && phone.length >= 11) phone = `0${phone.slice(2)}`;
  if (phone.length === 9 && !phone.startsWith("0")) phone = `0${phone}`;
  if (phone.length < 10) phone = phone.padStart(10, "0");
  if (phone.length > 10) phone = phone.slice(-10);
  return phone;
}

export function hasMinimumPhoneInput(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").length >= 2;
}

export function formatMoney(value: unknown) {
  if (value === undefined || value === null || value === "") return "";
  const text = String(value).trim();
  const numeric = Number(text.replace(/[^\d]/g, ""));
  if (!Number.isFinite(numeric)) return text;
  return `${numeric.toLocaleString("vi-VN")} VNĐ`;
}
