import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { readEml, parseEml } from '../../src/index'
import { ReadedEmlJson, ParsedEmlJson } from '../../src/interface'

describe('Realistic Email Parsing - End-to-End Tests', () => {
  function readTestFixture(filename: string): string {
    return readFileSync(join(__dirname, '..', 'fixtures', filename), 'utf8')
  }

  describe('Corporate Email with PDF Attachment', () => {
    it('should parse corporate email with base64 PDF attachment correctly', () => {
      const eml = readTestFixture('corporate-pdf-attachment.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).toBe('Sarah Johnson')
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).toBe('sarah.johnson@corporatetech.com')
      expect(Array.isArray(parsed.to) ? parsed.to[0].name : parsed.to?.name).toBe('John Doe')
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).toBe('john.doe@company.com')
      expect(parsed.subject).toBe('Q4 Financial Report - Please Review')

      expect(parsed.date).toBeInstanceOf(Date)
      expect((parsed.date as Date).getFullYear()).toBe(2024)
      expect((parsed.date as Date).getMonth()).toBe(0)
      expect((parsed.date as Date).getDate()).toBe(15)

      expect(Array.isArray(parsed.cc) ? parsed.cc[0].name : parsed.cc?.name).toBe('Mary Smith')
      expect(Array.isArray(parsed.cc) ? parsed.cc[0].email : parsed.cc?.email).toBe('mary.smith@company.com')

      expect(parsed.text).toContain('Q4 financial report')
      expect(parsed.text).toContain('Revenue increased by 15%')
      expect(parsed.text).toContain('Sarah Johnson')
      expect(parsed.text).toContain('Senior Financial Analyst')

      expect(parsed.attachments).toHaveLength(1)
      const pdfAttachment = parsed.attachments![0]
      expect(pdfAttachment.name).toBe('Q4_Financial_Report.pdf')
      expect(pdfAttachment.contentType).toContain('application/pdf')
      expect(pdfAttachment.data).toBeInstanceOf(Uint8Array)
      expect((pdfAttachment.data as Uint8Array).length).toBeGreaterThan(0)

      expect(parsed.headers['Message-ID']).toContain('20240115093012.A1B2C3D4E5F6@corporatetech.com')
    })
  })

  describe('Multiple Attachments with Mixed Encoding', () => {
    it('should parse email with multiple attachments using different encodings', () => {
      const eml = readTestFixture('multiple-attachments-mixed-encoding.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).toBe('Alice Developer')
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).toBe('alice.developer@techstartup.io')
      expect(Array.isArray(parsed.to) ? parsed.to[0].name : parsed.to?.name).toBe('Team Lead')
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).toBe('team@techstartup.io')
      expect(parsed.subject).toBe('Project Documentation and Assets')

      expect(parsed.html).toContain('<h2>Project Assets Ready for Review</h2>')
      expect(parsed.html).toContain('README.md')
      expect(parsed.html).toContain('config.json')
      expect(parsed.html).toContain('logo.png')

      expect(parsed.attachments).toHaveLength(3)

      const readmeAttachment = parsed.attachments!.find(att => att.name === 'README.md')
      expect(readmeAttachment).toBeTruthy()
      expect(readmeAttachment!.contentType).toContain('text/markdown')

      const configAttachment = parsed.attachments!.find(att => att.name === 'config.json')
      expect(configAttachment).toBeTruthy()
      expect(configAttachment!.contentType).toContain('application/json')

      const logoAttachment = parsed.attachments!.find(att => att.name === 'logo.png')
      expect(logoAttachment).toBeTruthy()
      expect(logoAttachment!.contentType).toContain('image/png')
      expect(logoAttachment!.data).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Newsletter with Inline Images', () => {
    it('should parse newsletter with inline images and multipart/related structure', () => {
      const eml = readTestFixture('newsletter-with-inline-images.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).toBe('Tech Blog Newsletter')
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).toBe('newsletter@techblog.com')
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).toBe('subscriber@example.com')
      expect(parsed.subject).toContain('Weekly Tech Updates')
      expect(parsed.subject).toContain('🚀')

      expect(parsed.text).toContain('TECH BLOG WEEKLY NEWSLETTER')
      expect(parsed.text).toContain('AI Revolution')
      expect(parsed.text).toContain('Web Development')
      expect(parsed.text).toContain('Cloud Computing')

      expect(parsed.html).toContain('<h1>🚀 Tech Blog Weekly Newsletter</h1>')
      expect(parsed.html).toContain('cid:tech-icon')
      expect(parsed.html).toContain('cid:article-banner')

      expect(parsed.attachments).toHaveLength(2)

      const techIcon = parsed.attachments!.find(att => att.id && att.id.includes('tech-icon'))
      expect(techIcon).toBeTruthy()
      expect(techIcon!.inline).toBe(true)
      expect(techIcon!.contentType).toContain('image/png')

      const articleBanner = parsed.attachments!.find(att => att.id && att.id.includes('article-banner'))
      expect(articleBanner).toBeTruthy()
      expect(articleBanner!.inline).toBe(true)
      expect(articleBanner!.contentType).toContain('image/jpeg')
    })
  })

  describe('Email Reply Chain with Quoted Content', () => {
    it('should parse reply chain with quoted content and reply headers', () => {
      const eml = readTestFixture('reply-chain-quoted-content.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).toBe('Bob Manager')
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).toBe('bob.manager@company.com')
      expect(Array.isArray(parsed.to) ? parsed.to[0].name : parsed.to?.name).toBe('Alice Developer')
      expect(Array.isArray(parsed.to) ? parsed.to[0].email : parsed.to?.email).toBe('alice.developer@company.com')
      expect(parsed.subject).toBe('Re: Project Timeline Discussion')

      expect(Array.isArray(parsed.cc) ? parsed.cc[0].name : parsed.cc?.name).toBe('Project Team')
      expect(Array.isArray(parsed.cc) ? parsed.cc[0].email : parsed.cc?.email).toBe('team@company.com')

      expect(parsed.headers['In-Reply-To']).toContain('20240122143015.XYZ789@company.com')
      expect(parsed.headers['References']).toContain('20240122143015.XYZ789@company.com')

      expect(parsed.text).toContain('Thanks for the detailed breakdown')
      expect(parsed.text).toContain('weekly check-ins every Friday')
      expect(parsed.text).toContain('client presentation is confirmed')

      expect(parsed.text).toContain('Phase 1: Research and Planning')
      expect(parsed.text).toContain('Phase 2: Development')
      expect(parsed.text).toContain('Phase 3: Testing and Deployment')
      expect(parsed.text).toContain('Alice Developer <alice.developer@company.com>')

      expect(parsed.html).toContain('border-left: 2px solid #ccc')
      expect(parsed.html).toContain('<blockquote>')
    })
  })

  describe('International Email with Unicode Content', () => {
    it('should parse international email with Unicode characters and encoded headers', () => {
      const eml = readTestFixture('international-unicode-content.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).toBe('María García')
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).toBe('maria.garcia@internacional.es')

      expect(parsed.to).toBeInstanceOf(Array)
      const recipients = parsed.to as any[]
      expect(recipients).toHaveLength(2)

      const germanRecipient = recipients.find(r => r.email === 'jurgen.muller@deutschland.de')
      expect(germanRecipient?.name).toBe('Jürgen Müller')

      const japaneseRecipient = recipients.find(r => r.email === 'yamada.ichiro@nihon.jp')
      expect(japaneseRecipient?.name).toBe('山田一郎')

      expect(parsed.subject).toContain('🌏')
      expect(parsed.subject).toContain('Reunión ínternacional')
      expect(parsed.subject).toContain('国障大会')
      expect(parsed.subject).toContain('日本')

      expect(typeof parsed.text).toBe('string')
      expect(parsed.text!.length).toBeGreaterThan(100)

      expect(typeof parsed.html).toBe('string')
      expect(parsed.html!.length).toBeGreaterThan(100)
    })
  })

  describe('Calendar Invitation Email', () => {
    it('should parse calendar invitation with ICS attachment', () => {
      const eml = readTestFixture('calendar-invitation.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(Array.isArray(parsed.from) ? parsed.from[0].name : parsed.from?.name).toBe('Meeting Organizer')
      expect(Array.isArray(parsed.from) ? parsed.from[0].email : parsed.from?.email).toBe('meeting.organizer@company.com')
      expect(parsed.subject).toBe('Meeting Invitation: Sprint Planning - Feb 1, 2024')

      expect(parsed.to).toBeInstanceOf(Array)
      const recipients = parsed.to as any[]
      expect(recipients).toHaveLength(2)
      expect(recipients.map(r => r.email)).toContain('attendee1@company.com')
      expect(recipients.map(r => r.email)).toContain('attendee2@company.com')

      expect(parsed.text).toContain('You have been invited to attend a meeting')
      expect(parsed.text).toContain('Event: Sprint Planning')
      expect(parsed.text).toContain('Date: Thursday, February 1, 2024')
      expect(parsed.text).toContain('Time: 10:00 AM - 11:30 AM')
      expect(parsed.text).toContain('Conference Room A / Microsoft Teams')

      expect(parsed.attachments).toHaveLength(1)
      const calendarAttachment = parsed.attachments![0]
      expect(calendarAttachment.name).toBe('meeting.ics')
      expect(calendarAttachment.contentType).toContain('text/calendar')

      const attachmentData = calendarAttachment.data
      const calendarData = typeof attachmentData === 'string'
        ? attachmentData
        : new TextDecoder().decode(attachmentData as Uint8Array)
      expect(calendarData).toContain('BEGIN:VCALENDAR')
      expect(calendarData).toContain('SUMMARY:Sprint Planning')
      expect(calendarData).toContain('DTSTART:20240201T100000Z')
      expect(calendarData).toContain('ORGANIZER;CN=Meeting Organizer')
      expect(calendarData).toContain('ATTENDEE;ROLE=REQ-PARTICIPANT')
      expect(calendarData).toContain('END:VCALENDAR')
    })
  })

  describe('Cross-validation with parseEml function', () => {
    it('should produce consistent results between readEml and parseEml', () => {
      const fixturesList = [
        'corporate-pdf-attachment.eml',
        'multiple-attachments-mixed-encoding.eml',
        'newsletter-with-inline-images.eml',
        'reply-chain-quoted-content.eml',
        'international-unicode-content.eml',
        'calendar-invitation.eml',
      ]

      fixturesList.forEach(fixture => {
        const eml = readTestFixture(fixture)
        const readResult = readEml(eml) as ReadedEmlJson
        const parseResult = parseEml(eml) as ParsedEmlJson

        expect(readResult).toBeTypeOf('object')
        expect(parseResult).toBeTypeOf('object')

        expect(readResult.headers['Subject']).toBe(parseResult.headers['Subject'])
        expect(readResult.headers['From']).toBe(parseResult.headers['From'])
        expect(readResult.headers['To']).toBe(parseResult.headers['To'])
        expect(readResult.headers['Date']).toBe(parseResult.headers['Date'])
        expect(readResult.headers['Message-ID']).toBe(parseResult.headers['Message-ID'])
      })
    })
  })

  describe('Attachment Content Verification', () => {
    it('should correctly decode attachment contents across different encodings', () => {
      const eml = readTestFixture('multiple-attachments-mixed-encoding.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(parsed.attachments).toHaveLength(3)

      const configAttachment = parsed.attachments!.find(att => att.name === 'config.json')
      expect(configAttachment).toBeTruthy()

      const configAttachmentData = configAttachment!.data
      const configContent = typeof configAttachmentData === 'string'
        ? configAttachmentData
        : new TextDecoder().decode(configAttachmentData as Uint8Array)

      let configJsonText = configContent
      try {
        JSON.parse(configJsonText)
      } catch {
        configJsonText = atob(configContent)
      }

      const configJson = JSON.parse(configJsonText)
      expect(configJson.appName).toBe('Project Alpha')
      expect(configJson.port).toBe(3000)
      expect(configJson.database.host).toBe('localhost')

      const readmeAttachment = parsed.attachments!.find(att => att.name === 'README.md')
      expect(readmeAttachment).toBeTruthy()

      const readmeAttachmentData = readmeAttachment!.data
      const readmeContent = typeof readmeAttachmentData === 'string'
        ? readmeAttachmentData
        : new TextDecoder().decode(readmeAttachmentData as Uint8Array)
      expect(readmeContent).toContain('# Project Alpha')
      expect(readmeContent).toContain('## Features')
      expect(readmeContent).toContain('npm install')
      expect(readmeContent).toContain('MIT License')
    })
  })

  describe('Email Structure and Multipart Handling', () => {
    it('should correctly handle complex multipart structures', () => {
      const eml = readTestFixture('newsletter-with-inline-images.eml')
      const parsed = readEml(eml) as ReadedEmlJson

      expect(parsed.multipartAlternative).toBeTruthy()

      expect(typeof parsed.text).toBe('string')
      expect(typeof parsed.html).toBe('string')
      expect(parsed.text!.length).toBeGreaterThan(0)
      expect(parsed.html!.length).toBeGreaterThan(0)

      expect(parsed.html!.length).toBeGreaterThan(parsed.text!.length)

      expect(parsed.text).toContain('Tech Blog')
      expect(parsed.html).toContain('Tech Blog')
    })
  })
})
