import { Header } from "@/components/Header";
import { NERAnalyzer } from "@/components/NERAnalyzer";

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper">
      <Header />
      <NERAnalyzer />
    </div>
  );
}
