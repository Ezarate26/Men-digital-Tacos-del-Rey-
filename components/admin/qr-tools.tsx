"use client";

export function QrTools({
  dataUrl,
  filename,
  title,
  url,
}: {
  dataUrl: string;
  filename: string;
  title: string;
  url: string;
}) {
  function printQr() {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
    if (!popup) return;

    const safeTitle = escapeHtml(title);
    const safeUrl = escapeHtml(url);
    popup.document.write(
      `<!doctype html><html><head><title>${safeTitle}</title></head><body style="margin:0;font-family:Arial,sans-serif;text-align:center;padding:32px;background:#f5f0e6;color:#101010"><p style="letter-spacing:.28em;font-size:12px">TACOS DEL REY</p><h1 style="font-size:28px;margin:8px 0">${safeTitle}</h1><img alt="" src="${dataUrl}" width="280" height="280" /><p style="word-break:break-all">${safeUrl}</p><script>window.onload=function(){window.print()}<\/script></body></html>`,
    );
    popup.document.close();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={dataUrl}
        download={filename}
        className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-black"
      >
        Descargar QR
      </a>
      <button
        type="button"
        onClick={printQr}
        className="rounded-full border border-gold/40 px-4 py-2 text-sm text-gold-light"
      >
        Imprimir
      </button>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[character] ?? character;
  });
}
