import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Stats from '../src/routes/Stats';

describe('Stats empty', () => {
  beforeEach(() => localStorage.clear());
  it('shows empty state', () => {
    render(<MemoryRouter><Stats /></MemoryRouter>);
    expect(screen.getByText(/아직 비행 기록이 없습니다/)).toBeInTheDocument();
  });
});
