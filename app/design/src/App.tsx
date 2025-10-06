import { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { HomeScreen } from "./components/HomeScreen";
import { BibleReaderScreen } from "./components/BibleReaderScreen";
import { NotesScreen } from "./components/NotesScreen";
import { HighlightsScreen } from "./components/HighlightsScreen";
import { MemoryScreen } from "./components/MemoryScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { BottomNavigation } from "./components/BottomNavigation";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./components/ThemeContext";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("home");

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNavigate={handleNavigate} />;
      case "reader":
        return <BibleReaderScreen onNavigate={handleNavigate} />;
      case "notes":
        return <NotesScreen onNavigate={handleNavigate} />;
      case "highlights":
        return <HighlightsScreen onNavigate={handleNavigate} />;
      case "memory":
        return <MemoryScreen onNavigate={handleNavigate} />;
      case "settings":
        return <SettingsScreen onNavigate={handleNavigate} />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        {renderScreen()}
        <BottomNavigation currentScreen={currentScreen} onNavigate={handleNavigate} />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}