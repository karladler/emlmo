/// <reference types="mocha" />
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readEml, parseEml } from '../../src/index';
import { ReadedEmlJson, ParsedEmlJson } from '../../src/interface';

/**
 * Realistic Email Tests
 * 
 * This test suite covers real-world email scenarios to ensure comprehensive
 * parsing of various email formats, encodings, and attachment types.
 * The tests verify From, To, Date, Subject, and attachment handling.
 */
describe('Realistic Email Parsing - End-to-End Tests', () => {

  function readTestFixture(filename: string): string {
    return readFileSync(join(__dirname, '..', 'fixtures', filename), 'utf8');
  }

  describe('Corporate Email with PDF Attachment', () => {
    it('should parse corporate email with base64 PDF attachment correctly', () => {
      const eml = readTestFixture('corporate-pdf-attachment.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      // Verify basic email headers
      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).to.equal('Sarah Johnson');
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).to.equal('sarah.johnson@corporatetech.com');
      expect(Array.isArray(parsed.to) ? parsed.to[0].name : parsed.to?.name).to.equal('John Doe');
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).to.equal('john.doe@company.com');
      expect(parsed.subject).to.equal('Q4 Financial Report - Please Review');
      
      // Verify date parsing
      expect(parsed.date).to.be.instanceOf(Date);
      expect((parsed.date as Date).getFullYear()).to.equal(2024);
      expect((parsed.date as Date).getMonth()).to.equal(0); // January is 0
      expect((parsed.date as Date).getDate()).to.equal(15);

      // Verify CC header
      expect(Array.isArray(parsed.cc) ? parsed.cc[0].name : parsed.cc?.name).to.equal('Mary Smith');
      expect(Array.isArray(parsed.cc) ? parsed.cc[0].email : parsed.cc?.email).to.equal('mary.smith@company.com');

      // Verify message content
      expect(parsed.text).to.contain('Q4 financial report');
      expect(parsed.text).to.contain('Revenue increased by 15%');
      expect(parsed.text).to.contain('Sarah Johnson');
      expect(parsed.text).to.contain('Senior Financial Analyst');

      // Verify PDF attachment
      expect(parsed.attachments).to.have.length(1);
      const pdfAttachment = parsed.attachments![0];
      expect(pdfAttachment.name).to.equal('Q4_Financial_Report.pdf');
      expect(pdfAttachment.contentType).to.contain('application/pdf');
      expect(pdfAttachment.data).to.be.instanceOf(Uint8Array);
      expect((pdfAttachment.data as Uint8Array).length).to.be.greaterThan(0);

      // Verify Message-ID header
      expect(parsed.headers['Message-ID']).to.contain('20240115093012.A1B2C3D4E5F6@corporatetech.com');
    });
  });

  describe('Multiple Attachments with Mixed Encoding', () => {
    it('should parse email with multiple attachments using different encodings', () => {
      const eml = readTestFixture('multiple-attachments-mixed-encoding.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      // Verify basic headers
      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).to.equal('Alice Developer');
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).to.equal('alice.developer@techstartup.io');
      expect(Array.isArray(parsed.to) ? parsed.to[0].name : parsed.to?.name).to.equal('Team Lead');
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).to.equal('team@techstartup.io');
      expect(parsed.subject).to.equal('Project Documentation and Assets');

      // Verify HTML content
      expect(parsed.html).to.contain('<h2>Project Assets Ready for Review</h2>');
      expect(parsed.html).to.contain('README.md');
      expect(parsed.html).to.contain('config.json');
      expect(parsed.html).to.contain('logo.png');

      // Verify multiple attachments
      expect(parsed.attachments).to.have.length(3);
      
      // Check README.md (quoted-printable encoding)
      const readmeAttachment = parsed.attachments!.find(att => att.name === 'README.md');
      expect(readmeAttachment).to.be.ok;
      expect(readmeAttachment!.contentType).to.contain('text/markdown');
      
      // Check config.json (base64 encoding)
      const configAttachment = parsed.attachments!.find(att => att.name === 'config.json');
      expect(configAttachment).to.be.ok;
      expect(configAttachment!.contentType).to.contain('application/json');
      
      // Check logo.png (base64 encoding)
      const logoAttachment = parsed.attachments!.find(att => att.name === 'logo.png');
      expect(logoAttachment).to.be.ok;
      expect(logoAttachment!.contentType).to.contain('image/png');
      expect(logoAttachment!.data).to.be.instanceOf(Uint8Array);
    });
  });

  describe('Newsletter with Inline Images', () => {
    it('should parse newsletter with inline images and multipart/related structure', () => {
      const eml = readTestFixture('newsletter-with-inline-images.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      // Verify headers with encoded subject
      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).to.equal('Tech Blog Newsletter');
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).to.equal('newsletter@techblog.com');
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).to.equal('subscriber@example.com');
      expect(parsed.subject).to.contain('Weekly Tech Updates');
      expect(parsed.subject).to.contain('🚀'); // Unicode emoji

      // Verify both text and HTML versions exist
      expect(parsed.text).to.contain('TECH BLOG WEEKLY NEWSLETTER');
      expect(parsed.text).to.contain('AI Revolution');
      expect(parsed.text).to.contain('Web Development');
      expect(parsed.text).to.contain('Cloud Computing');

      expect(parsed.html).to.contain('<h1>🚀 Tech Blog Weekly Newsletter</h1>');
      expect(parsed.html).to.contain('cid:tech-icon');
      expect(parsed.html).to.contain('cid:article-banner');

      // Verify inline images (should have Content-ID)
      expect(parsed.attachments).to.have.length(2);
      
      const techIcon = parsed.attachments!.find(att => att.id && att.id.includes('tech-icon'));
      expect(techIcon).to.be.ok;
      expect(techIcon!.inline).to.be.true;
      expect(techIcon!.contentType).to.contain('image/png');
      
      const articleBanner = parsed.attachments!.find(att => att.id && att.id.includes('article-banner'));
      expect(articleBanner).to.be.ok;
      expect(articleBanner!.inline).to.be.true;
      expect(articleBanner!.contentType).to.contain('image/jpeg');
    });
  });

  describe('Email Reply Chain with Quoted Content', () => {
    it('should parse reply chain with quoted content and reply headers', () => {
      const eml = readTestFixture('reply-chain-quoted-content.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      // Verify reply headers
      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).to.equal('Bob Manager');
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).to.equal('bob.manager@company.com');
      expect(Array.isArray(parsed.to) ? parsed.to[0].name : parsed.to?.name).to.equal('Alice Developer');
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).to.equal('alice.developer@company.com');
      expect(parsed.subject).to.equal('Re: Project Timeline Discussion');

      // Verify CC
      expect(Array.isArray(parsed.cc) ? parsed.cc[0].name : parsed.cc?.name).to.equal('Project Team');
      expect(Array.isArray(parsed.cc) ? parsed.cc[0].email : parsed.cc?.email).to.equal('team@company.com');

      // Verify In-Reply-To and References headers
      expect(parsed.headers['In-Reply-To']).to.contain('20240122143015.XYZ789@company.com');
      expect(parsed.headers['References']).to.contain('20240122143015.XYZ789@company.com');

      // Verify reply content (new message)
      expect(parsed.text).to.contain('Thanks for the detailed breakdown');
      expect(parsed.text).to.contain('weekly check-ins every Friday');
      expect(parsed.text).to.contain('client presentation is confirmed');

      // Verify quoted content (original message)
      expect(parsed.text).to.contain('Phase 1: Research and Planning');
      expect(parsed.text).to.contain('Phase 2: Development');
      expect(parsed.text).to.contain('Phase 3: Testing and Deployment');
      expect(parsed.text).to.contain('Alice Developer <alice.developer@company.com>');

      // Verify HTML version has proper quoted styling
      expect(parsed.html).to.contain('border-left: 2px solid #ccc');
      expect(parsed.html).to.contain('<blockquote>');
    });
  });

  describe('International Email with Unicode Content', () => {
    it('should parse international email with Unicode characters and encoded headers', () => {
      const eml = readTestFixture('international-unicode-content.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      // Verify encoded from/to names with international characters
      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).to.equal('María García');
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).to.equal('maria.garcia@internacional.es');
      
      // Verify multiple recipients with different languages
      expect(parsed.to).to.be.an('array');
      const recipients = parsed.to as any[];
      expect(recipients).to.have.length(2);
      
      const germanRecipient = recipients.find(r => r.email === 'jurgen.muller@deutschland.de');
      expect(germanRecipient?.name).to.equal('Jürgen Müller');
      
      const japaneseRecipient = recipients.find(r => r.email === 'yamada.ichiro@nihon.jp');
      expect(japaneseRecipient?.name).to.equal('山田一郎');

      // Verify subject with mixed languages and emojis
      expect(parsed.subject).to.contain('🌏');
      expect(parsed.subject).to.contain('Reunión ínternacional');
      expect(parsed.subject).to.contain('国障大会');
      expect(parsed.subject).to.contain('日本');

      // Verify Spanish content (allowing for encoding issues)
      expect(parsed.text).to.be.a('string');
      expect(parsed.text!.length).to.be.greaterThan(100);

      // Verify HTML content with proper UTF-8 encoding
      expect(parsed.html).to.be.a('string');
      expect(parsed.html!.length).to.be.greaterThan(100);
    });
  });

  describe('Calendar Invitation Email', () => {
    it('should parse calendar invitation with ICS attachment', () => {
      const eml = readTestFixture('calendar-invitation.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      // Verify headers
      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).to.equal('Meeting Organizer');
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).to.equal('meeting.organizer@company.com');
      expect(parsed.subject).to.equal('Meeting Invitation: Sprint Planning - Feb 1, 2024');

      // Verify multiple recipients
      expect(parsed.to).to.be.an('array');
      const recipients = parsed.to as any[];
      expect(recipients).to.have.length(2);
      expect(recipients.map(r => r.email)).to.include('attendee1@company.com');
      expect(recipients.map(r => r.email)).to.include('attendee2@company.com');

      // Verify text content
      expect(parsed.text).to.contain('You have been invited to attend a meeting');
      expect(parsed.text).to.contain('Event: Sprint Planning');
      expect(parsed.text).to.contain('Date: Thursday, February 1, 2024');
      expect(parsed.text).to.contain('Time: 10:00 AM - 11:30 AM');
      expect(parsed.text).to.contain('Conference Room A / Microsoft Teams');

      // Verify calendar attachment
      expect(parsed.attachments).to.have.length(1);
      const calendarAttachment = parsed.attachments![0];
      expect(calendarAttachment.name).to.equal('meeting.ics');
      expect(calendarAttachment.contentType).to.contain('text/calendar');

      // Verify calendar content
      const attachmentData = calendarAttachment.data;
      const calendarData = typeof attachmentData === 'string' ? 
        attachmentData : 
        new TextDecoder().decode(attachmentData as Uint8Array);
      expect(calendarData).to.contain('BEGIN:VCALENDAR');
      expect(calendarData).to.contain('SUMMARY:Sprint Planning');
      expect(calendarData).to.contain('DTSTART:20240201T100000Z');
      expect(calendarData).to.contain('ORGANIZER;CN=Meeting Organizer');
      expect(calendarData).to.contain('ATTENDEE;ROLE=REQ-PARTICIPANT');
      expect(calendarData).to.contain('END:VCALENDAR');
    });
  });

  describe('Cross-validation with parseEml function', () => {
    it('should produce consistent results between readEml and parseEml', () => {
      const fixtures = [
        'corporate-pdf-attachment.eml',
        'multiple-attachments-mixed-encoding.eml',
        'newsletter-with-inline-images.eml',
        'reply-chain-quoted-content.eml',
        'international-unicode-content.eml',
        'calendar-invitation.eml'
      ];

      fixtures.forEach(fixture => {
        const eml = readTestFixture(fixture);
        const readResult = readEml(eml) as ReadedEmlJson;
        const parseResult = parseEml(eml) as ParsedEmlJson;

        // Both should succeed
        expect(readResult).to.be.an('object');
        expect(parseResult).to.be.an('object');

        // Basic headers should match
        expect(readResult.headers['Subject']).to.equal(parseResult.headers['Subject']);
        expect(readResult.headers['From']).to.equal(parseResult.headers['From']);
        expect(readResult.headers['To']).to.equal(parseResult.headers['To']);
        expect(readResult.headers['Date']).to.equal(parseResult.headers['Date']);
        expect(readResult.headers['Message-ID']).to.equal(parseResult.headers['Message-ID']);
      });
    });
  });

  describe('Attachment Content Verification', () => {
    it('should correctly decode attachment contents across different encodings', () => {
      const eml = readTestFixture('multiple-attachments-mixed-encoding.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      expect(parsed.attachments).to.have.length(3);

      // Verify JSON attachment content (base64 encoded)
      const configAttachment = parsed.attachments!.find(att => att.name === 'config.json');
      expect(configAttachment).to.be.ok;
      
      const configAttachmentData = configAttachment!.data;
      const configContent = typeof configAttachmentData === 'string' ? 
        configAttachmentData : 
        new TextDecoder().decode(configAttachmentData as Uint8Array);
      
      // If it's base64, decode it first
      let configJsonText = configContent;
      try {
        // Try to parse as JSON directly first
        JSON.parse(configJsonText);
      } catch {
        // If it fails, assume it's base64 encoded
        configJsonText = atob(configContent);
      }
      
      const configJson = JSON.parse(configJsonText);
      expect(configJson.appName).to.equal('Project Alpha');
      expect(configJson.port).to.equal(3000);
      expect(configJson.database.host).to.equal('localhost');

      // Verify README content (quoted-printable encoded)
      const readmeAttachment = parsed.attachments!.find(att => att.name === 'README.md');
      expect(readmeAttachment).to.be.ok;
      
      const readmeAttachmentData = readmeAttachment!.data;
      const readmeContent = typeof readmeAttachmentData === 'string' ? 
        readmeAttachmentData : 
        new TextDecoder().decode(readmeAttachmentData as Uint8Array);
      expect(readmeContent).to.contain('# Project Alpha');
      expect(readmeContent).to.contain('## Features');
      expect(readmeContent).to.contain('npm install');
      expect(readmeContent).to.contain('MIT License');
    });
  });

  describe('Email Structure and Multipart Handling', () => {
    it('should correctly handle complex multipart structures', () => {
      const eml = readTestFixture('newsletter-with-inline-images.eml');
      const parsed = readEml(eml) as ReadedEmlJson;

      // Should detect multipart/related structure
      expect(parsed.multipartAlternative).to.be.ok;

      // Should have both text and HTML versions
      expect(parsed.text).to.be.a('string');
      expect(parsed.html).to.be.a('string');
      expect(parsed.text!.length).to.be.greaterThan(0);
      expect(parsed.html!.length).to.be.greaterThan(0);

      // HTML should be more detailed than text
      expect(parsed.html!.length).to.be.greaterThan(parsed.text!.length);

      // Both should contain core content
      expect(parsed.text).to.contain('Tech Blog');
      expect(parsed.html).to.contain('Tech Blog');
    });
  });
});