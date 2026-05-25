'use client';

import { useState } from 'react';
import {
  Mail,
  Clock,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { pageEase, pageFadeUp } from '../components/layout/PageHero';
import {sumbitContactUsForm} from '../lib/api';


type FormState = {
  company: string;
  query: string;
};

const initialForm: FormState = { company: '', query: '' };

const fieldClass =
  'w-full rounded-md border border-line-soft bg-ivory-light px-3.5 py-2.5 text-[14px] text-charcoal placeholder:text-charcoal-xlt transition-[border-color,background,box-shadow] hover:border-line focus:border-copper focus:bg-white focus:outline-none focus:ring-3 focus:ring-[rgba(200,90,23,0.12)]';
const labelClass = 'text-[12.5px] font-semibold tracking-[0.1px] text-charcoal-md';

const ContactClient = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!form.query.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const isEnterprise =
        new URLSearchParams(window.location.search).get('from') === 'upgradePlan';
      await sumbitContactUsForm(
        { company_name: form.company, query: form.query },
        isEnterprise,
      );
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="h-screen relative mx-auto flex w-full max-w-300 flex-1 flex-col justify-center overflow-hidden px-6 py-16">
      {/* Subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(200,180,160,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(200,180,160,0.18) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 60% 75% at 30% 45%, black 10%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 60% 75% at 30% 45%, black 10%, transparent 75%)',
        }}
      />

      <div className="relative z-1 grid items-center gap-10 md:grid-cols-[0.95fr_1.05fr]">
        {/* Header column (left) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: pageEase }}
          className="text-left"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-copper/40 bg-copper px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.6px] text-white shadow-soft">
            <Mail size={13} strokeWidth={2.5} />
            <span>Contact us</span>
          </div>
          <h1 className="my-4 text-[clamp(30px,4.2vw,46px)] font-extrabold leading-[1.12] tracking-[-1.5px] text-charcoal">
            Let&apos;s talk about{' '}
            <span className="relative inline-block text-copper">
              hiring better.
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-1 -z-1 h-2 rounded-sm bg-copper/15"
              />
            </span>
          </h1>
          <p className="max-w-155 text-base leading-[1.65] text-charcoal-lt">
            Whether you have a question about pricing, need help with onboarding, or want to
            explore a custom workflow for your team &mdash; we&apos;re here. A real human reads
            every message.
          </p>

          {/* Inline meta */}
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px]">
            <a
              href="mailto:support@hiresort.ai"
              className="group inline-flex items-center gap-2 text-charcoal transition-colors hover:text-copper"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-copper/10 text-copper transition-colors group-hover:bg-copper group-hover:text-white">
                <Mail size={14} strokeWidth={2.3} />
              </span>
              <span className="font-semibold">support@hiresort.ai</span>
            </a>
            <div className="inline-flex items-center gap-2 text-charcoal-lt">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-copper/10 text-copper">
                <Clock size={14} strokeWidth={2.3} />
              </span>
              <span>Replies within 24h, Mon&ndash;Sun</span>
            </div>
          </div>
        </motion.div>

        {/* Form column (right) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: pageEase, delay: 0.1 }}
          className="relative rounded-2xl border border-line-soft bg-white p-8 shadow-card sm:p-9"
        >
          {/* Accent bar */}
          <div
            aria-hidden
            className="absolute inset-x-8 top-0 h-0.75 rounded-b-sm bg-linear-to-r from-copper via-copper-light to-copper/40"
          />

          {submitted ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
                <CheckCircle2 size={36} strokeWidth={2.2} />
              </div>
              <h3 className="mb-2 text-[22px] font-bold tracking-[-0.5px] text-charcoal">
                Message received
              </h3>
              <p className="mx-auto mb-5 max-w-100 text-[14.5px] leading-[1.6] text-charcoal-lt">
                Thanks for reaching out. We&apos;ll get back to you at the email on your account within one business day.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setSubmitted(false);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-5 py-2.5 text-[14px] font-semibold text-charcoal transition-colors hover:border-charcoal-xlt hover:bg-ivory-light"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4.5">
              <motion.div variants={pageFadeUp} className="mb-1.5">
                <h2 className="mb-1.5 text-[22px] font-bold tracking-[-0.5px] text-charcoal">
                  Send us a message
                </h2>
                <p className="text-[13.5px] text-charcoal-lt">
                  We&apos;ll reply to the email on your account.
                </p>
              </motion.div>

              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-company" className={labelClass}>
                  Company name
                </label>
                <input
                  id="cf-company"
                  type="text"
                  autoComplete="organization"
                  placeholder="Your company"
                  value={form.company}
                  onChange={handleChange('company')}
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cf-query" className={labelClass}>
                  How can we help?
                </label>
                <textarea
                  id="cf-query"
                  rows={6}
                  placeholder="Tell us a bit about your team, your hiring volume, and what you'd like to know."
                  required
                  value={form.query}
                  onChange={handleChange('query')}
                  className={`${fieldClass} min-h-30 resize-y leading-[1.55]`}
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-copper bg-copper px-6 py-3 text-[14.5px] font-semibold leading-none text-white transition-colors hover:bg-copper-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Sending…' : 'Send message'}
                  {loading ? (
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    />
                  ) : (
                    <Send size={15} strokeWidth={2.5} />
                  )}
                </button>
                <span className="min-w-50 flex-1 text-[11.5px] leading-normal text-charcoal-xlt">
                  By submitting, you agree to our privacy policy. We never share your details.
                </span>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default ContactClient;
