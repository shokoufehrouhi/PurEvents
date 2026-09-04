import { useLocalSearchParams } from 'expo-router';

import { EventWizard } from '../../../src/screens/EventWizard';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventWizard mode="edit" eventId={id} />;
}
