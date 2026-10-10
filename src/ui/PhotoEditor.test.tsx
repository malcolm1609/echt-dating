import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { PhotoRejected } from '../lib/photoErrors';
import { applyPhotoLook, photoBrightness } from '../lib/photoLook';
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
    fireEvent.press(await screen.findByText('Foto verwenden'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['u-1/a.jpg', 'u-1/neu.jpg']));
    expect(onUpload).toHaveBeenCalledWith('file:///ohne-gps.jpg', 'image/jpeg');
    expect(applyPhotoLook).not.toHaveBeenCalled();
  });

  it('suggests brightening a dark photo and uploads the adjusted copy only when asked', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///dunkel.jpg' }] });
    (photoBrightness as jest.Mock).mockResolvedValueOnce(0.18);
    const onUpload = jest.fn().mockResolvedValue('u-1/hell.jpg');
    render(<PhotoEditor photos={[]} onUpload={onUpload} onChange={jest.fn().mockResolvedValue(undefined)} />);
    fireEvent.press(screen.getByLabelText('Foto hinzufügen'));
    expect(await screen.findByText('Etwas dunkel geworden. Soll ich es aufhellen?')).toBeTruthy();
    expect(screen.getAllByText('Original')).toHaveLength(3);
    fireEvent.press(screen.getByText('Aufhellen'));
    expect(screen.queryByText('Etwas dunkel geworden. Soll ich es aufhellen?')).toBeNull();
    fireEvent.press(screen.getByText('Foto verwenden'));
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('file:///angepasst.jpg', 'image/jpeg'));
    expect((applyPhotoLook as jest.Mock).mock.calls[0][1].brightness).toBeGreaterThan(0);
  });

  it('drops the photo when adjusting is cancelled', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///neu.jpg' }] });
    const onUpload = jest.fn();
    render(<PhotoEditor photos={[]} onUpload={onUpload} onChange={jest.fn()} />);
    fireEvent.press(screen.getByLabelText('Foto hinzufügen'));
    fireEvent.press(await screen.findByText('Abbrechen'));
    expect(screen.queryByText('Foto verwenden')).toBeNull();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('explains why the photo check rejected a photo', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///filter.jpg' }] });
    const onChange = jest.fn();
    render(<PhotoEditor photos={[]} onUpload={jest.fn().mockRejectedValue(new PhotoRejected('filter'))} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Foto hinzufügen'));
    fireEvent.press(await screen.findByText('Foto verwenden'));
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
