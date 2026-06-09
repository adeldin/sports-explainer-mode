export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Privacy Policy — Sports Explainer</h1>
      <p><em>Last updated: June 2026</em></p>

      <h2>What We Collect</h2>
      <p>Sports Explainer only transmits: selected sport, game ID, explanation level, language preference, and questions you type in Ask Anything.</p>

      <h2>What We Do NOT Collect</h2>
      <p>We do not collect browsing history, video content, passwords, payment data, or any personal information.</p>

      <h2>Local Storage</h2>
      <p>Your preferences (theme, font size, overlay position, accent color) are saved locally on your device via chrome.storage.local and never transmitted.</p>

      <h2>Third-Party Services</h2>
      <p>ESPN Public API — live game data. Groq AI — generates explanations. Vercel — hosts our backend.</p>

      <h2>Permissions</h2>
      <p>Host permissions are required so the overlay works on any streaming site (ESPN+, YouTube TV, Peacock). The extension does not read or transmit page content.</p>

      <h2>AI Disclaimer</h2>
      <p>Explanations are AI-generated and educational. They may occasionally be inaccurate. Sports Explainer is not affiliated with ESPN or any professional league.</p>

      <h2>Contact</h2>
      <p>Questions? Email: privacy@balloonandtusk.com</p>
    </main>
  );
}