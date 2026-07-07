import { Link } from 'react-router-dom';

// Effective date of the current published version of these documents.
export const LEGAL_EFFECTIVE = '7 July 2026';
const CONTACT = 'support@openhouse.in';

function Privacy() {
  return (
    <>
      <h4>1. Who we are</h4>
      <p>
        This portal is operated by Openhouse (“Openhouse”, “we”, “us”), a real-estate
        resale platform operating in the Delhi-NCR region of India. We use this portal to
        run internship assignments and assess candidates. For any privacy question or
        request, contact us at <span className="mono">{CONTACT}</span>.
      </p>

      <h4>2. What we collect</h4>
      <ul>
        <li><strong>Account details</strong> from Google Sign-In: your name, email address, and profile photo.</li>
        <li><strong>Assignment data</strong> you enter: society and configuration details, broker/owner names and phone numbers you log, prices, call notes, and outcomes.</li>
        <li><strong>Call recordings</strong> you choose to upload, and the AI-generated transcripts and language detection derived from them.</li>
        <li><strong>Assessment data</strong> we generate: automated per-criterion scores, strengths, red flags, and a recommendation.</li>
        <li><strong>Basic technical data</strong> such as your IP address, used for security and rate limiting.</li>
      </ul>

      <h4>3. Why we use it</h4>
      <p>
        We process this information solely to administer the internship assignment, verify
        your identity, evaluate your submission, and communicate with you about the hiring
        process. We do not use it for advertising, and we do not sell it.
      </p>

      <h4>4. Third parties we share it with</h4>
      <p>We rely on a small number of service providers who process data on our behalf:</p>
      <ul>
        <li><strong>Google</strong> — authentication (sign-in).</li>
        <li><strong>Vercel</strong> — application hosting, file storage (recordings), and the database.</li>
        <li><strong>OpenAI</strong> — transcription of uploaded call recordings.</li>
        <li><strong>Anthropic</strong> — rubric-based scoring of your submission.</li>
      </ul>
      <p>
        These providers may process data outside India. We share only what is needed for
        each function and do not otherwise disclose your data except where required by law.
      </p>

      <h4>5. Call recordings and other people</h4>
      <p>
        Recordings you upload may contain the voices and personal details of third parties
        (for example brokers or property owners). You must only upload recordings you are
        legally entitled to make and share, and you are responsible for having obtained any
        consent required under applicable law before uploading. If you are unsure, do not
        upload the recording. See our <Link to="/terms">Terms &amp; Conditions</Link>.
      </p>

      <h4>6. How long we keep it</h4>
      <p>
        We retain submissions and recordings for as long as needed to run and review the
        hiring round, and for a reasonable period afterwards for record-keeping. You may ask
        us to delete your data at any time (see below); we will do so unless we are required
        to retain it.
      </p>

      <h4>7. Your rights</h4>
      <p>
        You may request access to, correction of, or deletion of your personal data, and you
        may withdraw consent for future processing. To exercise any of these, email
        <span className="mono"> {CONTACT}</span>. We handle personal data in line with India’s
        Digital Personal Data Protection Act, 2023 and other applicable laws.
      </p>

      <h4>8. Security</h4>
      <p>
        Access is authenticated, data is transmitted over encrypted connections, and only
        authorised Openhouse reviewers can view submissions. No system is perfectly secure,
        but we take reasonable measures to protect your information.
      </p>

      <h4>9. Changes</h4>
      <p>
        We may update this policy; the effective date above reflects the current version.
        Material changes will be reflected here before they take effect.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h4>1. Acceptance</h4>
      <p>
        By signing in and using this portal you agree to these Terms &amp; Conditions and to
        our <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the
        portal.
      </p>

      <h4>2. Eligibility</h4>
      <p>
        You must be at least 18 years old and applying for an Openhouse internship. You agree
        to provide accurate information and to complete the assignment as your own work.
      </p>

      <h4>3. Recording consent — your responsibility</h4>
      <p>
        The assignment involves recording real phone calls. You represent and warrant that,
        for every recording you upload, you have made the recording lawfully and have obtained
        any consent required under applicable law from the other participants. You will not
        upload recordings you are not entitled to share. You are solely responsible for your
        conduct on these calls and for complying with all applicable laws.
      </p>

      <h4>4. Acceptable use</h4>
      <ul>
        <li>Do not upload unlawful, misleading, fabricated, or plagiarised material.</li>
        <li>Do not upload malware or attempt to disrupt, probe, or gain unauthorised access to the portal.</li>
        <li>Do not impersonate anyone or misrepresent your relationship with any person.</li>
      </ul>

      <h4>5. Your submission and its use</h4>
      <p>
        You retain ownership of the work you create. By submitting, you grant Openhouse a
        licence to store, process, transcribe, and evaluate your submission for the purpose
        of the hiring assessment. Submissions are locked from editing once submitted.
      </p>

      <h4>6. Automated assessment</h4>
      <p>
        Your submission is scored with automated tools (transcription and AI rubric scoring)
        and may be reviewed by Openhouse staff. Scores are indicative and used to support,
        not replace, human hiring decisions. Participation does not guarantee an interview,
        internship, or any other outcome.
      </p>

      <h4>7. Availability and changes</h4>
      <p>
        The portal is provided on an “as is” and “as available” basis. We may modify,
        suspend, or discontinue any part of it, and we may update these Terms; continued use
        after a change means you accept the updated Terms.
      </p>

      <h4>8. Limitation of liability</h4>
      <p>
        To the maximum extent permitted by law, Openhouse is not liable for any indirect or
        consequential loss arising from your use of the portal, and our total liability is
        limited to the extent permitted by applicable law.
      </p>

      <h4>9. Governing law</h4>
      <p>
        These Terms are governed by the laws of India, and the courts at Delhi-NCR have
        exclusive jurisdiction over any dispute.
      </p>

      <h4>10. Contact</h4>
      <p>Questions about these Terms: <span className="mono">{CONTACT}</span>.</p>
    </>
  );
}

export default function Legal({ doc }) {
  const isPrivacy = doc === 'privacy';
  return (
    <div className="wrap">
      <div className="topbar">
        <Link to="/" className="btn-ghost" style={{ textDecoration: 'none' }}>← Back</Link>
        <Link
          to={isPrivacy ? '/terms' : '/privacy'}
          className="btn-ghost"
          style={{ textDecoration: 'none' }}
        >
          {isPrivacy ? 'Terms & Conditions' : 'Privacy Policy'} →
        </Link>
      </div>
      <div className="mast">
        <div className="mast-left">
          <div className="kicker">Openhouse — Internship</div>
          <h1>{isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'}</h1>
        </div>
      </div>
      <p className="note">Effective {LEGAL_EFFECTIVE}</p>
      <div className="panel ins" style={{ maxWidth: 760 }}>
        {isPrivacy ? <Privacy /> : <Terms />}
      </div>
    </div>
  );
}
