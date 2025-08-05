import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { EventPage } from './EventPage';
import NotFound from './NotFound';

export default function EventPost() {
  const { naddr } = useParams<{ naddr: string }>();

  if (!naddr) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(naddr);
  } catch {
    return <NotFound />;
  }

  if (decoded.type !== 'naddr') {
    return <NotFound />;
  }

  const { kind, pubkey, identifier } = decoded.data;

  // Check if this is a calendar event (kinds 31922 or 31923)
  if (kind !== 31922 && kind !== 31923) {
    return <NotFound />;
  }

  return (
    <EventPage 
      kind={kind}
      pubkey={pubkey}
      identifier={identifier}
    />
  );
}