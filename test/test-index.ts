
import { render, screen } from '@testing-library/react';
import Home from '../src/pages/index.tsx';

describe('Home', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByRole('banner')).toBeInTheDocument(); // assuming Header has a role of 'banner'
  });

  it('renders the Hero section', () => {
    render(<Home />);
    expect(screen.getByTestId('hero')).toBeInTheDocument(); // assuming Hero has a data-testid of 'hero'
  });

  it('renders the About section', () => {
    render(<Home />);
    expect(screen.getByTestId('about')).toBeInTheDocument(); // assuming About has a data-testid of 'about'
  });

  it('renders the Footer', () => {
    render(<Home />);
    expect(screen.getByTestId('footer')).toBeInTheDocument(); // assuming Footer has a data-testid of 'footer'
  });
});