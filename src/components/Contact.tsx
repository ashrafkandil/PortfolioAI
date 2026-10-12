import { useState, type FormEvent } from 'react';
import type { Profile, SocialLink } from '../types';
import SocialLinks from './SocialLinks';

interface ContactProps {
  profile: Profile;
  social: SocialLink[];
  formEndpoint: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function Contact({ profile, social, formEndpoint }: ContactProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get('name') ?? '');
    const email = String(values.get('email') ?? '');
    const message = String(values.get('message') ?? '');

    if (formEndpoint) {
      setStatus({ kind: 'sending' });
      try {
        const response = await fetch(formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        form.reset();
        setStatus({
          kind: 'success',
          message: `Thank you, ${name}! Your message has been sent.`,
        });
      } catch {
        setStatus({
          kind: 'error',
          message: 'Something went wrong. Please try again or email me directly.',
        });
      }
    } else {
      const subject = encodeURIComponent(`Portfolio message from ${name}`);
      const body = encodeURIComponent(`${message}\n\nReply to: ${email}`);
      window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
      setStatus({
        kind: 'success',
        message: 'Your email client should open with the message pre-filled.',
      });
    }
  };

  return (
    <section id="contact" className="contact">
      <div className="container">
        <h2 className="section-title">Get In Touch</h2>
        <div className="contact-content">
          <div className="contact-info">
            <p className="contact-text">
              I'm always open to discussing new projects, creative ideas, or opportunities
              to be part of your vision.
            </p>
            <div className="contact-details">
              <div className="contact-item">
                <i className="fas fa-envelope" aria-hidden="true" />
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </div>
              <div className="contact-item">
                <i className="fas fa-phone" aria-hidden="true" />
                <a href={`tel:${profile.phone.replace(/[^+\d]/g, '')}`}>{profile.phone}</a>
              </div>
              <div className="contact-item">
                <i className="fas fa-map-marker-alt" aria-hidden="true" />
                <span>{profile.location}</span>
              </div>
            </div>
            <SocialLinks links={social} className="social-links contact-social" />
          </div>
          <form className="contact-form" onSubmit={handleSubmit} noValidate={false}>
            <div className="form-group">
              <label htmlFor="name" className="visually-hidden">
                Your Name
              </label>
              <input type="text" id="name" name="name" placeholder="Your Name" required />
            </div>
            <div className="form-group">
              <label htmlFor="email" className="visually-hidden">
                Your Email
              </label>
              <input type="email" id="email" name="email" placeholder="Your Email" required />
            </div>
            <div className="form-group">
              <label htmlFor="message" className="visually-hidden">
                Your Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Your Message"
                required
              />
            </div>
            <button type="submit" disabled={status.kind === 'sending'}>
              {status.kind === 'sending' ? 'Sending…' : 'Send Message'}
            </button>
            <p className="form-status" role="status" aria-live="polite">
              {status.kind === 'success' && <span className="form-status-success">{status.message}</span>}
              {status.kind === 'error' && <span className="form-status-error">{status.message}</span>}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
