// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Projects from './Projects';
import type { Project } from '../types';

// FadeIn uses IntersectionObserver, which jsdom does not implement.
class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'chatbot-platform',
    icon: 'fas fa-robot',
    title: 'AI-Powered Chatbot Platform',
    description: 'A conversational assistant.',
    features: ['Natural language understanding'],
    tech: ['Python'],
    links: [],
    experiences: [],
    narration: 'AI-Powered Chatbot Platform: a conversational assistant.',
    ...overrides,
  };
}

const linkedProject = makeProject({
  experiences: [
    {
      id: 'rbc-life-insurance',
      title: 'Senior Software Developer',
      company: 'RBC Life Insurance',
      period: '2021 - Present',
    },
  ],
});

describe('Projects', () => {
  it('renders one card per project', () => {
    render(<Projects projects={[linkedProject, makeProject({ id: 'bedrock', title: 'Bedrock' })]} loading={false} error={null} />);

    expect(screen.getByRole('heading', { name: 'Featured Projects' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'AI-Powered Chatbot Platform' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Bedrock' })).toBeTruthy();
  });

  it('shows experiences as a moving ticker above the project name', () => {
    const { container } = render(<Projects projects={[linkedProject]} loading={false} error={null} />);

    const ticker = container.querySelector('.project-experience-ticker');
    const header = container.querySelector('.project-header');
    const card = container.querySelector('.project-card');

    expect(ticker).toBeTruthy();
    expect(ticker!.textContent).toContain('Senior Software Developer');
    expect(ticker!.textContent).toContain('RBC Life Insurance');
    expect(ticker!.textContent).toContain('2021 - Present');
    // The ticker sits at the top of the card, above the project title.
    expect(Array.from(card!.children).indexOf(ticker!)).toBeLessThan(
      Array.from(card!.children).indexOf(header!),
    );
  });

  it('lists every linked experience in the ticker', () => {
    const project = makeProject({
      experiences: [
        { id: 'rbc-life-insurance', title: 'Senior Software Developer', company: 'RBC Life Insurance', period: '2021 - Present' },
        { id: 'questrade', title: 'Senior Developer', company: 'Questrade', period: '2018 - 2021' },
      ],
    });
    const { container } = render(<Projects projects={[project]} loading={false} error={null} />);

    const tickerText = container.querySelector('.project-experience-ticker-text')!.textContent!;
    expect(tickerText).toContain('Senior Software Developer @ RBC Life Insurance (2021 - Present)');
    expect(tickerText).toContain('Senior Developer @ Questrade (2018 - 2021)');
  });

  it('duplicates the ticker text for a seamless loop and hides the copy from assistive tech', () => {
    const { container } = render(<Projects projects={[linkedProject]} loading={false} error={null} />);

    const copies = container.querySelectorAll('.project-experience-ticker-text');
    expect(copies).toHaveLength(2);
    expect(copies[0].hasAttribute('aria-hidden')).toBe(false);
    expect(copies[1].getAttribute('aria-hidden')).toBe('true');
  });

  it('renders no ticker when a project has no linked experience', () => {
    const { container } = render(<Projects projects={[makeProject()]} loading={false} error={null} />);

    expect(container.querySelector('.project-experience-ticker')).toBeNull();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});