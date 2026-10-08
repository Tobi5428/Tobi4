import { Link } from 'react-router-dom';
import './Terms.css';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using JEGA's digital banking platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to all the terms, please do not use the Service.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 18 years of age and a resident of Nigeria to open and maintain a JEGA account. You represent that all information you provide during registration is accurate, current, and complete.`,
  },
  {
    title: '3. Account Responsibilities',
    body: `You are solely responsible for maintaining the confidentiality of your login credentials. You agree to notify JEGA immediately at Jegainnovation@gmail.com or 08137825867 if you suspect unauthorised access to your account. JEGA will not be liable for any loss resulting from unauthorised use of your credentials.`,
  },
  {
    title: '4. Permitted Use',
    body: `The Service is provided for lawful personal and business financial activities including transfers, bill payments, airtime top-ups, and account management. You agree not to use the Service for money laundering, fraud, or any activity that violates applicable Nigerian or international law.`,
  },
  {
    title: '5. Fees and Charges',
    body: `JEGA reserves the right to introduce, change, or remove service fees. Any applicable charges will be clearly disclosed before you confirm a transaction. Continued use of the Service after a fee change constitutes acceptance of the new fee structure.`,
  },
  {
    title: '6. Transactions',
    body: `All transactions submitted through the platform are final once confirmed. You are responsible for verifying all transaction details before submission. JEGA will make reasonable efforts to reverse an erroneous transaction but cannot guarantee recovery of funds already disbursed.`,
  },
  {
    title: '7. Privacy',
    body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. We collect and process your data in accordance with the Nigeria Data Protection Act (NDPA) 2023.`,
  },
  {
    title: '8. Intellectual Property',
    body: `All content, branding, software, and materials on the JEGA platform are the exclusive property of JEGA Innovation and are protected by applicable intellectual property laws. You may not copy, modify, or distribute any part of the Service without prior written consent.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the fullest extent permitted by law, JEGA shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of or inability to use the Service, including but not limited to loss of profits, data, or goodwill.`,
  },
  {
    title: '10. Termination',
    body: `JEGA reserves the right to suspend or terminate your account at any time if you breach these Terms or if we are required to do so by law. You may close your account at any time by contacting our support team.`,
  },
  {
    title: '11. Changes to These Terms',
    body: `We may update these Terms from time to time. We will notify you of significant changes via email or in-app notification. Your continued use of the Service after the effective date of any revision constitutes your acceptance of the updated Terms.`,
  },
  {
    title: '12. Governing Law',
    body: `These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of Nigerian courts.`,
  },
  {
    title: '13. Contact Us',
    body: `If you have any questions about these Terms, please contact us:\nEmail: Jegainnovation@gmail.com\nPhone: 08137825867`,
  },
];

const Terms = () => {
  return (
    <div className="terms-page">
      <header className="terms-hero">
        <p className="terms-kicker">Legal</p>
        <h2>Terms &amp; Conditions</h2>
        <p className="terms-intro">
          Last updated: July 1, 2026 &mdash; Please read these terms carefully before using the JEGA platform.
        </p>
      </header>

      <article className="terms-body">
        {SECTIONS.map((section) => (
          <section key={section.title} className="terms-section">
            <h3>{section.title}</h3>
            {section.body.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </section>
        ))}
      </article>

      <div className="terms-footer-links">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
};

export default Terms;
