import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Features } from "@/components/features";
import { Architecture } from "@/components/architecture";
import { ApiSection } from "@/components/api-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="relative min-h-[100dvh]">
      <Header />
      <Hero />
      <Features />
      <Architecture />
      <ApiSection />
      <Footer />
    </main>
  );
}
