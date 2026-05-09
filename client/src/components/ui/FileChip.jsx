import Icon from './Icon';

export default function FileChip({ file, onRemove, downloadable, onDownload }) {
  const sizeStr = file.sizeBytes
    ? file.sizeBytes > 1024 * 1024
      ? `${(file.sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
      : `${Math.round(file.sizeBytes / 1024)} КБ`
    : file.size || '';

  return (
    <div className="file-chip">
      <div className="file-chip-ico"><Icon name="file" size={16} /></div>
      <div className="file-chip-meta">
        <div className="nm">{file.filename || file.name}</div>
        <div className="sz">{sizeStr}</div>
      </div>
      {downloadable && (
        <button className="btn ghost sm" title="Скачать" onClick={onDownload}>
          <Icon name="download" size={14} />
        </button>
      )}
      {onRemove && (
        <button className="btn ghost sm" onClick={onRemove} title="Удалить">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
