import { FileText, Link2, X } from "lucide-react";
import { isImageUrl, type WeeklyAttachment } from "@/lib/projects/info";

/** 주간 보고 첨부 표시. 이미지는 썸네일, 나머지는 아이콘+제목. onRemove 가 있으면 삭제 버튼을 붙인다 */
export function WeeklyAttachmentList({ items, onRemove }: { items: WeeklyAttachment[]; onRemove?: (index: number) => void }) {
  if (items.length === 0) return null;
  const remove = (i: number, title: string) =>
    onRemove && (
      <button type="button" onClick={() => onRemove(i)} aria-label={`${title} 첨부 삭제`} className="shrink-0 text-slate-400 hover:text-red-700">
        <X size={14} aria-hidden />
      </button>
    );
  const indexed = items.map((a, i) => ({ a, i }));
  const images = indexed.filter(({ a }) => a.kind === "FILE" && isImageUrl(a.url));
  const others = indexed.filter(({ a }) => !(a.kind === "FILE" && isImageUrl(a.url)));
  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map(({ a, i }) => (
            <li key={i} className="relative">
              <a href={a.url} target="_blank" rel="noopener noreferrer" title={a.title}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Blob 외부 URL 원본을 그대로 보여준다 */}
                <img src={a.url} alt={a.title} className="h-24 w-24 rounded-md border border-slate-200 object-cover" />
              </a>
              {onRemove && <span className="absolute top-1 right-1 rounded bg-white/90 p-0.5">{remove(i, a.title)}</span>}
            </li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <ul className="space-y-1">
          {others.map(({ a, i }) => {
            const Icon = a.kind === "FILE" ? FileText : Link2;
            return (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-slate-500" />
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-navy-500 hover:underline">
                  {a.title}
                </a>
                {remove(i, a.title)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
