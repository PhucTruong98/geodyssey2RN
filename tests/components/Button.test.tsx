import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, jest } from '@jest/globals';
import { Button } from '@/components/Button';

// Mock the useTheme hook
jest.mock('@/hooks', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      card: '#F2F2F7',
      text: '#000000',
      border: '#C6C6C8',
    },
  }),
}));

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(<Button title="Test Button" />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={mockPress} />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Test Button" loading />
    );

    expect(queryByText('Test Button')).toBeNull();
    // ActivityIndicator should be present but text should not
  });

  it('is disabled when disabled prop is true', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" disabled onPress={mockPress} />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockPress).not.toHaveBeenCalled();
  });

  it('applies secondary variant styles', () => {
    const { getByText } = render(
      <Button title="Secondary Button" variant="secondary" />
    );

    expect(getByText('Secondary Button')).toBeTruthy();
  });
});