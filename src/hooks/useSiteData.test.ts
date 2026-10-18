// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteData } from '../types';
import { useSiteData } from './useSiteData';

const REFRESH_INTERVAL_MS = 5_000;

function makeSiteData(name: string): SiteData {
  return {
    profile: {
      siteName: 'Portfolio',
      name,
      role: '',
      tagline: '',
      shortBio: '',
      image: '',
      email: '',
      phone: '',
      location: '',
      contactTitle: 'Get In Touch',
      contactIntro: "I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision.",
      contactFormTitle: 'Send Me a Message',
      contactFormNamePlaceholder: 'Your Name',
      contactFormEmailPlaceholder: 'Your Email',
      contactFormMessagePlaceholder: 'Your Message',
      contactFormSubmitText: 'Send Message',
      contactFormSendingText: 'Sending...',
      contactFormSuccessText: 'Thank you, {name}! Your message has been sent.',
      contactFormErrorText: 'Something went wrong. Please try again or email me directly.',
      contactFormMailtoSuccess: 'Your email client should open with the message pre-filled.',
    },
    social: [],
    about: { bio: [], skills: [] },
    experience: [],
    projects: [],
    personalProjects: [],
    formEndpoint: '',
  };
}

function response(data: SiteData) {
  return { ok: true, json: async () => data };
}

describe('useSiteData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('refreshes committed site data and keeps the last good data on errors', async () => {
    const fetchMock = vi.fn();
    const initialData = makeSiteData('Initial');
    const updatedData = makeSiteData('Updated');
    fetchMock.mockResolvedValueOnce(response(initialData));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSiteData());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.data).toEqual(initialData);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/site-data',
      expect.objectContaining({ cache: 'no-store' })
    );

    fetchMock.mockResolvedValueOnce(response(updatedData));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    });
    expect(result.current.data).toEqual(updatedData);

    fetchMock.mockRejectedValueOnce(new Error('database unavailable'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    });
    expect(result.current.data).toEqual(updatedData);
    expect(result.current.error).toBe('database unavailable');
  });
});
