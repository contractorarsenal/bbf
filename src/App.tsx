import { useState } from "react"
import { TopBar } from "./components/TopBar"
import { Header } from "./components/Header"
import { Hero } from "./components/Hero"
import { WhyChooseUs } from "./components/WhyChooseUs"
import { FlooringCategories } from "./components/FlooringCategories"
import { Reviews } from "./components/Reviews"
import { Footer } from "./components/Footer"
import { StickyBottomBar } from "./components/StickyBottomBar"
import { ChatLauncher } from "./components/assistant/ChatLauncher"
import { ChatPanel } from "./components/assistant/ChatPanel"

function App() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="min-h-screen bg-paper pb-12">
      <TopBar onStartProject={() => setChatOpen(true)} />
      <Header onStartProject={() => setChatOpen(true)} />
      <main>
        <Hero onStartProject={() => setChatOpen(true)} />
        <WhyChooseUs onStartProject={() => setChatOpen(true)} />
        <FlooringCategories />
        <Reviews />
      </main>
      <Footer />

      <StickyBottomBar onGetQuote={() => setChatOpen(true)} />
      <ChatLauncher open={chatOpen} onClick={() => setChatOpen((v) => !v)} />
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </div>
  )
}

export default App
