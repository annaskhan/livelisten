import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Evolv",
};

export default function PrivacyPolicy() {
  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "var(--font-display, 'Source Serif 4', Georgia, serif)", lineHeight: 1.8 }}>
        <a href="/" style={{ color: "var(--primary)", fontSize: 13, fontFamily: "var(--font-sans, Inter, sans-serif)", textDecoration: "none" }}>&larr; Back to Evolv</a>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, fontFamily: "var(--font-sans, Inter, sans-serif)", marginBottom: 32 }}>Last updated: March 2026</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Overview</h2>
        <p>Evolv is a personal growth companion app. We are committed to protecting your privacy and being transparent about how we handle your data.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data Storage</h2>
        <p><strong>Local Storage:</strong> All your data — goals, journal entries, settings, and preferences — is stored locally on your device using browser localStorage. This data never leaves your device and is not sent to any server.</p>
        <p><strong>No Account Required:</strong> Evolv does not require you to create an account. There is no sign-up, no login, and no personal information collected.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Data We Do Not Collect</h2>
        <ul style={{ paddingLeft: 20 }}>
          <li>We do not collect personal information (name, email, phone number)</li>
          <li>We do not use cookies for tracking</li>
          <li>We do not sell or share data with third parties</li>
          <li>We do not track your location</li>
          <li>We do not use analytics or tracking scripts</li>
        </ul>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Your Data Rights</h2>
        <p>Since all data is stored locally on your device, you have full control. You can delete all your data at any time through the Settings page (&quot;Reset Everything&quot;) or by clearing your browser&apos;s localStorage.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Children&apos;s Privacy</h2>
        <p>Evolv is not directed at children under 13. We do not knowingly collect personal information from children.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Changes to This Policy</h2>
        <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.</p>

        <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32, marginBottom: 12 }}>Contact</h2>
        <p>If you have questions about this privacy policy, please contact us at <a href="mailto:privacy@evolv.app" style={{ color: "var(--primary)" }}>privacy@evolv.app</a>.</p>
      </div>
    </div>
  );
}
