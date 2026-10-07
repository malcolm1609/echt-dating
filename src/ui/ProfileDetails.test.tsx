import { render, screen } from '@testing-library/react-native';
import { ProfileDetails } from './ProfileDetails';

const person = {
  name: 'Elif', age: 28, eyebrow: '7 km entfernt', goal: 'ernst' as const, bio: '',
  prompts: [{ question: 'Ein Ort in meiner Stadt, den ich dir zeigen würde …', answer: 'Der Flohmarkt am Mauerpark, sonntags um neun.' }],
  interests: ['Flohmärkte', 'Kochen', 'Wissenschaft'],
};

describe('ProfileDetails', () => {
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
});
