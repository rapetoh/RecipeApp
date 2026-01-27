export default function TermsOfUsePage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.logo}>PocketChef</div>
          <h1 style={styles.title}>Terms of Use</h1>
          <p style={styles.lastUpdated}>Last Updated: January 27, 2026</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Acceptance of Terms</h2>
          <p style={styles.paragraph}>
            By downloading, installing, or using PocketChef ("the App"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, do not use the App.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Description of Service</h2>
          <p style={styles.paragraph}>
            PocketChef is a mobile application that provides recipe suggestions, food recognition, meal planning, and grocery list generation services. The App uses artificial intelligence to generate personalized recipe recommendations based on your preferences and input.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Subscription Services</h2>
          
          <h3 style={styles.subsectionTitle}>3.1 Auto-Renewable Subscriptions</h3>
          <p style={styles.paragraph}>PocketChef offers premium subscription services ("PocketChef Premium") with the following options:</p>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>Monthly Subscription:</span> Automatically renews every month until cancelled</li>
            <li><span style={styles.highlight}>Yearly Subscription:</span> Automatically renews every year until cancelled</li>
          </ul>
          
          <h3 style={styles.subsectionTitle}>3.2 Subscription Terms</h3>
          <ul style={styles.list}>
            <li>Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period</li>
            <li>Your account will be charged for renewal within 24 hours prior to the end of the current period</li>
            <li>You can manage and cancel your subscriptions by going to your account settings in the App Store after purchase</li>
            <li>Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription</li>
          </ul>
          
          <h3 style={styles.subsectionTitle}>3.3 Pricing</h3>
          <p style={styles.paragraph}>
            Subscription prices are displayed in the App and may vary by region. Prices are subject to change with notice. Current pricing is available in the App's subscription section.
          </p>
          
          <h3 style={styles.subsectionTitle}>3.4 Cancellation</h3>
          <p style={styles.paragraph}>
            You may cancel your subscription at any time through your device's subscription management settings. Cancellation will take effect at the end of the current billing period, and you will continue to have access to premium features until that time.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>4. User Accounts</h2>
          <ul style={styles.list}>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You are responsible for all activities that occur under your account</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>5. User Content</h2>
          <p style={styles.paragraph}>
            You retain ownership of any content you create, upload, or share through the App ("User Content"). By using the App, you grant us a license to:
          </p>
          <ul style={styles.list}>
            <li>Store and process your User Content to provide the App's services</li>
            <li>Use your User Content to improve our services and AI models</li>
            <li>Display your User Content within the App</li>
          </ul>
          <p style={styles.paragraph}>
            You represent and warrant that you have all necessary rights to grant this license and that your User Content does not violate any third-party rights or applicable laws.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Acceptable Use</h2>
          <p style={styles.paragraph}>You agree not to:</p>
          <ul style={styles.list}>
            <li>Use the App for any illegal purpose or in violation of any laws</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Attempt to reverse engineer, decompile, or disassemble the App</li>
            <li>Interfere with or disrupt the App's services or servers</li>
            <li>Use automated systems to access the App without permission</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Intellectual Property</h2>
          <p style={styles.paragraph}>
            The App, including its design, features, and content (excluding User Content), is owned by PocketChef and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the App without our express written permission.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>8. AI-Generated Content</h2>
          <p style={styles.paragraph}>The App uses artificial intelligence to generate recipes and suggestions. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You acknowledge that:</p>
          <ul style={styles.list}>
            <li>AI-generated recipes are suggestions and should be reviewed before use</li>
            <li>You are responsible for verifying ingredient safety and allergen information</li>
            <li>We are not liable for any issues arising from following AI-generated recipes</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Disclaimers</h2>
          <p style={styles.paragraph}>
            THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p style={styles.paragraph}>
            We do not guarantee that the App will be uninterrupted, error-free, or secure. Recipe suggestions are provided for informational purposes only and should not replace professional dietary advice.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>10. Limitation of Liability</h2>
          <p style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>11. Indemnification</h2>
          <p style={styles.paragraph}>
            You agree to indemnify and hold harmless PocketChef, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the App or violation of these Terms.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>12. Changes to Terms</h2>
          <p style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms in the App or by other reasonable means. Your continued use of the App after such changes constitutes acceptance of the modified Terms.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>13. Termination</h2>
          <p style={styles.paragraph}>
            We may terminate or suspend your access to the App at any time, with or without cause or notice, for any reason, including violation of these Terms. Upon termination, your right to use the App will immediately cease.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>14. Governing Law</h2>
          <p style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>15. Contact Information</h2>
          <p style={styles.paragraph}>If you have questions about these Terms, please contact us:</p>
          <div style={styles.contactBox}>
            <p style={styles.contactText}><strong>Email:</strong> rochapetoh@hotmail.com</p>
            <p style={styles.contactText}><strong>App:</strong> PocketChef</p>
          </div>
        </div>
        
        <div style={styles.footer}>
          <p>&copy; 2026 PocketChef. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
    paddingBottom: '24px',
    borderBottom: '1px solid #E8E8E8',
  },
  logo: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FF9F1C',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  lastUpdated: {
    fontSize: '14px',
    color: '#666666',
    fontWeight: '400',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: '16px',
    letterSpacing: '-0.3px',
  },
  subsectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: '24px',
    marginBottom: '12px',
  },
  paragraph: {
    fontSize: '16px',
    color: '#1A1A1A',
    marginBottom: '16px',
    lineHeight: '1.6',
  },
  list: {
    marginLeft: '24px',
    marginBottom: '16px',
  },
  highlight: {
    color: '#FF9F1C',
    fontWeight: '600',
  },
  contactBox: {
    backgroundColor: '#FFF5E6',
    borderLeft: '4px solid #FF9F1C',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px',
  },
  contactText: {
    fontSize: '16px',
    color: '#1A1A1A',
    marginBottom: '8px',
  },
  footer: {
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: '1px solid #E8E8E8',
    textAlign: 'center',
    color: '#666666',
    fontSize: '14px',
  },
};
