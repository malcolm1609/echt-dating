import { fireEvent, render, screen } from '@testing-library/react-native';
import { Image, Linking } from 'react-native';
import { ProfileDetails } from './ProfileDetails';

const person = {
  name: 'Elif', age: 28, eyebrow: '7 km entfernt', goal: 'ernst' as const, bio: '',
  prompts: [{ question: 'Ein Ort in meiner Stadt, den ich dir zeigen würde …', answer: 'Der Flohmarkt am Mauerpark, sonntags um neun.' }],
  interests: ['Flohmärkte', 'Kochen', 'Wissenschaft'],
};

describe('ProfileDetails', () => {
  it('puts the main photo on the card and the others between the answers', () => {
    render(<ProfileDetails {...person} photos={['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg']} />);
    const shown = screen.UNSAFE_getAllByType(Image).map((n) => n.props.source.uri);
    expect(shown).toEqual(['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg']);
  });

  it('shows goal, answered questions and interests', () => {
    render(<ProfileDetails {...person} />);
    expect(screen.getByText('Elif, 28')).toBeTruthy();
    expect(screen.getByText('Sucht: Etwas Ernstes, ohne Eile')).toBeTruthy();
    expect(screen.getByText('Ein Ort in meiner Stadt, den ich dir zeigen würde …')).toBeTruthy();
    expect(screen.getByText('Der Flohmarkt am Mauerpark, sonntags um neun.')).toBeTruthy();
  });

  it('highlights interests you share', () => {
    render(<ProfileDetails {...person} myInterests={['Kochen']} />);
    expect(screen.getByText('1 Gemeinsamkeit')).toBeTruthy();
    expect(screen.getByLabelText('Kochen, gemeinsam')).toBeTruthy();
    expect(screen.getByLabelText('Wissenschaft')).toBeTruthy();
  });

  it('shows the favourite song and opens it in the music app', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const music = { provider: 'spotify' as const, kind: 'track' as const, url: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv', title: 'Bohemian Rhapsody' };
    render(<ProfileDetails {...person} music={music} />);
    expect(screen.getByText('Bohemian Rhapsody')).toBeTruthy();
    fireEvent.press(screen.getByText('In Spotify öffnen'));
    expect(open).toHaveBeenCalledWith(music.url);
  });
});
