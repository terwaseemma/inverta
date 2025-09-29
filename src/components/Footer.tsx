import { Mail, Twitter, Linkedin, Instagram } from "lucide-react";
import wordmarkImage from "@/assets/wordmark.png";

const Footer = () => {
  return (
    <footer className="w-full px-6 py-8 lg:px-8 border-t border-border/20 relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
          {/* Logo and nav links */}
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
            <div>
              <img src={wordmarkImage} alt="Inverta" className="h-4 w-auto" />
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <a href="https://bit.ly/Inverta" className="text-muted-foreground hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                About
              </a>
              <a href="https://bit.ly/Inverta" className="text-muted-foreground hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                Installers
              </a>
              <a href="https://bit.ly/Inverta" className="text-muted-foreground hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                Packages
              </a>
            </div>
          </div>

          {/* Social icons */}
          <div className="flex items-center space-x-4">
            <a 
              href="https://bit.ly/Inverta" 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Email"
              target="_blank" rel="noopener noreferrer"
            >
              <Mail className="h-5 w-5" />
            </a>
            <a 
              href="https://bit.ly/Inverta" 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Twitter"
              target="_blank" rel="noopener noreferrer"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="https://bit.ly/Inverta" 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="LinkedIn"
              target="_blank" rel="noopener noreferrer"
            >
              <Linkedin className="h-5 w-5" />
            </a>
            <a 
              href="https://bit.ly/Inverta" 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Instagram"
              target="_blank" rel="noopener noreferrer"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;