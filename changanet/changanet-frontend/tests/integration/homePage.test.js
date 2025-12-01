// tests/integration/homePage.test.js
import { render, screen } from '@testing-library/react';
import App from '../../src/App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Changánet/i);
  expect(linkElement).toBeInTheDocument();
});
