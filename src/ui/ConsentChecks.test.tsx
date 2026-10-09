import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';
import { CONSENTS, ConsentKind } from '../domain/privacy';
import { allConsented, ConsentChecks } from './ConsentChecks';

function Harness({ onOpenPolicy = jest.fn() }) {
  const [checked, setChecked] = useState<ConsentKind[]>([]);
  return (
    <>
      <ConsentChecks checked={checked} onChange={setChecked} onOpenPolicy={onOpenPolicy} />
      {allConsented(checked) && <Text>alles bestätigt</Text>}
    </>
  );
}

describe('ConsentChecks', () => {
  it('starts unchecked and needs both boxes', () => {
    render(<Harness />);
    const [privacy, sensitive] = CONSENTS.map((c) => screen.getByLabelText(c.text));
    expect(privacy.props.accessibilityState.checked).toBe(false);
    fireEvent.press(privacy);
    expect(screen.queryByText('alles bestätigt')).toBeNull();
    fireEvent.press(sensitive);
    expect(screen.getByText('alles bestätigt')).toBeTruthy();
    fireEvent.press(privacy);
    expect(screen.queryByText('alles bestätigt')).toBeNull();
  });

  it('opens the privacy policy', () => {
    const onOpenPolicy = jest.fn();
    render(<Harness onOpenPolicy={onOpenPolicy} />);
    fireEvent.press(screen.getByText('Datenschutzerklärung lesen'));
    expect(onOpenPolicy).toHaveBeenCalled();
  });
});
