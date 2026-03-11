import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — LiveListen",
};

export default function TermsOfService() {
  return (
    <div style={{ background: "#111318", color: "#e4e0d8", minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "'Source Serif 4', Georgia, serif", lineHeight: 1.8 }}>
        <a href="/" style={{ color: "#c4a882", fontSize: 13, fontFamily: "Inter, sans-serif", textDecoration: "none" }}>&larr; Back to LiveListen</a>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "#9a9484", fontSize: 14, fontFamily: "Inter, sans-serif", marginBottom: 32 }}>Last updated: March 2026</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Acceptance of Terms</h2>
        <p>By using LiveListen, you agree to these Terms of Service. If you do not agree, please do not use the app.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Description of Service</h2>
        <p>LiveListen provides real-time audio translation services. The app captures spoken audio through your device&apos;s microphone, transcribes it, and translates it into your selected target language.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Acceptable Use</h2>
        <p>You agree to use LiveListen only for lawful purposes. You may not:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Use the service to violate any local, state, national, or international law</li>
          <li>Attempt to overwhelm or abuse the service through excessive automated requests</li>
          <li>Reverse engineer, decompile, or disassemble any part of the service</li>
          <li>Use the service to record or translate conversations without the consent of all parties where required by law</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Translation Accuracy</h2>
        <p>LiveListen uses AI-powered translation which, while generally accurate, may contain errors. Translations are provided &quot;as-is&quot; and should not be relied upon for critical, legal, medical, or safety-related communications. Always verify important translations with a qualified human translator.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Intellectual Property</h2>
        <p>The LiveListen app, including its design, code, and branding, is the intellectual property of its creators. You are granted a limited, non-exclusive license to use the app for personal and non-commercial purposes.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Service Availability</h2>
        <p>We strive to keep LiveListen available at all times, but we do not guarantee uninterrupted access. The service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, LiveListen and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service, including but not limited to errors in translation, loss of data, or service interruptions.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Changes to Terms</h2>
        <p>We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Contact</h2>
        <p>If you have questions about these terms, please contact us at <a href="mailto:legal@livelisten.app" style={{ color: "#c4a882" }}>legal@livelisten.app</a>.</p>
      </div>
    </div>
  );
}
