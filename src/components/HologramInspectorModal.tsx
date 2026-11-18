import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Github,
  Linkedin,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import { ResumeData } from '../data/resume';
import { PedestalMode } from '../three/detailedChambers';
import { QuantumKnowledgeHud } from './QuantumKnowledgeHud';

export type ScrollCardKind = 'about' | 'experience' | 'research' | 'contact';

interface HologramInspectorModalProps {
  resume: ResumeData;
  activeCard: ScrollCardKind | null;
  revealAmount: number;
  enterT: number;
  exitT: number;
  pedestalMode: PedestalMode;
  onSelectPedestalMode: (mode: PedestalMode) => void;
  activeArticleIdx: 0 | 1;
  onSelectArticle: (idx: 0 | 1) => void;
  onReadArticle: (idx: 0 | 1) => void;
}

/**
 * Compact Cybernetic Wireframe Face SVG displayed inside the top-left portrait badge
 * if no `avatarUrl` image loads.
 */
const HoloGridBackdrop: React.FC = () => (
  <svg
    viewBox="0 0 100 100"
    className="pointer-events-none absolute inset-0 w-full h-full"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="50" cy="46" r="38" stroke="#00FFFF" strokeOpacity="0.28" strokeDasharray="2 3" />
    <circle cx="50" cy="46" r="24" stroke="#00FFFF" strokeOpacity="0.16" />
    <line x1="6" y1="46" x2="94" y2="46" stroke="#00FFFF" strokeOpacity="0.22" />
    <line x1="50" y1="6" x2="50" y2="94" stroke="#00FFFF" strokeOpacity="0.22" />
    <line x1="0" y1="22" x2="100" y2="22" stroke="#00FFFF" strokeOpacity="0.1" />
    <line x1="0" y1="70" x2="100" y2="70" stroke="#00FFFF" strokeOpacity="0.1" />
    <line x1="25" y1="0" x2="25" y2="100" stroke="#00FFFF" strokeOpacity="0.1" />
    <line x1="75" y1="0" x2="75" y2="100" stroke="#00FFFF" strokeOpacity="0.1" />
  </svg>
);

const HoloFaceBadge: React.FC = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-full h-full"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="50" cy="44" r="34" stroke="#00FFFF" strokeOpacity="0.22" strokeDasharray="2 3" />
    <line x1="8" y1="44" x2="92" y2="44" stroke="#00FFFF" strokeOpacity="0.18" />
    <line x1="50" y1="8" x2="50" y2="92" stroke="#00FFFF" strokeOpacity="0.18" />
    <path
      d="M50 18 L66 25 L72 42 L70 59 L62 72 L50 78 L38 72 L30 59 L28 42 L34 25 Z"
      stroke="#00FFFF"
      strokeWidth="1.3"
      strokeOpacity="0.9"
      fill="#00FFFF"
      fillOpacity="0.06"
    />
    <path
      d="M34 25 L50 34 L66 25 M28 42 L41 46 L50 34 L59 46 L72 42 M30 59 L42 57 L50 66 L58 57 L70 59 M50 34 L50 66"
      stroke="#00FFFF"
      strokeWidth="0.9"
      strokeOpacity="0.55"
    />
    <rect x="36" y="42" width="9" height="5" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.85" />
    <rect x="55" y="42" width="9" height="5" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.85" />
    <circle cx="40.5" cy="44.5" r="1.3" fill="#00FFFF" />
    <circle cx="59.5" cy="44.5" r="1.3" fill="#00FFFF" />
    <path
      d="M18 96 L28 82 L42 77 L50 82 L58 77 L72 82 L82 96"
      stroke="#FFFFFF"
      strokeWidth="1.1"
      strokeOpacity="0.55"
    />
  </svg>
);

export const HologramInspectorModal: React.FC<HologramInspectorModalProps> = ({
  resume,
  activeCard,
  revealAmount,
  enterT,
  exitT,
  pedestalMode,
  onSelectPedestalMode,
  activeArticleIdx,
  onSelectArticle,
  onReadArticle,
}) => {
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [messageText, setMessageText] = useState('');
  const [formError, setFormError] = useState('');
  const [formErrorWithMailto, setFormErrorWithMailto] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formSent, setFormSent] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [resume.identity.avatarUrl]);

  useEffect(() => {
    setFormError('');
    setFormErrorWithMailto(false);
  }, [resume]);

  if (!activeCard || revealAmount <= 0.01) return null;

  const hasPhoto = Boolean(resume.identity.avatarUrl.trim()) && !avatarFailed;
  const ui = resume.ui;

  const handleCopy = async (field: 'email' | 'phone', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setCopiedField(null);
    }
  };

  const buildMailtoHref = () => {
    const trimmedEmail = senderEmail.trim();
    const trimmedMsg = messageText.trim();
    const subject = encodeURIComponent(`Portfolio Inquiry from ${trimmedEmail || 'Visitor'}`);
    const body = encodeURIComponent(`From: ${trimmedEmail}\n\n${trimmedMsg}`);
    return `mailto:${resume.identity.email}?subject=${subject}&body=${body}`;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    const trimmedEmail = senderEmail.trim();
    const trimmedMsg = messageText.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setFormError(ui.invalidEmailError);
      setFormErrorWithMailto(false);
      return;
    }
    if (!trimmedMsg) {
      setFormError(ui.emptyMessageError);
      setFormErrorWithMailto(false);
      return;
    }

    setFormError('');
    setFormErrorWithMailto(false);
    setIsSending(true);

    try {
      const accessKey = resume.contactForm.web3formsAccessKey?.trim();
      if (accessKey) {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            access_key: accessKey,
            from_name: trimmedEmail,
            email: trimmedEmail,
            replyto: trimmedEmail,
            subject: `Portfolio Inquiry from ${trimmedEmail}`,
            message: trimmedMsg,
          }),
        });
        const data = (await res.json()) as { success?: boolean };
        if (!res.ok || !data.success) {
          throw new Error('Relay returned unsuccessful response');
        }
      } else {
        const endpoint =
          resume.contactForm.endpoint?.trim() ||
          `https://formsubmit.co/ajax/${resume.identity.email}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: trimmedEmail,
            _replyto: trimmedEmail,
            _subject: `New Portfolio Inquiry from ${trimmedEmail}`,
            message: trimmedMsg,
            _captcha: 'false',
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      }

      setFormSent(true);
    } catch {
      setFormError(ui.sendErrorFallback);
      setFormErrorWithMailto(true);
    } finally {
      setIsSending(false);
    }
  };

  if (activeCard === 'contact') {
    const activeFigure = resume.stageFigures[pedestalMode];
    const telHref = `tel:${resume.identity.phone.replace(/[^\d+]/g, '')}`;

    const pedestalModes: {
      id: PedestalMode;
      label: string;
      shortLabel: string;
      preview: string;
    }[] = [
      {
        id: 'email',
        label: resume.stageFigures.email.label,
        shortLabel: resume.stageFigures.email.shortLabel,
        preview: resume.identity.email,
      },
      {
        id: 'phone',
        label: resume.stageFigures.phone.label,
        shortLabel: resume.stageFigures.phone.shortLabel,
        preview: resume.identity.phone,
      },
      {
        id: 'github',
        label: resume.stageFigures.github.label,
        shortLabel: resume.stageFigures.github.shortLabel,
        preview: resume.identity.githubHandle,
      },
      {
        id: 'linkedin',
        label: resume.stageFigures.linkedin.label,
        shortLabel: resume.stageFigures.linkedin.shortLabel,
        preview: resume.identity.linkedinHandle,
      },
      {
        id: 'form',
        label: resume.stageFigures.form.label,
        shortLabel: resume.stageFigures.form.shortLabel,
        preview: resume.stageFigures.form.preview ?? resume.stageFigures.form.title,
      },
    ];

    return (
      <div
        aria-live="polite"
        style={{
          opacity: revealAmount,
          transform: `translate3d(0, ${((1 - enterT) * 14).toFixed(1)}px, 0)`,
          willChange: 'transform, opacity',
        }}
        className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between pl-3.5 pr-12 pt-11 pb-[72px] sm:pl-6 sm:pr-14 sm:pt-20 sm:pb-24 gap-1.5 sm:gap-2"
      >
        {/* Right-Half (desktop) / Lower-Half (mobile) Docked Contact Card */}
        <div className="flex-1 flex items-end md:items-center justify-center md:justify-end md:pr-6 lg:pr-10 min-h-0">
          <div className="pointer-events-auto relative w-full md:w-[46%] lg:w-[43%] max-w-[490px] border border-[#00FFFF]/45 bg-[#080C12]/86 backdrop-blur-md shadow-[0_14px_48px_rgba(0,0,0,0.78)]">
            <span aria-hidden="true" className="pointer-events-none absolute -top-[1px] -left-[1px] h-3.5 w-3.5 border-t-2 border-l-2 border-[#00FFFF]" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-[1px] -right-[1px] h-3.5 w-3.5 border-t-2 border-r-2 border-[#00FFFF]" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-3.5 w-3.5 border-b-2 border-l-2 border-[#00FFFF]" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-3.5 w-3.5 border-b-2 border-r-2 border-[#00FFFF]" />

            <div className="p-4 sm:p-6 overflow-x-hidden">
              {pedestalMode === 'email' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A929A]/25 pb-2.5 sm:pb-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-[#00FFFF]">
                      <Mail className="w-4 h-4" />
                      <span>{activeFigure.title}</span>
                    </div>
                    <span className="font-mono-hud text-[10px] sm:text-[11px] text-[#B8C4D0]">
                      {resume.identity.availability}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-display-hud text-base sm:text-2xl font-semibold tracking-tight text-[#FFFFFF] break-all">
                      {resume.identity.email}
                    </p>
                    <p className="text-[11px] sm:text-sm leading-snug sm:leading-relaxed text-[#CBD5E1]">
                      {activeFigure.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5 sm:pt-1">
                    <a
                      href={`mailto:${resume.identity.email}`}
                      className="inline-flex min-h-[40px] sm:min-h-[46px] items-center justify-center gap-1.5 sm:gap-2 bg-[#00FFFF] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#060A0F] hover:bg-[#D8FFFF] transition-colors focus-visible:outline-2 focus-visible:outline-[#FFFFFF]"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{ui.sendEmail}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy('email', resume.identity.email)}
                      className="inline-flex min-h-[40px] sm:min-h-[46px] items-center justify-center gap-1.5 sm:gap-2 border border-[#00FFFF]/65 bg-[#0A131C]/90 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#FFFFFF] hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors cursor-pointer"
                    >
                      {copiedField === 'email' ? (
                        <>
                          <Check className="w-4 h-4 text-[#00FFFF] shrink-0" />
                          <span className="whitespace-nowrap">{ui.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">
                            {ui.copy}
                            {ui.copyAddressSuffix && (
                              <span className="hidden sm:inline">{ui.copyAddressSuffix}</span>
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {pedestalMode === 'phone' && (
                <div className="space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A929A]/25 pb-2 sm:pb-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-[#00FFFF]">
                      <Phone className="w-4 h-4" />
                      <span>{activeFigure.title}</span>
                    </div>
                    <span className="font-mono-hud text-[10px] sm:text-[11px] text-[#B8C4D0]">
                      {resume.identity.location}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-mono-hud text-lg sm:text-3xl font-semibold tracking-tight text-[#FFFFFF]">
                      {resume.identity.phone}
                    </p>
                    <p className="text-[11px] sm:text-sm leading-snug sm:leading-relaxed text-[#CBD5E1]">
                      {activeFigure.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5 sm:pt-1">
                    <a
                      href={telHref}
                      className="inline-flex min-h-[40px] sm:min-h-[46px] items-center justify-center gap-1.5 sm:gap-2 bg-[#00FFFF] px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#060A0F] hover:bg-[#D8FFFF] transition-colors focus-visible:outline-2 focus-visible:outline-[#FFFFFF]"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{ui.callNumber}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy('phone', resume.identity.phone)}
                      className="inline-flex min-h-[40px] sm:min-h-[46px] items-center justify-center gap-1.5 sm:gap-2 border border-[#00FFFF]/65 bg-[#0A131C]/90 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#FFFFFF] hover:border-[#00FFFF] hover:text-[#00FFFF] transition-colors cursor-pointer"
                    >
                      {copiedField === 'phone' ? (
                        <>
                          <Check className="w-4 h-4 text-[#00FFFF] shrink-0" />
                          <span className="whitespace-nowrap">{ui.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">
                            {ui.copy}
                            {ui.copyNumberSuffix && (
                              <span className="hidden sm:inline">{ui.copyNumberSuffix}</span>
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {pedestalMode === 'github' && (
                <div className="space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A929A]/25 pb-2 sm:pb-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-[#00FFFF]">
                      <Github className="w-4 h-4" />
                      <span>{activeFigure.title}</span>
                    </div>
                    <span className="font-mono-hud text-[10px] sm:text-[11px] text-[#B8C4D0]">
                      {ui.openSourceTag}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-display-hud text-lg sm:text-3xl font-semibold tracking-tight text-[#FFFFFF]">
                      {resume.identity.githubHandle}
                    </p>
                    <p className="text-[11px] sm:text-sm leading-snug sm:leading-relaxed text-[#CBD5E1]">
                      {activeFigure.description}
                    </p>
                  </div>

                  <a
                    href={resume.identity.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] sm:min-h-[48px] w-full items-center justify-center gap-2 bg-[#00FFFF] px-4 py-2 text-xs sm:text-sm font-semibold text-[#060A0F] hover:bg-[#D8FFFF] transition-colors focus-visible:outline-2 focus-visible:outline-[#FFFFFF]"
                  >
                    <Github className="w-4 h-4" />
                    <span className="whitespace-nowrap">{ui.openGithubProfile}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              )}

              {pedestalMode === 'linkedin' && (
                <div className="space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A929A]/25 pb-2 sm:pb-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-[#00FFFF]">
                      <Linkedin className="w-4 h-4" />
                      <span>{activeFigure.title}</span>
                    </div>
                    <span className="font-mono-hud text-[10px] sm:text-[11px] text-[#B8C4D0]">
                      {resume.identity.linkedinHandle}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-display-hud text-lg sm:text-3xl font-semibold tracking-tight text-[#FFFFFF]">
                      {resume.identity.name}
                    </p>
                    <p className="text-[11px] sm:text-sm text-[#D8FFFF]">
                      {resume.identity.role} · {resume.identity.location}
                    </p>
                    <p className="text-[11px] sm:text-sm leading-snug sm:leading-relaxed text-[#CBD5E1]">
                      {activeFigure.description}
                    </p>
                  </div>

                  <a
                    href={resume.identity.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[40px] sm:min-h-[48px] w-full items-center justify-center gap-2 bg-[#00FFFF] px-4 py-2 text-xs sm:text-sm font-semibold text-[#060A0F] hover:bg-[#D8FFFF] transition-colors focus-visible:outline-2 focus-visible:outline-[#FFFFFF]"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span className="whitespace-nowrap">{ui.connectOnLinkedin}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              )}

              {pedestalMode === 'form' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-[#8A929A]/25 pb-2 sm:pb-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-[#00FFFF]">
                      <MessageSquare className="w-4 h-4" />
                      <span>{activeFigure.title}</span>
                    </div>
                    <span className="font-mono-hud text-[10px] sm:text-[11px] text-[#B8C4D0]">
                      {resume.identity.name}
                    </span>
                  </div>

                  {formSent ? (
                    <div className="border border-[#00FFFF]/50 bg-[#0A1922]/90 p-4 space-y-2.5 text-center">
                      <div className="mx-auto flex h-9 w-9 items-center justify-center border border-[#00FFFF]/60 bg-[#00FFFF]/15 text-[#00FFFF]">
                        <Check className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-[#FFFFFF]">
                        {ui.messagePreparedFor} {resume.identity.name}
                      </p>
                      <p className="text-xs text-[#CBD5E1]">
                        {ui.draftOpenedNotice}{' '}
                        <span className="text-[#00FFFF] break-all">{resume.identity.email}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormSent(false);
                          setMessageText('');
                        }}
                        className="inline-flex min-h-[40px] items-center justify-center border border-[#00FFFF]/60 px-4 py-2 text-xs font-medium text-[#00FFFF] hover:bg-[#00FFFF]/15 transition-colors cursor-pointer"
                      >
                        {ui.sendAnotherMessage}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-2.5 sm:space-y-3" noValidate>
                      <p className="text-xs text-[#CBD5E1] leading-snug">{activeFigure.description}</p>
                      <div>
                        <label htmlFor="contact-email" className="block text-[11px] sm:text-xs font-medium text-[#B8C4D0] mb-1">
                          {ui.yourEmailLabel}
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          value={senderEmail}
                          disabled={isSending}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          placeholder={ui.emailPlaceholder}
                          className="w-full h-[40px] sm:h-[44px] border border-[#8A929A]/45 bg-[#090F17]/95 px-3 py-2 text-sm text-[#FFFFFF] placeholder:text-[#8A929A] focus:border-[#00FFFF] focus:outline-none disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-message" className="block text-[11px] sm:text-xs font-medium text-[#B8C4D0] mb-1">
                          {ui.messageLabel}
                        </label>
                        <textarea
                          id="contact-message"
                          rows={3}
                          value={messageText}
                          disabled={isSending}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder={ui.messagePlaceholder}
                          className="w-full border border-[#8A929A]/45 bg-[#090F17]/95 px-3 py-2 text-sm text-[#FFFFFF] placeholder:text-[#8A929A] focus:border-[#00FFFF] focus:outline-none resize-none disabled:opacity-60"
                        />
                      </div>
                      {formError && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-[#00FFFF]" role="alert">
                            {formError}
                          </p>
                          {formErrorWithMailto && (
                            <a
                              href={buildMailtoHref()}
                              className="inline-flex items-center gap-1.5 border border-[#00FFFF]/60 px-3 py-1.5 text-xs font-medium text-[#00FFFF] hover:bg-[#00FFFF]/15 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>{ui.openInEmailApp}</span>
                            </a>
                          )}
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={isSending}
                        className="inline-flex min-h-[42px] sm:min-h-[48px] w-full items-center justify-center gap-2 bg-[#00FFFF] px-4 py-2 text-sm font-semibold text-[#060A0F] hover:bg-[#D8FFFF] transition-colors cursor-pointer disabled:opacity-70"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>{isSending ? ui.sendingMessage : ui.sendMessage}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Big, Noticeable 5-Button Bottom Contact & Figure Switcher Dock */}
        <div className="pointer-events-auto mx-auto w-full max-w-[980px] pt-1">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
            {pedestalModes.map((m) => {
              const isActive = pedestalMode === m.id;
              const Icon =
                m.id === 'email'
                  ? Mail
                  : m.id === 'phone'
                    ? Phone
                    : m.id === 'github'
                      ? Github
                      : m.id === 'linkedin'
                        ? Linkedin
                        : MessageSquare;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectPedestalMode(m.id)}
                  aria-pressed={isActive}
                  className={`flex flex-col sm:flex-row min-h-[50px] sm:min-h-[56px] items-center justify-center sm:justify-start gap-1 sm:gap-2.5 px-1 py-1.5 sm:px-3.5 sm:py-2.5 text-center sm:text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00FFFF] ${
                    isActive
                      ? 'border-2 border-[#00FFFF] bg-[#0B1E28]/92 text-[#FFFFFF] shadow-[0_0_24px_rgba(0,255,255,0.28)]'
                      : 'border border-[#8A929A]/45 bg-[#080C12]/88 text-[#D6E0E8] hover:border-[#00FFFF]/80 hover:bg-[#0B141D]/92 hover:text-[#FFFFFF]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#00FFFF]' : 'text-[#8A929A]'
                    }`}
                  />
                  <div className="min-w-0 sm:flex-1">
                    <p className="text-[11px] sm:text-sm font-semibold tracking-wide whitespace-nowrap truncate">
                      <span className="sm:hidden">{m.shortLabel}</span>
                      <span className="hidden sm:inline">{m.label}</span>
                    </p>
                    <p
                      className={`hidden sm:block font-mono-hud text-[10px] truncate ${
                        isActive ? 'text-[#D8FFFF]' : 'text-[#8A929A]'
                      }`}
                    >
                      {m.preview}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (activeCard === 'research') {
    return (
      <QuantumKnowledgeHud
        resume={resume}
        revealAmount={revealAmount}
        enterT={enterT}
        activeArticleIdx={activeArticleIdx}
        onSelectArticle={onSelectArticle}
        onReadArticle={onReadArticle}
      />
    );
  }

  const cardWidthClass =
    activeCard === 'experience'
      ? 'w-full md:w-[46%] lg:w-[43%] max-w-[530px]'
      : 'w-full md:w-[45%] lg:w-[42%] max-w-[490px]';

  // CH.02 About Me -> RIGHT desktop; CH.03 Experience -> LEFT desktop; CH.04 Research -> RIGHT desktop
  const isLeftAlignedDesktop = activeCard === 'experience';

  const wrapperAlignClass = isLeftAlignedDesktop
    ? 'justify-center md:justify-start md:pl-8 lg:pl-12'
    : 'justify-center md:justify-end md:pr-8 lg:pr-12';

  const animStyle: React.CSSProperties = {
    opacity: revealAmount,
    transform: isLeftAlignedDesktop
      ? `translate3d(${(-(1 - enterT) * 22 - exitT * 18).toFixed(1)}px, 0, 0) scale(${(
          0.96 +
          0.04 * enterT +
          0.015 * exitT
        ).toFixed(4)})`
      : `translate3d(${((1 - enterT) * 22 - exitT * 18).toFixed(1)}px, 0, 0) scale(${(
          0.96 +
          0.04 * enterT +
          0.015 * exitT
        ).toFixed(4)})`,
    willChange: 'transform, opacity',
  };

  const isScrollableInteractive = activeCard === 'experience';

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-0 z-30 flex items-end md:items-center ${wrapperAlignClass} pl-3.5 pr-12 pt-14 pb-[72px] sm:pl-6 sm:pr-14 sm:pb-24`}
    >
      <div
        style={animStyle}
        className={`relative ${cardWidthClass} border border-[#00FFFF]/45 bg-[#080C12]/90 backdrop-blur-md ${
          isScrollableInteractive ? 'pointer-events-auto md:pointer-events-auto' : 'pointer-events-none'
        } shadow-[0_14px_48px_rgba(0,0,0,0.78)]`}
      >
        {/* Crisp Pure Cyan Corner Reticles */}
        <span aria-hidden="true" className="pointer-events-none absolute -top-[1px] -left-[1px] h-3.5 w-3.5 border-t-2 border-l-2 border-[#00FFFF]" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-[1px] -right-[1px] h-3.5 w-3.5 border-t-2 border-r-2 border-[#00FFFF]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-3.5 w-3.5 border-b-2 border-l-2 border-[#00FFFF]" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-3.5 w-3.5 border-b-2 border-r-2 border-[#00FFFF]" />

        {/* ================================================================= */}
        {/* CH.02 // ABOUT ME                                                  */}
        {/* ================================================================= */}
        {activeCard === 'about' && (
          <div className="p-4 sm:p-5 md:p-6 min-h-[55vh] md:min-h-0 flex flex-col justify-between gap-3 sm:gap-4 overflow-x-hidden">
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 border-b border-[#8A929A]/25 pb-3.5 sm:pb-4">
              <div className="relative h-[72px] w-[72px] sm:h-[86px] sm:w-[86px] shrink-0 overflow-hidden border border-[#00FFFF]/55 bg-[#06090D]">
                {hasPhoto ? (
                  <>
                    <HoloGridBackdrop />
                    <img
                      src={resume.identity.avatarUrl}
                      alt={resume.identity.name}
                      onError={() => setAvatarFailed(true)}
                      className="relative z-10 h-full w-full object-cover object-top grayscale contrast-125 brightness-95"
                    />
                  </>
                ) : (
                  <HoloFaceBadge />
                )}

                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-[#00FFFF]/22 mix-blend-color" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-[#00FFFF]/14 mix-blend-screen" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 holo-scanlines opacity-85" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 h-5 bg-gradient-to-b from-transparent via-[#00FFFF]/40 to-transparent holo-scan-sweep"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0.5 right-1 z-20 bg-[#06090D]/75 px-1 font-mono-hud text-[8px] tracking-wider text-[#00FFFF] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                >
                  {resume.identity.avatarCaption}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display-hud text-xl sm:text-2xl font-medium tracking-tight text-[#FFFFFF]">
                    {resume.identity.name}
                  </h2>
                  <span className="font-mono-hud text-[10px] tracking-widest text-[#00FFFF] border border-[#00FFFF]/50 bg-[#00FFFF]/12 px-2 py-0.5 shrink-0">
                    {resume.identity.availability}
                  </span>
                </div>
                <p className="font-mono-hud text-xs text-[#D8FFFF]/95 leading-snug">
                  {resume.identity.role}
                </p>
                <p className="font-mono-hud text-[11px] tracking-wider text-[#9CA6B0]">
                  {resume.identity.location}
                </p>
              </div>
            </div>

            <p className="text-[13.5px] sm:text-[15px] leading-relaxed text-[#E8F0F4] my-auto">
              {resume.about.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-[#8A929A]/25 pt-3">
              <div className="min-w-0 space-y-0.5">
                <p className="font-mono-hud text-[9.5px] tracking-widest text-[#00FFFF]">
                  {ui.educationLabel}
                </p>
                <p className="text-xs font-medium text-[#FFFFFF] truncate">
                  {resume.about.education.degree}
                </p>
                <p className="font-mono-hud text-[10px] text-[#9CA6B0] truncate">
                  {resume.about.education.institution} · {resume.about.education.period}
                </p>
                <p className="font-mono-hud text-[9.5px] text-[#D8FFFF]/85">
                  {resume.about.education.equivalency}
                </p>
              </div>

              <div className="min-w-0 space-y-1">
                <div>
                  <p className="font-mono-hud text-[9.5px] tracking-widest text-[#00FFFF]">
                    {ui.certificateLabel}
                  </p>
                  <p className="text-xs font-medium text-[#FFFFFF] truncate">
                    {resume.about.certificate.title} — {resume.about.certificate.issuer}
                  </p>
                </div>
                <div>
                  <p className="font-mono-hud text-[9.5px] tracking-widest text-[#00FFFF]">
                    {ui.languagesLabel}
                  </p>
                  <p className="font-mono-hud text-[10px] text-[#CBD5E1] leading-snug">
                    {resume.about.languages.map((lang) => `${lang.name} (${lang.level})`).join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CH.03 // EXPERIENCE ONLY (nothing else)                            */}
        {/* ================================================================= */}
        {activeCard === 'experience' && (
          <div className="max-h-[62vh] sm:max-h-[64vh] md:max-h-none overflow-y-auto overflow-x-hidden md:overflow-visible touch-pan-y p-4 md:p-5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#8A929A]/25 pb-1.5">
              <p className="font-mono-hud text-[10px] tracking-widest text-[#00FFFF]">
                {ui.experienceHeading}
              </p>
              <span className="font-mono-hud text-[9px] tracking-wider text-[#8A929A]">
                {ui.experienceHeaderTag}
              </span>
            </div>

            <div className="space-y-2.5">
              {resume.experience.map((exp) => (
                <div
                  key={exp.company}
                  className="min-w-0 border border-[#8A929A]/25 bg-[#090D12]/80 px-3.5 py-2.5 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono-hud text-[10px]">
                    <span className="text-[#00FFFF] shrink-0">{exp.period}</span>
                    <span className="text-[#9CA6B0] truncate">{exp.company}</span>
                  </div>
                  <p className="font-display-hud text-sm font-medium text-[#FFFFFF]">
                    {exp.role}
                  </p>
                  <p className="text-[12px] leading-snug text-[#CBD5E1] break-words">
                    {exp.detail}
                  </p>
                  <p className="font-mono-hud text-[9.5px] text-[#8A929A] pt-0.5 break-words">
                    {exp.stack}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
