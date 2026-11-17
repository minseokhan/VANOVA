import { ExternalLink, FileText, Link2, X } from "lucide-react";
import { isImageUrl, type WeeklyAttachment } from "@/lib/projects/info";

/** 링크는 도메인, 파일은 확장자를 보조 문구로 */
function subtitle(a: WeeklyAttachment): string {
  if (a.kind === "LINK") {
    try {
      return new URL(a.url).hostname.replace(/^www\./, "");
    } catch {
      return "링크";
    }
  }
  const ext = new URL(a.url).pathname.split(".").pop()?.toUpperCase();
  return ext ? `${ext} 파일` : "파일";
}

/** 주간 보고 첨부 표시. 이미지는 썸네일, 나머지는 아이콘+제목. onRemove 가 있으면 삭제 버튼을 붙인다 */
export function WeeklyAttachmentList({ items, onRemove }: { items: WeeklyAttachment[]; onRemove?: (index: number) => void }) {
  if (items.length === 0) return null;
  const remove = (i: number, title: string) =>
    onRemove && (
      <button type="button" onClick={() => onRemove(i)} aria-label={`${title} 첨부 삭제`} className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700">
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
        <ul className="grid gap-2 sm:grid-cols-2">
          {others.map(({ a, i }) => {
            const Icon = a.kind === "FILE" ? FileText : Link2;
            return (
              <li
                key={i}
                className="group flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-navy-500"
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-slate-500" />
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-medium text-slate-800 group-hover:text-navy-700">
                    <span className="truncate">{a.title}</span>
                    <ExternalLink size={12} aria-hidden className="shrink-0 text-slate-400" />
                  </span>
                  <span className="block truncate text-xs text-slate-500">{subtitle(a)}</span>
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
