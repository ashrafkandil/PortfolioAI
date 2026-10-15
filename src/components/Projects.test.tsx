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

  it('shows a hover balloon listing the experiences of the project', () => {
    render(<Projects projects={[linkedProject]} loading={false} error={null} />);

    const balloon = screen.getByRole('tooltip');
    expect(balloon.textContent).toContain('Part of this experience');
    expect(balloon.textContent).toContain('Senior Software Developer');
    expect(balloon.textContent).toContain('RBC Life Insurance');
    expect(balloon.textContent).toContain('2021 - Present');
  });

  it('lists every linked experience, one entry each', () => {
    const project = makeProject({
      experiences: [
        { id: 'rbc-life-insurance', title: 'Senior Software Developer', company: 'RBC Life Insurance', period: '2021 - Present' },
        { id: 'questrade', title: 'Senior Developer', company: 'Questrade', period: '2018 - 2021' },
      ],
    });
    render(<Projects projects={[project]} loading={false} error={null} />);

    const balloon = screen.getByRole('tooltip');
    expect(balloon.textContent).toContain('Part of these experiences');
    expect(balloon.querySelectorAll('li')).toHaveLength(2);
  });

  it('links the card to its balloon for assistive tech', () => {
    const { container } = render(<Projects projects={[linkedProject]} loading={false} error={null} />);

    const card = container.querySelector('.project-card');
    expect(card?.getAttribute('aria-describedby')).toBe('project-chatbot-platform-experiences');
  });

  it('renders no balloon when a project has no linked experience', () => {
    const { container } = render(<Projects projects={[makeProject()]} loading={false} error={null} />);

    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(container.querySelector('.project-experience-balloon')).toBeNull();
    expect(container.querySelector('.project-card')?.hasAttribute('aria-describedby')).toBe(false);
  });
});