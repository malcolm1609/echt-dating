import { fireEvent, render, screen } from '@testing-library/react-native';
import { dragDecision, LikeKnob } from './LikeKnob';

describe('LikeKnob', () => {
  it('counts a drag past half the way to the left as Weiter', () => {
    expect(dragDecision(-120, 200)).toBe('pass');
    expect(dragDecision(-80, 200)).toBe('back');
    expect(dragDecision(60, 200)).toBe('back');
    expect(dragDecision(-50, 0)).toBe('back');
  });

  it('likes on tap and offers Weiter as an action for screen readers', () => {
    const onLike = jest.fn();
    const onPass = jest.fn();
    render(<LikeKnob onLike={onLike} onPass={onPass} />);
    const knob = screen.getByRole('button', { name: 'Gefällt mir' });
    fireEvent.press(knob);
    expect(onLike).toHaveBeenCalledTimes(1);
    fireEvent(knob, 'accessibilityAction', { nativeEvent: { actionName: 'pass' } });
    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it('does nothing while a decision is being saved', () => {
    const onPass = jest.fn();
    render(<LikeKnob disabled onLike={jest.fn()} onPass={onPass} />);
    fireEvent(screen.getByRole('button', { name: 'Gefällt mir' }), 'accessibilityAction', { nativeEvent: { actionName: 'pass' } });
    expect(onPass).not.toHaveBeenCalled();
  });
});
