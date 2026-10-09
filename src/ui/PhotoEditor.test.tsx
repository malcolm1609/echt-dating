import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { PhotoRejected } from '../lib/photoErrors';
import { PhotoEditor } from './PhotoEditor';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../lib/cleanPhoto', () => ({ cleanPhoto: jest.fn(async () => ({ uri: 'file:///ohne-gps.jpg', mimeType: 'image/jpeg' })) }));

describe('PhotoEditor', () => {
  it('uploads a cleaned copy of the picked photo and appends it', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///neu.jpg', mimeType: 'image/jpeg' }] });
    const onUpload = jest.fn().mockResolvedValue('u-1/neu.jpg');
    const onChange = jest.fn().mockResolvedValue(undefined);
    render(<PhotoEditor photos={['u-1/a.jpg']} onUpload={onUpload} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Foto hinzufügen'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['u-1/a.jpg', 'u-1/neu.jpg']));
    expect(onUpload).toHaveBeenCalledWith('file:///ohne-gps.jpg', 'image/jpeg');
  });

  it('explains why the photo check rejected a photo', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///filter.jpg' }] });
    const onChange = jest.fn();
    render(<PhotoEditor photos={[]} onUpload={jest.fn().mockRejectedValue(new PhotoRejected('filter'))} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Foto hinzufügen'));
    expect(await screen.findByText(/ohne starken Filter/)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('explains that a group photo cannot be the main photo', async () => {
    const onChange = jest.fn().mockRejectedValue(new Error('main photo is a group photo'));
    render(<PhotoEditor photos={['u-1/a.jpg', 'u-1/gruppe.jpg']} onUpload={jest.fn()} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Foto 2 als Hauptfoto'));
    expect(await screen.findByText('Ein Gruppenfoto kann nicht dein Hauptfoto sein.')).toBeTruthy();
  });

  it('makes a photo the main one and removes photos', async () => {
    const onChange = jest.fn().mockResolvedValue(undefined);
    render(<PhotoEditor photos={['u-1/a.jpg', 'u-1/b.jpg']} onUpload={jest.fn()} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Foto 2 als Hauptfoto'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['u-1/b.jpg', 'u-1/a.jpg']));
    fireEvent.press(screen.getByLabelText('Foto 1 entfernen'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(['u-1/b.jpg']));
  });

  it('stops at 6 photos', () => {
    render(<PhotoEditor photos={['1', '2', '3', '4', '5', '6'].map((n) => `u-1/${n}.jpg`)} onUpload={jest.fn()} onChange={jest.fn()} />);
    expect(screen.queryByLabelText('Foto hinzufügen')).toBeNull();
  });
});
