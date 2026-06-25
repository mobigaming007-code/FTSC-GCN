"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Campaign, getCampaigns, LookupResult, searchCertificates } from "@/lib/api";
import { formatDate, formatMoney, normalizePhone10 } from "@/lib/format";

const money = (value: number) => formatMoney(value);
const dateTime = (value?: string) => value ? formatDate(value) : "Chưa cập nhật";
const resultsPerPage = 15;

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
function countdown(end?: string) {
  if (!end) return "Chưa cập nhật thời gian kết thúc";
  const diff = new Date(end).getTime() - Date.now();
  if (Number.isNaN(diff)) return "Thời gian chưa hợp lệ";
  if (diff <= 0) return "Đợt ủng hộ đã kết thúc";
  const day = Math.floor(diff / 86_400_000), hour = Math.floor(diff / 3_600_000) % 24, minute = Math.floor(diff / 60_000) % 60, second = Math.floor(diff / 1_000) % 60;
  return `Còn ${day} ngày ${hour} giờ ${minute} phút ${second} giây`;
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [, setTick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setTick((tick) => tick + 1), 1000); return () => window.clearInterval(timer); }, []);
  const goal = Number(campaign.soTienKeuGoi || 0), received = Number(campaign.soTienDaNhan || 0);
  const progress = Math.min(100, goal ? received / goal * 100 : Number(campaign.tienDo || 0));
  return <article className="campaign-card"><h3 className="campaign-name">{campaign.tenDuAn || "Dự án kêu gọi"}</h3><p className="campaign-row"><span>Thời gian bắt đầu:</span><strong>{dateTime(campaign.thoiGianBatDau)}</strong></p><p className="campaign-row"><span>Thời gian kết thúc:</span><strong>{dateTime(campaign.thoiGianKetThuc)}</strong></p>{campaign.cuPhapUngHo && <p className="campaign-row"><span>Cú pháp ủng hộ:</span><code>{campaign.cuPhapUngHo}</code></p>}<p className="countdown-box">{countdown(campaign.thoiGianKetThuc)}</p><p className="campaign-row"><span>Số tiền kêu gọi ủng hộ:</span><strong className="value-highlight">{money(goal)}</strong></p><div className="progress-meta"><span>Đã nhận: {money(received)}</span><span>{Math.round(progress * 10) / 10}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div></article>;
}

function ResultCard({ result }: { result: LookupResult }) {
  const words = result.hoTen.trim().split(/\s+/), initial = words.at(-1)?.slice(0, 1).toUpperCase() || "?";
  const isNumeric = typeof result.soTien === "number" || (typeof result.soTien === "string" && result.soTien.trim() !== "" && Number.isFinite(Number(result.soTien)));
  return <article className="card"><div className="card-header"><div className="avatar">{initial}</div><div><h3>{result.hoTen}</h3><span className="campaign-badge">{result.chienDich}</span></div></div><div className="card-body"><p><span>Mã GCN:</span><code>{result.maGCN}</code></p><p><span>Ngày cấp:</span><strong>{formatDate(result.ngayUngHo)}</strong></p><p><span>Số điện thoại:</span><strong>{normalizePhone10(result.sdt)}</strong></p><p><span>{isNumeric ? "Số tiền ủng hộ:" : "Trạng thái:"}</span><strong className="value-highlight">{isNumeric ? money(Number(result.soTien)) : `Đã tham gia ${result.chienDich || "chương trình"}`}</strong></p></div><div className="card-footer">{result.linkGCN ? <a className="btn-view" href={result.linkGCN} target="_blank" rel="noreferrer">XEM GIẤY CHỨNG NHẬN ↗</a> : <span className="badge-null">Dữ liệu bản cứng đang cập nhật</span>}</div></article>;
}

export function LookupPanel() {
  const [query, setQuery] = useState(""), [campaigns, setCampaigns] = useState<Campaign[]>([]), [results, setResults] = useState<LookupResult[] | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false), [resultPage, setResultPage] = useState(1);
  useEffect(() => { getCampaigns().then((data) => data.success && setCampaigns(data.data || [])).catch(() => undefined); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); const term = query.trim(); if (term.length < 2) return setError("Vui lòng nhập ít nhất 2 ký tự để hệ thống có thể tìm kiếm chính xác."); setLoading(true); setError(""); setResults(null); setResultPage(1); try { const data = await searchCertificates(term); if (!data.success) setError(data.message || "Không thể tra cứu dữ liệu."); else setResults(data.data || []); } catch { setError("Có lỗi xảy ra khi kết nối đến máy chủ. Vui lòng thử lại sau!"); } finally { setLoading(false); } }
  const showCampaigns = results === null || results.length === 0;
  const totalResultPages = results ? Math.max(1, Math.ceil(results.length / resultsPerPage)) : 1;
  const pagedResults = useMemo(() => {
    if (!results) return [];
    const start = (resultPage - 1) * resultsPerPage;
    return results.slice(start, start + resultsPerPage);
  }, [results, resultPage]);
  const pages = useMemo(() => paginationItems(resultPage, totalResultPages), [resultPage, totalResultPages]);
  return <section><form className="search-box" onSubmit={submit}><label htmlFor="search">Nhập Mã GCN, Số điện thoại hoặc Họ và tên của bạn</label><div className="search-group"><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: GCN-2024-001, 0935..." autoComplete="off" /><button disabled={loading}>{loading ? "ĐANG XỬ LÝ..." : "TRA CỨU"}</button></div>{error && <p className="alert alert-error">{error}</p>}{results?.length === 0 && <p className="alert alert-warning">Chúng tôi không tìm thấy dữ liệu khớp với thông tin bạn cung cấp. Vui lòng kiểm tra lại!</p>}</form>{showCampaigns && campaigns.length > 0 && <section className="campaigns"><h2>Các dự án đang kêu gọi quyên góp</h2><div className="campaign-grid">{campaigns.map((campaign, index) => <CampaignCard key={`${campaign.tenDuAn}-${index}`} campaign={campaign} />)}</div></section>}{results && results.length > 0 && <section className="results"><p className="results-summary">Tìm thấy {results.length} kết quả phù hợp cho &quot;{query.trim()}&quot; · Đang hiển thị {((resultPage - 1) * resultsPerPage) + 1}-{Math.min(resultPage * resultsPerPage, results.length)}</p><div className="card-list">{pagedResults.map((result, index) => <ResultCard key={`${result.maGCN}-${resultPage}-${index}`} result={result} />)}</div>{totalResultPages > 1 && <nav className="lookup-pagination"><button disabled={resultPage <= 1} onClick={() => setResultPage((page) => Math.max(1, page - 1))}>Trước</button>{pages.map((number, index) => number === "..." ? <span key={`ellipsis-${index}`}>...</span> : <button key={number} className={number === resultPage ? "active" : ""} onClick={() => setResultPage(number)}>{number}</button>)}<button disabled={resultPage >= totalResultPages} onClick={() => setResultPage((page) => Math.min(totalResultPages, page + 1))}>Sau</button></nav>}</section>}</section>;
}
