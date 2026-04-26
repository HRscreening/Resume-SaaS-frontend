import { Link } from "@tanstack/react-router";

const LAST_UPDATED = "April 26, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3EE" }}>
      <header className="border-b border-[#E8E5DF] bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-[#0F0F0F]">HireSort</Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link to="/terms" className="text-[#737373] hover:text-[#0F0F0F]">Terms</Link>
            <Link to="/login" className="text-[#0F0F0F] font-medium">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs uppercase tracking-wider text-[#C85A17] font-semibold mb-2">Legal</p>
        <h1 className="text-3xl font-bold text-[#0F0F0F] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#737373] mb-10">Last updated: {LAST_UPDATED}</p>

        <Section title="1. Overview">
          <p>
            HireSort (&ldquo;HireSort&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a recruitment-assistance platform.
            This Privacy Policy explains what personal information we collect, how we use it,
            and the rights you have. It applies to our website, the HireSort application, and
            related services (the &ldquo;Service&rdquo;).
          </p>
          <p>
            For candidate data uploaded by recruiters, the recruiter (our customer) is the
            <strong> data controller</strong>. HireSort acts as the <strong>data processor</strong>
            and processes such data on the customer&apos;s instructions.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong>Account information</strong> &mdash; name, email, organisation, password hash, role, and onboarding details you provide.</p>
          <p><strong>Customer Data</strong> &mdash; resumes, job descriptions, screening criteria, candidate notes, and other content you upload to evaluate candidates.</p>
          <p><strong>Usage data</strong> &mdash; logs, device and browser information, IP address, timestamps, and feature usage. Used for security, debugging, and product improvement.</p>
          <p><strong>Payment metadata</strong> &mdash; subscription plan, billing status, and payment identifiers. We <strong>do not store card numbers</strong>; payments are handled by Razorpay.</p>
          <p><strong>Communications</strong> &mdash; emails you send to support and feedback you submit.</p>
        </Section>

        <Section title="3. How We Use Information">
          <ul>
            <li>Operate, maintain, and improve the Service;</li>
            <li>Process screenings and produce candidate scores and rankings;</li>
            <li>Authenticate users, secure accounts, and prevent abuse;</li>
            <li>Process payments and manage subscriptions;</li>
            <li>Provide customer support and respond to enquiries;</li>
            <li>Send transactional emails (account, billing, security);</li>
            <li>Comply with legal obligations and enforce our Terms.</li>
          </ul>
        </Section>

        <Section title="4. Legal Basis for Processing (GDPR)">
          <p>If you are in the European Economic Area, the United Kingdom, or Switzerland, our legal bases are:</p>
          <ul>
            <li><strong>Contract</strong> &mdash; to deliver the Service you signed up for;</li>
            <li><strong>Legitimate interests</strong> &mdash; security, fraud prevention, product analytics;</li>
            <li><strong>Legal obligation</strong> &mdash; tax, accounting, lawful requests;</li>
            <li><strong>Consent</strong> &mdash; where required (e.g. marketing emails). You may withdraw consent at any time.</li>
          </ul>
        </Section>

        <Section title="5. AI Model Training">
          <p>
            <strong>We do not train AI models on Customer Data.</strong> Customer Data is used
            solely to perform screenings for the customer who submitted it. Our AI providers
            (see &ldquo;Sub-processors&rdquo;) are contractually bound not to use paid-tier inputs to
            train their general models.
          </p>
        </Section>

        <Section title="6. Sub-processors">
          <p>We rely on the following sub-processors to provide the Service:</p>
          <ul>
            <li><strong>Supabase</strong> &mdash; database, authentication, file storage (USA / EU)</li>
            <li><strong>Google (Gemini API)</strong> &mdash; AI inference for rubric generation, scoring, and ranking (USA)</li>
            <li><strong>Railway</strong> &mdash; backend hosting (USA)</li>
            <li><strong>Vercel</strong> &mdash; frontend hosting and CDN (USA / global)</li>
            <li><strong>Upstash</strong> &mdash; managed Redis for job queues (USA)</li>
            <li><strong>Razorpay</strong> &mdash; payment processing (India)</li>
            <li><strong>Resend</strong> &mdash; transactional email delivery (USA)</li>
          </ul>
          <p>
            We update this list when our sub-processors change. Material additions will be
            notified through the Service or by email.
          </p>
        </Section>

        <Section title="7. How We Share Information">
          <p>We share personal information only with:</p>
          <ul>
            <li>Sub-processors listed above, under written data-processing agreements;</li>
            <li>Authorities, where required by law or valid legal process;</li>
            <li>Acquirers, in connection with a merger or acquisition, subject to this policy;</li>
            <li>Other parties with your explicit consent.</li>
          </ul>
          <p>We do <strong>not</strong> sell personal information.</p>
        </Section>

        <Section title="8. Data Retention">
          <p>
            We retain Customer Data for as long as your account is active. Resumes and
            screenings deleted from the Service are removed from primary storage immediately
            and from backups within thirty (30) days. Account information is retained for the
            life of the account and for up to ninety (90) days after termination, except where
            longer retention is required by law.
          </p>
        </Section>

        <Section title="9. International Data Transfers">
          <p>
            HireSort is operated from Noida, India, and uses sub-processors located in India,
            the United States, and the European Union. Where personal data is transferred
            across borders, we rely on Standard Contractual Clauses or equivalent safeguards.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <p>
            Depending on your jurisdiction (GDPR, UK GDPR, CCPA/CPRA, India&apos;s DPDPA 2023, and
            similar laws), you may have the right to:
          </p>
          <ul>
            <li>Access the personal information we hold about you;</li>
            <li>Correct inaccurate information;</li>
            <li>Delete your information (subject to legal exceptions);</li>
            <li>Export your information in a portable format;</li>
            <li>Object to or restrict certain processing;</li>
            <li>Withdraw consent;</li>
            <li>Lodge a complaint with your local data-protection authority.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:privacy@hiresort.ai" className="text-[#0F0F0F] underline">privacy@hiresort.ai</a>.
            We will respond within thirty (30) days.
          </p>
        </Section>

        <Section title="11. Candidate Rights">
          <p>
            If you are a candidate whose resume has been uploaded to HireSort by a recruiter,
            the recruiter is the controller of your data. We will direct your request to the
            recruiter and assist them in fulfilling it. Please contact the organisation to
            which you applied directly, or write to us and we will route your request.
          </p>
          <p>
            <strong>Automated decisions:</strong> Our scoring is AI-assisted but final hiring
            decisions are made by humans. You have the right not to be subject to a decision
            based solely on automated processing under GDPR Article 22.
          </p>
        </Section>

        <Section title="12. Security">
          <p>
            We protect your information using industry-standard measures, including TLS
            encryption in transit, encryption at rest, role-based access controls,
            row-level-security policies in our database, and JWT-based session authentication.
            No system is perfectly secure; please notify us immediately of any suspected
            vulnerability.
          </p>
        </Section>

        <Section title="13. Cookies">
          <p>
            We use a small number of strictly necessary cookies for authentication and
            session management. We do not use advertising cookies or third-party trackers.
          </p>
        </Section>

        <Section title="14. Children">
          <p>
            HireSort is not intended for individuals under 18. We do not knowingly collect
            personal information from children. If you believe we have, please contact us so
            we can remove it.
          </p>
        </Section>

        <Section title="15. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date at
            the top reflects the latest revision. Material changes will be notified by email
            or in-app at least thirty (30) days before taking effect.
          </p>
        </Section>

        <Section title="16. Contact">
          <p>
            For privacy questions, requests, or complaints, write to{" "}
            <a href="mailto:privacy@hiresort.ai" className="text-[#0F0F0F] underline">privacy@hiresort.ai</a>.
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-[#E8E5DF] text-xs text-[#A0A0A0]">
          <p>
            <Link to="/" className="hover:text-[#0F0F0F]">&larr; Back to home</Link>
            <span className="mx-2">·</span>
            <Link to="/terms" className="hover:text-[#0F0F0F]">Terms of Service</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-[#0F0F0F] mb-3">{title}</h2>
      <div className="text-sm text-[#404040] leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-[#404040]">
        {children}
      </div>
    </section>
  );
}
