import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import iconImage from "@/assets/icon.png";
import wordmarkImage from "@/assets/wordmark.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="w-full px-6 py-6 lg:px-8 relative z-20">
      <nav className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center">
          <img src={iconImage} alt="Inverta" className="h-8 w-auto" />
        </div>

        {/* Navigation - Hidden on mobile, shown on desktop */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="https://bit.ly/Inverta" className="text-foreground hover:text-orange transition-colors" target="_blank" rel="noopener noreferrer">
            About
          </a>
          <a href="https://bit.ly/Inverta" className="text-foreground hover:text-orange transition-colors" target="_blank" rel="noopener noreferrer">
            Installers
          </a>
          <a href="https://bit.ly/Inverta" className="text-foreground hover:text-orange transition-colors" target="_blank" rel="noopener noreferrer">
            Packages
          </a>
        </div>

        {/* Desktop Sign up button */}
        <a href="https://bit.ly/Inverta" target="_blank" rel="noopener noreferrer" className="hidden md:flex">
          <Button 
            variant="outline" 
            className="glass-button border-border transition-all duration-200 signup-gradient-hover"
          >
            Sign up
          </Button>
        </a>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-foreground hover:text-orange transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-border/20">
          <div className="flex flex-col items-center space-y-4 pt-4 text-center">
            <a href="https://bit.ly/Inverta" className="text-foreground hover:text-orange transition-colors" target="_blank" rel="noopener noreferrer">
              About
            </a>
            <a href="https://bit.ly/Inverta" className="text-foreground hover:text-orange transition-colors" target="_blank" rel="noopener noreferrer">
              Installers
            </a>
            <a href="https://bit.ly/Inverta" className="text-foreground hover:text-orange transition-colors" target="_blank" rel="noopener noreferrer">
              Packages
            </a>
            <a href="https://bit.ly/Inverta" target="_blank" rel="noopener noreferrer" className="inline-block">
              <Button 
                variant="outline" 
                className="glass-button border-border transition-all duration-200 w-32 signup-gradient-hover"
              >
                Sign up
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;