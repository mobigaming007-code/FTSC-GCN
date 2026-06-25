import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { LookupPanel } from "@/components/LookupPanel";

export default function LookupPage() {
  return <><main className="container"><SiteHeader activePage="lookup" /><LookupPanel /></main><Footer /></>;
}
