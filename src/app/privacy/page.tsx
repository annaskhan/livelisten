import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — LiveListen",
};

export default function PrivacyPolicy() {
  return (
    <div style={{ background: "#111318", color: "#e4e0d8", minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: 1.8 }}>
        <a href="/" style={{ color: "#c4a882", fontSize: 13, fontFamily: "Inter, sans-serif", textDecoration: "none" }}>&larr; Back to LiveListen</a>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#9a9484", fontSize: 14, fontFamily: "Inter, sans-serif", marginBottom: 32 }}>Last updated: March 2026</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Overview</h2>
        <p>LiveListen is a real-time audio translation app. We are committed to protecting your privacy and being transparent about how we handle your data.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data We Process</h2>
        <p><strong>Audio Data:</strong> When you use LiveListen, your device&apos;s microphone captures audio which is sent to our speech recognition service (Deepgram) for real-time transcription. Audio is processed in real-time and is not stored on our servers.</p>
        <p><strong>Transcribed Text:</strong> The transcribed text is sent to our translation service (powered by Anthropic&apos;s Claude) for translation. Text is processed in real-time and is not stored on our servers beyond the request lifecycle.</p>
        <p><strong>Session History:</strong> Your translation sessions are stored locally on your device using browser storage (localStorage). This data never leaves your device and is not sent to any server.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data We Do Not Collect</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>We do not collect personal information (name, email, phone number)</li>
          <li>We do not use cookies for tracking</li>
          <li>We do not store audio recordings</li>
          <li>We do not sell or share data with third parties for advertising</li>
          <li>We do not track your location</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Third-Party Services</h2>
        <p>LiveListen uses the following third-party services to function:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Deepgram</strong> — for speech-to-text transcription. Deepgram processes audio streams in real-time. See <a href="https://deepgram.com/privacy" style={{ color: "#c4a882" }}>Deepgram&apos;s Privacy Policy</a>.</li>
          <li><strong>Anthropic (Claude)</strong> — for text translation. Anthropic processes text for translation purposes only. See <a href="https://www.anthropic.com/privacy" style={{ color: "#c4a882" }}>Anthropic&apos;s Privacy Policy</a>.</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Your Data Rights</h2>
        <p>Since we do not store personal data on our servers, there is no personal data to request, modify, or delete. Session data stored on your device can be deleted at any time by clearing your browser&apos;s localStorage or using the delete function within the app.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Microphone Access</h2>
        <p>LiveListen requires microphone access to function. You can revoke this permission at any time through your browser or device settings. The app will not function without microphone access but no data will be collected.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Children&apos;s Privacy</h2>
        <p>LiveListen is not directed at children under 13. We do not knowingly collect personal information from children.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Changes to This Policy</h2>
        <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Contact</h2>
        <p>If you have questions about this privacy policy, please contact us at <a href="mailto:privacy@livelisten.app" style={{ color: "#c4a882" }}>privacy@livelisten.app</a>.</p>
      </div>
    </div>
  );
}
