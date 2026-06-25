import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";

export default function StatementPage() {
  return <><main className="container statement-container"><SiteHeader activePage="statement" /><section className="statement-card"><div className="statement-head"><h2>Sao kê tài khoản minh bạch</h2><p>Theo dõi thông tin sao kê tài khoản được nhúng trực tiếp từ nền tảng Thiện Nguyện.</p></div><div className="statement-frame-wrap"><iframe className="statement-frame" src="https://thiennguyen.app/doi-tac/minh-bach-tai-khoan/9446" title="Sao kê tài khoản minh bạch Fly To Sky" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div></section></main><Footer /></>;
}
