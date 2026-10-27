import { docs, pdfs } from '../mock';
import { updatedLabel } from '../components/docs/docs';
import { useDemo } from '../store';
import { Icon } from '../components/Icon';

export function PdfViewerScreen({ file }: { file: string }) {
  const doc = pdfs[file];
  const back = useDemo((s) => s.back);
  const toast = useDemo((s) => s.showToast);
  // The file details the Documents list leaves out.
  const meta = docs.find((d) => d.file === file);
  return (
    <div className="screen screen-col screen-pdf">
      <div className="topbar topbar-dark">
        <button type="button" className="icon-btn" aria-label="Back" onClick={back}>
          <Icon name="left" size={22} color="#F1F4F3" />
        </button>
        <h1 className="topbar-title">{doc.file}</h1>
        <button type="button" className="icon-btn" aria-label={`Download ${doc.file}`} onClick={() => toast('Saved to Files (demo)')}>
          <Icon name="download" size={20} color="#F1F4F3" />
        </button>
      </div>
      <div className="pdf-stage">
        <div className="pdf-page" role="img" aria-label={`${doc.kicker}: ${doc.title}, ${doc.line}${doc.version ? `, version ${doc.version}` : ''}`}>
          <span className="pdf-kicker">{doc.kicker}</span>
          <span className="pdf-title">{doc.title}</span>
          <span className="pdf-line">
            {doc.line}
            {doc.version ? ` · v${doc.version}` : ''}
          </span>
          <span className="pdf-rule" />
          <span className="pdf-skel" style={{ width: '90%' }} />
          <span className="pdf-skel" style={{ width: '74%' }} />
          <span className="pdf-skel" style={{ width: '82%' }} />
          <span className="pdf-skel pdf-skel-gap" style={{ width: '60%' }} />
          <span className="pdf-skel" style={{ width: '86%' }} />
          <span className="pdf-skel" style={{ width: '70%' }} />
        </div>
      </div>
      <p className="pdf-foot">
        {meta ? `Updated ${updatedLabel(meta.updated)} · ${meta.size} · saved for offline use` : 'Pinch to zoom · saved for offline use'}
      </p>
    </div>
  );
}
