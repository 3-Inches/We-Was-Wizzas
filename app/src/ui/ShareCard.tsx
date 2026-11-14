import { useState, type ReactNode } from 'react';
import { CHAT_LINK_LIMIT } from '../util/files';
import { Card } from './kit';

/**
 * Sending something to another person's browser: as a file (which always works) or as a link (which
 * a chat app cuts off when it is long, as a finished magus's nearly always is).
 */
export default function ShareCard(props: { title: string; link: string; onDownload: () => void; onClose: () => void; children?: ReactNode }) {
  const { link } = props;
  const [copied, setCopied] = useState(false);
  const long = link.length > CHAT_LINK_LIMIT;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Card title={props.title} tour="share-card" actions={<button className="small ghost" onClick={props.onClose} aria-label="Close">✕</button>}>
      {props.children}
      <div className="row">
        <button className={long ? 'primary' : ''} onClick={props.onDownload} data-tour="share-file">
          Save as a file
        </button>
        <span className="small soft">Attach the file to a message or an email. The other person opens the toolkit and presses <b>Import file…</b></span>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input readOnly value={link} style={{ flex: 1, minWidth: 0 }} onFocus={(e) => e.target.select()} aria-label="Link" />
        <button className={long ? '' : 'primary'} onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <p className={`small ${long ? 'warn-text' : 'muted'}`} data-tour="share-length">
        {long
          ? `The link is ${link.length.toLocaleString()} characters: too long for one chat message (Discord stops at ${CHAT_LINK_LIMIT.toLocaleString()}) and it would arrive cut off. Send the file.`
          : `The link is ${link.length.toLocaleString()} characters and fits in a chat message. Opening it shows what it holds before anything is imported.`}
      </p>
    </Card>
  );
}
