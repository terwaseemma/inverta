import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-image.png";
import wordmarkImage from "@/assets/wordmark.png";

const Hero = () => {
  return (
    <section className="flex-1 px-6 py-12 lg:px-8 lg:ml-[70px]">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8 text-center md:text-left relative z-10">
            {/* Inverta wordmark */}
            <div className="flex justify-center md:justify-start">
              <img src={wordmarkImage} alt="Inverta" className="h-4 md:h-6 w-auto" />
            </div>

            {/* Main headline */}
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground leading-tight">
                Solar sales
              </h1>
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold italic orange-text leading-tight">
                made easy.
              </h1>
            </div>

            {/* Subtext */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0">
              Create a solar calculator, share to customers. Buy and sell quality solar products.
            </p>

            {/* CTA Button */}
            <a href="https://bit.ly/Inverta" target="_blank" rel="noopener noreferrer" className="inline-block">
              <Button 
                size="lg" 
                className="bg-white/80 text-black font-medium px-8 py-4 text-base md:text-lg border border-white/30 rounded-lg hover:bg-white transition-colors duration-200 w-full sm:w-auto mt-4 md:mt-0"
              >
                Create your solar calculator
              </Button>
            </a>
          </div>

          {/* Right content - Hero image */}
          <div className="relative z-0 sm:-ml-24 md:-ml-16 lg:-ml-28 xl:-ml-40 2xl:-ml-52">
            <img 
              src={heroImage} 
              alt="Inverta solar calculator interface" 
              className="w-full h-auto mx-auto scale-[1.6] md:scale-125 xl:scale-150 2xl:scale-[1.65] -translate-x-[110px] sm:-translate-x-24 md:-translate-x-24 lg:-translate-x-32 xl:-translate-x-40 2xl:-translate-x-56 pointer-events-none select-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;