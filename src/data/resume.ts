/**
 * ============================================================================
 * BILINGUAL RESUME & PORTFOLIO CONFIGURATION (EN / DE)
 * ============================================================================
 * All localized resume content lives in `/src/data/resume.json`.
 * Edit `src/data/resume.json` to update personal info, portrait path,
 * experience, research articles, CV files, and contact relay settings.
 * ============================================================================
 */

import resumeJson from './resume.json';

export type LocaleCode = 'en' | 'de';

export interface ResumeCapability {
  code: string;
  label: string;
  value: string;
}

export interface ResumeExperience {
  period: string;
  role: string;
  company: string;
  detail: string;
  stack: string;
}

export interface ResumeArticleSection {
  heading: string;
  body: string;
  isPlaceholder?: boolean;
}

export interface ResumeResearchArticle {
  id: string;
  stateNumber: '01' | '02';
  status: 'submitted' | 'under_review';
  statusLabel: string;
  title: string;
  venue: string;
  year: string;
  readingTime: string;
  tags: string[];
  summary: string;
  abstract: string;
  sections: ResumeArticleSection[];
  keywords: string;
  url: string;
}

export interface ResumeTelemetryRow {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ResumeKeySkill {
  name: string;
  color: string; // Hex accent color for the orbiting planet & helical ribbon trail
}

export interface ResumeStageFigureInfo {
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  preview?: string;
}

export interface ResumeChamberLabel {
  id: 'summit' | 'drift' | 'iris' | 'research' | 'pedestal';
  hudTitle: string;
  sectionTag: string;
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  institutionUrl: string;
  period: string;
  location: string;
  equivalency: string;
}

export interface ResumeCertificate {
  title: string;
  issuer: string;
  date: string;
  credentialId: string;
}

export interface ResumeLanguageProficiency {
  name: string;
  level: string;
}

export interface ResumeUiStrings {
  resetView: string;
  scrollToExplore: string;
  audioOn: string;
  audioOff: string;
  downloadCv: string;
  downloadCvBadge: string;
  cvModalTag: string;
  cvModalTitle: string;
  cvModalSubtitle: string;
  cvEnTitle: string;
  cvEnDesc: string;
  cvDeTitle: string;
  cvDeDesc: string;
  downloadEnCv: string;
  downloadDeCv: string;
  closeModal: string;
  educationLabel: string;
  certificateLabel: string;
  languagesLabel: string;
  experienceHeading: string;
  experienceHeaderTag: string;
  researchHeading: string;
  researchHeaderTag: string;
  researchSummaryBadge: string;
  selectAState: string;
  stateLabel: string;
  activeLabel: string;
  readArticle: string;
  backToKnowledge: string;
  placeholderNotice: string;
  externalManuscript: string;
  readPaper: string;
  sendEmail: string;
  copy: string;
  copyAddressSuffix: string;
  copyNumberSuffix: string;
  copied: string;
  callNumber: string;
  openSourceTag: string;
  openGithubProfile: string;
  connectOnLinkedin: string;
  yourEmailLabel: string;
  emailPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  sendMessage: string;
  sendingMessage: string;
  invalidEmailError: string;
  emptyMessageError: string;
  messagePreparedFor: string;
  draftOpenedNotice: string;
  sendErrorFallback: string;
  openInEmailApp: string;
  sendAnotherMessage: string;
}

export interface ResumeData {
  cvDownloads: {
    enUrl: string;
    deUrl: string;
  };
  contactForm: {
    endpoint: string;
    web3formsAccessKey: string;
  };
  identity: {
    name: string;
    role: string;
    manifesto: string;
    location: string;
    availability: string;
    avatarUrl: string;
    avatarCaption: string;
    email: string;
    phone: string;
    githubHandle: string;
    githubUrl: string;
    linkedinHandle: string;
    linkedinUrl: string;
  };
  about: {
    headline: string;
    summary: string;
    education: ResumeEducation;
    certificate: ResumeCertificate;
    languages: ResumeLanguageProficiency[];
    telemetry: ResumeTelemetryRow[];
    capabilities: ResumeCapability[];
  };
  /** Dynamic key skills rendered as orbiting planets in CH.03 */
  keySkills: ResumeKeySkill[];
  /** Localized HUD chapter headers & subtitles (01..05) */
  chambers: ResumeChamberLabel[];
  /** Descriptive captions for the 5 contact-linked 3D figures on the CH.05 Pedestal */
  stageFigures: {
    email: ResumeStageFigureInfo;
    phone: ResumeStageFigureInfo;
    github: ResumeStageFigureInfo;
    linkedin: ResumeStageFigureInfo;
    form: ResumeStageFigureInfo;
  };
  experience: ResumeExperience[];
  research: ResumeResearchArticle[];
  ui: ResumeUiStrings;
}

interface RawResumeFile {
  defaultLocale: LocaleCode;
  cvDownloads: {
    enUrl: string;
    deUrl: string;
  };
  contactForm: {
    endpoint: string;
    web3formsAccessKey: string;
  };
  keySkills: ResumeKeySkill[];
  locales: Record<LocaleCode, Omit<ResumeData, 'keySkills' | 'cvDownloads' | 'contactForm'>>;
}

const typedResumeJson = resumeJson as RawResumeFile;

export function getLocalizedResume(locale: LocaleCode): ResumeData {
  const safeLocale: LocaleCode = locale === 'de' ? 'de' : 'en';
  return {
    cvDownloads: typedResumeJson.cvDownloads,
    contactForm: typedResumeJson.contactForm,
    keySkills: typedResumeJson.keySkills,
    ...typedResumeJson.locales[safeLocale],
  };
}

export const RESUME_JSON = typedResumeJson;
export const RESUME_DATA: ResumeData = getLocalizedResume(typedResumeJson.defaultLocale);
