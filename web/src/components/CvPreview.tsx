import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, ExternalLink } from 'lucide-react';
import { inlineStylesheet } from '@core/html/cvStructure';
import { buildDownloadFiles } from '@core/preview/download';
import { A4_HEIGHT_PX, A4_WIDTH_PX, CV_IFRAME_SANDBOX, countA4Pages } from '@core/preview/frame';
import { sharedCss } from '@/assets/baseCvs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { openHtmlInNewTab, triggerDownloads } from '@/lib/preview/blobs';
import { printHtmlDocument } from '@/lib/preview/printCv';

interface CvPreviewProps {
  html: string;
  jobTitle: string;
  candidateName: string;
  inlineCssOnDownload: boolean;
}

export function CvPreview({ html, jobTitle, candidateName }: CvPreviewProps) {
  const srcDoc = useMemo(() => inlineStylesheet(html, sharedCss), [html]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setScale(width > 0 ? Math.min(1, width / A4_WIDTH_PX) : 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPageCount(null);
  }, [srcDoc]);

  const measurePages = async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    try {
      await doc.fonts.ready;
    } catch {
      // Measure against fallback metrics rather than leaving the badge empty.
    }
    // `.content` is the A4 sheet (min-height: 297mm). Measuring
    // documentElement would include body padding from the screen
    // stylesheet and report every CV as two pages.
    // Don't use `instanceof HTMLElement`: iframe nodes have a
    // different realm, so that check is always false here.
    const sheet = doc.querySelector('.content');
    const height = sheet ? sheet.scrollHeight : doc.documentElement.scrollHeight;
    setPageCount(countA4Pages(height));
  };

  const download = (inlineCss: boolean) => {
    triggerDownloads(
      buildDownloadFiles({
        html,
        css: sharedCss,
        jobTitle,
        candidateName,
        inlineCss,
      })
    );
  };

  const overOnePage = pageCount !== null && pageCount > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {pageCount !== null && (
          <Badge
            variant={overOnePage ? 'outline' : 'secondary'}
            className={
              overOnePage
                ? 'border-transparent bg-amber-500 text-amber-950 dark:bg-amber-400'
                : undefined
            }
          >
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </Badge>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => openHtmlInNewTab(srcDoc)}>
            <ExternalLink />
            Open in new tab
          </Button>

          <div className="flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => printHtmlDocument(srcDoc)}
                >
                  <Download />
                  Download PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Opens the print dialog. Choose &ldquo;Save as PDF&rdquo; and set margins to None.
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
                  aria-label="More download options"
                >
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => download(false)}>
                  HTML + shared.css
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => download(true)}>
                  HTML (CSS inlined)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="overflow-auto rounded-md border bg-neutral-200">
        <div
          style={{
            width: A4_WIDTH_PX * scale,
            height: A4_HEIGHT_PX * scale,
          }}
        >
          <iframe
            ref={iframeRef}
            title="CV preview"
            srcDoc={srcDoc}
            sandbox={CV_IFRAME_SANDBOX}
            onLoad={() => {
              void measurePages();
            }}
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              background: 'white',
            }}
          />
        </div>
      </div>
    </div>
  );
}
