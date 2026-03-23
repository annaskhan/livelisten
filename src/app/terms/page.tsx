import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Evolv",
};

export default function TermsOfService() {
  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "var(--font-display, 'Source Serif 4', Georgia, serif)", lineHeight: 1.8 }}>
        <a href="/" style={{ color: "var(--primary)", fontSize: 13, fontFamily: "var(--font-sans, Inter, sans-serif)", textDecoration: "none" }}>&larr; Back to Evolv</a>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, fontFamily: "var(--font-sans, Inter, sans-serif)", marginBottom: 32 }}>Last updated: March 2026</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Acceptance of Terms</h2>
        <p>By using Evolv, you agree to these Terms of Service. If you do not agree, please do not use the app.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Description of Service</h2>
        <p>Evolv is a personal growth companion app that helps you track goals, write journal entries, monitor your mood, and visualize your progress. All data is stored locally on your device.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Acceptable Use</h2>
        <p>You agree to use Evolv only for lawful purposes. You may not:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>Attempt to overwhelm or abuse the service through excessive automated requests</li>
          <li>Reverse engineer, decompile, or disassemble any part of the service</li>
          <li>Use the service to violate any local, state, national, or international law</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Your Data</h2>
        <p>All data you create in Evolv (goals, journal entries, settings) is stored locally on your device. We do not have access to your data. You are responsible for backing up your own data. Clearing your browser data or using the &quot;Reset Everything&quot; feature will permanently delete all app data.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Intellectual Property</h2>
        <p>The Evolv app, including its design, code, and branding, is the intellectual property of its creators. You are granted a limited, non-exclusive license to use the app for personal purposes.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Service Availability</h2>
        <p>We strive to keep Evolv available at all times, but we do not guarantee uninterrupted access. The service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, Evolv and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service, including but not limited to loss of data or service interruptions.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Changes to Terms</h2>
        <p>We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Contact</h2>
        <p>If you have questions about these terms, please contact us at <a href="mailto:legal@evolv.app" style={{ color: "var(--primary)" }}>legal@evolv.app</a>.</p>
      </div>
    </div>
  );
}
