import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';

export default function TermsScreen() {
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
    allCaps: {
      textTransform: 'uppercase',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: January 9, 2026</Text>

        <Text style={styles.paragraph}>
          Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Calmdemy mobile application (the "Service") operated by Aiden Hyun ("us", "we", or "our").
        </Text>

        <Text style={styles.paragraph}>
          Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users and others who access or use the Service. By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
        </Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By downloading, installing, accessing, or using Calmdemy ("the App"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you must immediately cease all use of the App and delete it from your device.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        <Text style={styles.paragraph}>
          You must be at least 13 years of age to use this Service. By using the Service, you represent and warrant that you are at least 13 years old and have the legal capacity to enter into these Terms. If you are under 18, you represent that you have your parent or guardian's permission to use the Service and that they have read and agree to these Terms on your behalf.
        </Text>

        <Text style={styles.sectionTitle}>3. Description of Service</Text>
        <Text style={styles.paragraph}>
          Calmdemy is a meditation and mindfulness application that provides guided meditations, sleep stories, breathing exercises, ambient sounds, and relaxation content. The App is designed for personal, non-commercial use only. We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without notice.
        </Text>

        <Text style={styles.sectionTitle}>4. User Accounts</Text>
        <Text style={styles.paragraph}>
          When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
        </Text>
        <Text style={styles.paragraph}>
          You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
        </Text>

        <Text style={styles.sectionTitle}>5. Acceptable Use Policy</Text>
        <Text style={styles.paragraph}>You agree not to:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Use the Service for any unlawful purpose or in violation of any applicable laws or regulations</Text>
          <Text style={styles.bulletItem}>• Attempt to gain unauthorized access to the Service, other accounts, computer systems, or networks connected to the Service</Text>
          <Text style={styles.bulletItem}>• Reproduce, duplicate, copy, sell, resell, redistribute, or exploit any portion of the Service without express written permission</Text>
          <Text style={styles.bulletItem}>• Interfere with or disrupt the Service or servers or networks connected to the Service</Text>
          <Text style={styles.bulletItem}>• Use any robot, spider, scraper, or other automated means to access the Service</Text>
          <Text style={styles.bulletItem}>• Transmit any viruses, worms, defects, Trojan horses, or any items of a destructive nature</Text>
          <Text style={styles.bulletItem}>• Impersonate any person or entity or falsely state or misrepresent your affiliation with a person or entity</Text>
          <Text style={styles.bulletItem}>• Collect or store personal data about other users without their consent</Text>
        </View>

        <Text style={styles.sectionTitle}>6. Health and Medical Disclaimer</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>THE SERVICE IS NOT A MEDICAL DEVICE AND IS NOT INTENDED TO DIAGNOSE, TREAT, CURE, OR PREVENT ANY DISEASE OR HEALTH CONDITION.</Text>
        </Text>
        <Text style={styles.paragraph}>
          The content provided through Calmdemy is for general informational and wellness purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician, mental health professional, or other qualified health provider with any questions you may have regarding a medical or mental health condition.
        </Text>
        <Text style={styles.paragraph}>
          Never disregard professional medical advice or delay in seeking it because of something you have read or heard in the App. If you think you may have a medical emergency, call your doctor, go to the emergency department, or call emergency services immediately.
        </Text>
        <Text style={styles.paragraph}>
          We do not recommend or endorse any specific tests, physicians, products, procedures, opinions, or other information that may be mentioned in the App. Reliance on any information provided by Calmdemy is solely at your own risk.
        </Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property Rights</Text>
        <Text style={styles.paragraph}>
          The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Aiden Hyun and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
        </Text>
        <Text style={styles.paragraph}>
          All audio recordings, text, graphics, logos, images, software, and other materials available through the Service are owned by us or our licensors and are protected by intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Service or included content, nor may you reverse engineer or attempt to extract the source code of that software.
        </Text>

        <Text style={styles.sectionTitle}>8. User Content</Text>
        <Text style={styles.paragraph}>
          If you submit, post, or display any content on or through the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display such content in connection with the Service. You represent and warrant that you own or have the necessary rights to submit such content and that it does not violate any third party's rights.
        </Text>

        <Text style={styles.sectionTitle}>9. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
        </Text>
        <Text style={styles.paragraph}>
          You may terminate your account at any time by deleting the App and requesting account deletion by contacting us. All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
        </Text>

        <Text style={styles.sectionTitle}>10. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
        </Text>
        <Text style={styles.paragraph}>
          We do not warrant that (a) the Service will function uninterrupted, secure, or available at any particular time or location; (b) any errors or defects will be corrected; (c) the Service is free of viruses or other harmful components; or (d) the results of using the Service will meet your requirements.
        </Text>

        <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AIDEN HYUN, ITS AFFILIATES, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Your access to or use of or inability to access or use the Service</Text>
          <Text style={styles.bulletItem}>• Any conduct or content of any third party on the Service</Text>
          <Text style={styles.bulletItem}>• Any content obtained from the Service</Text>
          <Text style={styles.bulletItem}>• Unauthorized access, use, or alteration of your transmissions or content</Text>
        </View>
        <Text style={styles.paragraph}>
          IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU PAID US, IF ANY, FOR USING THE SERVICE DURING THE TWELVE (12) MONTHS PRIOR TO THE CLAIM.
        </Text>

        <Text style={styles.sectionTitle}>12. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to defend, indemnify, and hold harmless Aiden Hyun and its licensors, employees, contractors, agents, officers, and directors from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from: (a) your use of and access to the Service; (b) your violation of any term of these Terms; (c) your violation of any third party right, including without limitation any copyright, property, or privacy right; or (d) any claim that your content caused damage to a third party.
        </Text>

        <Text style={styles.sectionTitle}>13. Governing Law and Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed and construed in accordance with the laws of Canada, without regard to its conflict of law provisions. Any dispute arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the Canadian Arbitration Association, except that either party may seek injunctive or other equitable relief in any court of competent jurisdiction.
        </Text>
        <Text style={styles.paragraph}>
          You agree that any arbitration shall be limited to the dispute between us and you individually. To the full extent permitted by law, (a) no arbitration shall be joined with any other proceeding; (b) there is no right or authority for any dispute to be arbitrated on a class-action basis; and (c) there is no right or authority for any dispute to be brought in a purported representative capacity on behalf of the general public or any other persons.
        </Text>

        <Text style={styles.sectionTitle}>14. Severability</Text>
        <Text style={styles.paragraph}>
          If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
        </Text>

        <Text style={styles.sectionTitle}>15. Waiver</Text>
        <Text style={styles.paragraph}>
          Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. The waiver of any such right or provision will be effective only if in writing and signed by a duly authorized representative of Aiden Hyun.
        </Text>

        <Text style={styles.sectionTitle}>16. Entire Agreement</Text>
        <Text style={styles.paragraph}>
          These Terms constitute the entire agreement between you and Aiden Hyun regarding our Service, and supersede and replace any prior agreements we might have between us regarding the Service.
        </Text>

        <Text style={styles.sectionTitle}>17. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
        </Text>

        <Text style={styles.sectionTitle}>18. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms of Service, please contact us:
        </Text>
        <Text style={styles.paragraph}>
          Email: calm.nest.cs@gmail.com
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
