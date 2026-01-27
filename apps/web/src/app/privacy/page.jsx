export default function PrivacyPolicyPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.logo}>PocketChef</div>
          <h1 style={styles.title}>Privacy Policy</h1>
          <p style={styles.lastUpdated}>Last Updated: December 28, 2024</p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Introduction</h2>
          <p style={styles.paragraph}>
            PocketChef ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Information We Collect</h2>
          <p style={styles.paragraph}>We collect the following types of information:</p>
          
          <h3 style={styles.subsectionTitle}>2.1 Personal Information</h3>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>Name:</span> Used for account identification and personalization</li>
            <li><span style={styles.highlight}>Email Address:</span> Used for account authentication and communication</li>
          </ul>
          
          <h3 style={styles.subsectionTitle}>2.2 User Content</h3>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>Photos/Videos:</span> Food photos you upload for recipe recognition and generation</li>
            <li><span style={styles.highlight}>Audio Data:</span> Voice recordings for recipe suggestions</li>
            <li><span style={styles.highlight}>Recipes, Preferences, and Meal Plans:</span> Content you create or save in the app</li>
          </ul>
          
          <h3 style={styles.subsectionTitle}>2.3 Identifiers</h3>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>User ID:</span> Unique identifier for your account</li>
            <li><span style={styles.highlight}>Device ID:</span> Used for subscription management and app functionality</li>
          </ul>
          
          <h3 style={styles.subsectionTitle}>2.4 Purchase Information</h3>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>Purchase History:</span> Subscription and purchase data managed through RevenueCat</li>
          </ul>
          
          <h3 style={styles.subsectionTitle}>2.5 Usage Data</h3>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>Product Interaction:</span> How you interact with app features</li>
            <li><span style={styles.highlight}>Other Usage Data:</span> General app usage patterns</li>
          </ul>
          
          <h3 style={styles.subsectionTitle}>2.6 Diagnostics</h3>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>Crash Data:</span> Information about app crashes for debugging</li>
            <li><span style={styles.highlight}>Performance Data:</span> App performance metrics</li>
            <li><span style={styles.highlight}>Other Diagnostic Data:</span> Additional diagnostic information</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. How We Use Your Information</h2>
          <p style={styles.paragraph}>We use your information for the following purposes:</p>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>App Functionality:</span> To provide core features including recipe generation, food recognition, voice suggestions, meal planning, and subscription management</li>
            <li><span style={styles.highlight}>Product Personalization:</span> To customize recipes and meal plans based on your preferences</li>
            <li><span style={styles.highlight}>Analytics:</span> To understand app usage and improve our services</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Third-Party Services</h2>
          <p style={styles.paragraph}>We use the following third-party services:</p>
          <ul style={styles.list}>
            <li><span style={styles.highlight}>OpenAI:</span> For AI-powered recipe generation, food recognition, and audio transcription</li>
            <li><span style={styles.highlight}>Cloudinary:</span> For image storage and processing</li>
            <li><span style={styles.highlight}>RevenueCat:</span> For subscription management and purchase verification</li>
            <li><span style={styles.highlight}>Apple App Store:</span> For app distribution and in-app purchases</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Data Storage and Security</h2>
          <p style={styles.paragraph}>
            Your data is stored securely on our servers and with our third-party service providers. We implement appropriate security measures to protect your information from unauthorized access, alteration, disclosure, or destruction.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Data Retention</h2>
          <p style={styles.paragraph}>
            We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Your Rights</h2>
          <p style={styles.paragraph}>You have the right to:</p>
          <ul style={styles.list}>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your account and data</li>
            <li>Opt out of certain data collection (where applicable)</li>
          </ul>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Children's Privacy</h2>
          <p style={styles.paragraph}>
            Our app is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>9. Changes to This Privacy Policy</h2>
          <p style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>10. Contact Us</h2>
          <p style={styles.paragraph}>If you have questions about this Privacy Policy, please contact us:</p>
          <div style={styles.contactBox}>
            <p style={styles.contactText}><strong>Email:</strong> rochapetoh@hotmail.com</p>
            <p style={styles.contactText}><strong>App:</strong> PocketChef</p>
          </div>
        </div>
        
        <div style={styles.footer}>
          <p>&copy; 2024 PocketChef. All rights reserved.</p>
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
