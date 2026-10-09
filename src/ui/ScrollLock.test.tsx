import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { RangeSlider } from './RangeSlider';
import { LockableScrollView } from './ScrollLock';

const touch = (x: number) => ({ touchHistory: { touchBank: [{ touchActive: true, startPageX: x, startPageY: 0, currentPageX: x, currentPageY: 0, previousPageX: x, previousPageY: 0, startTimeStamp: 0, currentTimeStamp: 0, previousTimeStamp: 0 }], numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: 0 },
  nativeEvent: { pageX: x, pageY: 0, locationX: x, locationY: 0, touches: [], changedTouches: [], identifier: 0, timestamp: 0 } });

describe('LockableScrollView', () => {
  it('stops scrolling while a slider is held', () => {
    render(
      <LockableScrollView>
        <RangeSlider min={5} max={100} values={[50]} onChange={() => {}} labels={(v) => `Umkreis bis ${v} km`} />
      </LockableScrollView>,
    );
    const scroll = () => screen.UNSAFE_getByType(ScrollView).props.scrollEnabled;
    const track = screen.getByLabelText('Umkreis bis 50 km').parent!.parent!;
    expect(scroll()).toBe(true);
    act(() => fireEvent(track, 'responderGrant', touch(10)));
    expect(scroll()).toBe(false);
    act(() => fireEvent(track, 'responderRelease', touch(10)));
    expect(scroll()).toBe(true);
  });
});
