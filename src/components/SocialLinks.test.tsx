// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import SocialLinks from './SocialLinks';
import type { SocialLink } from '../types';

const links: SocialLink[] = [
  { platform: 'GitHub', icon: 'fab fa-github', url: 'https://github.com/example' },
  { platform: 'LinkedIn', icon: 'fab fa-linkedin', url: 'https://www.linkedin.com/in/example' },
];

afterEach(() => {
  cleanup();
});

describe('SocialLinks', () => {
  it('renders one labelled link per social entry', () => {
    render(<SocialLinks links={links} className="social-links" />);

    const github = screen.getByRole('link', { name: 'GitHub' });
    expect(github.getAttribute('href')).toBe('https://github.com/example');
    expect(github.getAttribute('target')).toBe('_blank');
    expect(github.getAttribute('rel')).toBe('noopener noreferrer');
    expect(github.querySelector('i')?.className).toBe('fab fa-github');

    expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('applies the wrapper class it is given', () => {
    const { container } = render(<SocialLinks links={links} className="footer-links" />);

    expect(container.firstElementChild?.className).toBe('footer-links');
  });

  it('renders nothing when there are no active links', () => {
    const { container } = render(<SocialLinks links={[]} className="social-links" />);

    expect(container.innerHTML).toBe('');
  });
});
