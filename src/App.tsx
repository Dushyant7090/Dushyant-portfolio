import { GlyphStreamCursor } from './components/GlyphStreamCursor';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { IntroReassemblySection } from './components/IntroReassemblySection';
import { KeyboardScrollController } from './components/KeyboardScrollController';
import { ToolkitSection } from './components/ToolkitSection';
import { WorkSection } from './components/WorkSection';
import { FooterSection } from './components/FooterSection';
import { ScrollProgressRail } from './components/ScrollProgressRail';

export default function App() {
  return (
    <div className="min-h-screen bg-[#ECEAE2] text-[#14191A]">
      <KeyboardScrollController />
      <GlyphStreamCursor />
      <ScrollProgressRail />
      <Header />
      <main>
        <HeroSection />
        <IntroReassemblySection />
        <ToolkitSection />
        <WorkSection />
      </main>
      <FooterSection />
    </div>
  );
}
