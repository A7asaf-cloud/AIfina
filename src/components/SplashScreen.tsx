import aifinaWordmark from '../assets/aifina-wordmark.png';

export function SplashScreen() {
  return (
    <main className="aifina-splash" aria-label="AIfina נטענת">
      <div className="aifina-splash-glow aifina-splash-glow-one" />
      <div className="aifina-splash-glow aifina-splash-glow-two" />
      <div className="aifina-splash-content">
        <img src={aifinaWordmark} alt="AIfina" className="aifina-splash-logo" />
        <p>הכסף שלך, בתמונה ברורה</p>
        <span className="aifina-splash-loader" aria-hidden="true"><i /></span>
      </div>
    </main>
  );
}
