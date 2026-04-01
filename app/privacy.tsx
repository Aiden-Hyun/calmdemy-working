import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';

export default function PrivacyScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    lastUpdated: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 24,
      marginBottom: 12,
    },
    subSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    bulletList: {
      marginLeft: 16,
      marginBottom: 12,
    },
    bulletItem: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    bold: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    footer: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: 32,
      marginBottom: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: January 9, 2026</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Calmdemy ("we," "our," or "us"), operated by Aiden Hyun, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the App.
        </Text>
        <Text style={styles.paragraph}>
          We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of this Privacy Policy. You are encouraged to periodically review this Privacy Policy to stay informed of updates.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>

        <Text style={styles.subSectionTitle}>2.1 Personal Data You Provide</Text>
        <Text style={styles.paragraph}>We collect information that you voluntarily provide when registering for the App, including:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Account Information:</Text> Email address, display name, and password (if using email registration)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Authentication Data:</Text> Information received from Google or Apple when using social sign-in, including your name, email address, and unique identifier</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Profile Information:</Text> Any additional information you choose to add to your profile</Text>
        </View>

        <Text style={styles.subSectionTitle}>2.2 Automatically Collected Information</Text>
        <Text style={styles.paragraph}>When you use the App, we automatically collect certain information, including:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Usage Data:</Text> Meditation sessions completed, duration of sessions, content accessed, features used, and interaction patterns</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Device Information:</Text> Device type, operating system version, unique device identifiers, and mobile network information</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Log Data:</Text> Access times, pages viewed, app crashes, and other system activity</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Location Data:</Text> General location information (country/region level only, not precise GPS location)</Text>
        </View>

        <Text style={styles.subSectionTitle}>2.3 Information from Third Parties</Text>
        <Text style={styles.paragraph}>
          If you choose to link, connect, or log in to Calmdemy using a third-party service (Google, Apple), we receive information from that service as permitted by your settings with that service. This may include your name, email address, and profile picture.
        </Text>

        <Text style={styles.sectionTitle}>3. Legal Basis for Processing (GDPR)</Text>
        <Text style={styles.paragraph}>If you are located in the European Economic Area (EEA), our legal basis for collecting and using your personal information depends on the data concerned and the context in which we collect it. We process your personal data because:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Performance of Contract:</Text> Processing is necessary to provide you with the App and its features</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Consent:</Text> You have given us permission to do so for specific purposes</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Legitimate Interests:</Text> Processing is in our legitimate interests and not overridden by your rights (e.g., improving our services, preventing fraud)</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Legal Obligation:</Text> Processing is necessary to comply with applicable laws</Text>
        </View>

        <Text style={styles.sectionTitle}>4. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use the information we collect for the following purposes:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• To create and manage your account</Text>
          <Text style={styles.bulletItem}>• To provide, operate, and maintain the App</Text>
          <Text style={styles.bulletItem}>• To personalize your experience and content recommendations</Text>
          <Text style={styles.bulletItem}>• To track your meditation progress and display statistics</Text>
          <Text style={styles.bulletItem}>• To send you notifications related to your account or the App (if enabled)</Text>
          <Text style={styles.bulletItem}>• To respond to your comments, questions, and support requests</Text>
          <Text style={styles.bulletItem}>• To monitor and analyze usage patterns and trends</Text>
          <Text style={styles.bulletItem}>• To detect, prevent, and address technical issues and security threats</Text>
          <Text style={styles.bulletItem}>• To comply with legal obligations and enforce our Terms of Service</Text>
          <Text style={styles.bulletItem}>• To develop new features and improve existing ones</Text>
        </View>

        <Text style={styles.sectionTitle}>5. Disclosure of Your Information</Text>
        <Text style={styles.paragraph}>We may share your information in the following situations:</Text>

        <Text style={styles.subSectionTitle}>5.1 Service Providers</Text>
        <Text style={styles.paragraph}>
          We may share your information with third-party service providers who perform services on our behalf, such as hosting, data analysis, and customer service. These providers are contractually obligated to protect your information and may only use it for the purposes we specify.
        </Text>

        <Text style={styles.subSectionTitle}>5.2 Legal Requirements</Text>
        <Text style={styles.paragraph}>
          We may disclose your information where required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency), including to meet national security or law enforcement requirements.
        </Text>

        <Text style={styles.subSectionTitle}>5.3 Business Transfers</Text>
        <Text style={styles.paragraph}>
          If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you via email and/or a prominent notice in our App of any change in ownership or uses of your personal information.
        </Text>

        <Text style={styles.subSectionTitle}>5.4 With Your Consent</Text>
        <Text style={styles.paragraph}>
          We may disclose your personal information for any other purpose with your consent.
        </Text>

        <Text style={styles.sectionTitle}>6. Third-Party Services</Text>
        <Text style={styles.paragraph}>We use the following third-party services that may collect information about you:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Firebase (Google LLC):</Text> Authentication, cloud database, and analytics. Privacy Policy: https://firebase.google.com/support/privacy</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Google Sign-In:</Text> Optional authentication service. Privacy Policy: https://policies.google.com/privacy</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Apple Sign-In:</Text> Optional authentication service. Privacy Policy: https://www.apple.com/legal/privacy</Text>
        </View>
        <Text style={styles.paragraph}>
          These third-party services have their own privacy policies addressing how they use such information. We encourage you to review their privacy policies.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement appropriate technical and organizational security measures designed to protect the security of any personal information we process. These measures include encryption in transit and at rest, access controls, and regular security assessments. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
        </Text>
        <Text style={styles.paragraph}>
          We cannot guarantee absolute security of your data and you acknowledge that: (a) there are security and privacy limitations inherent to the Internet which are beyond our control; and (b) security, integrity, and privacy of any and all information exchanged between you and us through the App cannot be guaranteed.
        </Text>

        <Text style={styles.sectionTitle}>8. International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction. If you are located outside Canada and choose to provide information to us, please note that we transfer the data to Canada and process it there.
        </Text>
        <Text style={styles.paragraph}>
          For users in the EEA, we ensure that any transfer of personal data to countries outside the EEA is subject to appropriate safeguards, such as Standard Contractual Clauses approved by the European Commission.
        </Text>

        <Text style={styles.sectionTitle}>9. Data Retention</Text>
        <Text style={styles.paragraph}>
          We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.
        </Text>
        <Text style={styles.paragraph}>
          When you request deletion of your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal, regulatory, or legitimate business purposes (such as fraud prevention or resolving disputes).
        </Text>

        <Text style={styles.sectionTitle}>10. Your Privacy Rights</Text>
        <Text style={styles.paragraph}>Depending on your location, you may have the following rights regarding your personal data:</Text>

        <Text style={styles.subSectionTitle}>10.1 General Rights</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Access:</Text> Request a copy of the personal data we hold about you</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Rectification:</Text> Request correction of inaccurate or incomplete data</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Erasure:</Text> Request deletion of your personal data</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Portability:</Text> Request a copy of your data in a structured, machine-readable format</Text>
          <Text style={styles.bulletItem}>• <Text style={styles.bold}>Withdrawal of Consent:</Text> Withdraw consent at any time where we rely on consent to process your data</Text>
        </View>

        <Text style={styles.subSectionTitle}>10.2 EEA Residents (GDPR)</Text>
        <Text style={styles.paragraph}>
          If you are a resident of the European Economic Area, you have additional rights including the right to object to processing, the right to restrict processing, and the right to lodge a complaint with a supervisory authority. To exercise these rights, please contact us using the information below.
        </Text>

        <Text style={styles.subSectionTitle}>10.3 California Residents (CCPA)</Text>
        <Text style={styles.paragraph}>
          If you are a California resident, you have the right to request disclosure of the categories and specific pieces of personal information we have collected about you. You also have the right to request deletion and the right to opt-out of the sale of your personal information. We do not sell your personal information.
        </Text>

        <Text style={styles.subSectionTitle}>10.4 Canadian Residents (PIPEDA)</Text>
        <Text style={styles.paragraph}>
          If you are a Canadian resident, you have rights under the Personal Information Protection and Electronic Documents Act (PIPEDA), including the right to access your personal information and challenge its accuracy.
        </Text>

        <Text style={styles.sectionTitle}>11. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us. If we become aware that we have collected personal information from children without verification of parental consent, we take steps to remove that information from our servers.
        </Text>

        <Text style={styles.sectionTitle}>12. Do Not Track Signals</Text>
        <Text style={styles.paragraph}>
          Some browsers include a "Do Not Track" (DNT) feature that signals to websites that you do not want your online activity tracked. Because there is not yet a common understanding of how to interpret the DNT signal, our App does not currently respond to DNT browser signals.
        </Text>

        <Text style={styles.sectionTitle}>13. Push Notifications</Text>
        <Text style={styles.paragraph}>
          We may request to send you push notifications regarding your account or certain features of the App. If you wish to opt-out from receiving these types of communications, you may turn them off in your device's settings or within the App settings.
        </Text>

        <Text style={styles.sectionTitle}>14. Links to Other Websites</Text>
        <Text style={styles.paragraph}>
          The App may contain links to other websites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site. We strongly advise you to review the Privacy Policy of every site you visit. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
        </Text>

        <Text style={styles.sectionTitle}>15. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. For material changes, we will provide notice through the App or via email (if you have provided one). You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
        </Text>

        <Text style={styles.sectionTitle}>16. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about this Privacy Policy, wish to exercise your privacy rights, or have concerns about our data practices, please contact us:
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Email:</Text> calm.nest.cs@gmail.com
        </Text>
        <Text style={styles.paragraph}>
          For privacy-related inquiries, please include "Privacy Request" in the subject line of your email. We will respond to your request within 30 days.
        </Text>

        <Text style={styles.footer}>© 2026 Aiden Hyun. All rights reserved.</Text>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
