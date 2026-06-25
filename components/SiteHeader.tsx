import Link from "next/link";

export function SiteHeader({
  activePage,
}: {
  activePage: "lookup" | "statement";
}) {
  const isLookup = activePage === "lookup";
  return (
    <header className="site-header">
      <div className="brand-mark">
        <img src="/logo.png" alt="Fly To Sky" />
      </div>
      <h1>Hệ thống từ thiện Fly To Sky</h1>
      <p className="subtitle">
        {isLookup ? "Tra cứu Giấy Chứng Nhận" : "Sao kê tài khoản minh bạch"}
      </p>
      <nav className="page-tabs" aria-label="Chuyển trang">
        <Link className={`tab-btn ${isLookup ? "active" : ""}`} href="/tracuu">
          Tra cứu Giấy chứng nhận
        </Link>
        <Link className={`tab-btn ${!isLookup ? "active" : ""}`} href="/saoke">
          Sao kê tài khoản
        </Link>
      </nav>
    </header>
  );
}
