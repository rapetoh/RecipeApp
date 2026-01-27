export default function SupportPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.logo}>PocketChef</div>
          <h1 style={styles.title}>Support</h1>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Need Help?</h2>
          <p style={styles.paragraph}>
            We're here to help! If you have any questions, issues, or feedback about PocketChef, please don't hesitate to reach out.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Contact Us</h2>
          <div style={styles.contactBox}>
            <p style={styles.contactText}>
              <strong>Email:</strong>{' '}
              <a href="mailto:rochapetoh@hotmail.com?subject=PocketChef%20Support%20Request" style={styles.link}>
                rochapetoh@hotmail.com
              </a>
            </p>
            <p style={styles.contactText}>
              <strong>App:</strong> PocketChef
            </p>
          </div>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Common Questions</h2>
          
          <h3 style={styles.subsectionTitle}>Subscription & Billing</h3>
          <p style={styles.paragraph}>
            For subscription management, billing questions, or to cancel your subscription, please use the subscription management options in your device's App Store settings.
          </p>
          
          <h3 style={styles.subsectionTitle}>Account Issues</h3>
          <p style={styles.paragraph}>
            If you're experiencing issues with your account, password reset, or login problems, please contact us via email with your account email address.
          </p>
          
          <h3 style={styles.subsectionTitle}>Feature Requests & Feedback</h3>
          <p style={styles.paragraph}>
            We love hearing from our users! If you have suggestions for new features or feedback about the app, please email us.
          </p>
        </div>
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Response Time</h2>
          <p style={styles.paragraph}>
            We aim to respond to all support inquiries within 24-48 hours. For urgent issues, please include "URGENT" in your email subject line.
          </p>
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
  link: {
    color: '#FF9F1C',
    textDecoration: 'none',
    fontWeight: '600',
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
