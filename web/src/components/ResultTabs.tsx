import type { PipelineState } from '@core/pipeline/machine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

function KeywordGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium uppercase">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

interface ResultTabsProps {
  pipelineState: PipelineState;
}

/**
 * The Preview tab renders raw HTML today. Phase 6 replaces it with a
 * sandboxed `srcDoc` iframe (sandbox="allow-same-origin allow-modals",
 * deliberately never allow-scripts) so LLM-authored markup can never
 * execute script - see the plan. Until then this tab only ever shows
 * the mock's own canned HTML, never untrusted input.
 */
export function ResultTabs({ pipelineState }: ResultTabsProps) {
  if (pipelineState.status === 'idle' || pipelineState.status === 'fetching-offer') {
    return null;
  }

  const { result, processedHtml, keywords } = pipelineState;
  const html = processedHtml ?? result?.html;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="html">HTML</TabsTrigger>
          </TabsList>

          <TabsContent value="preview">
            {html ? (
              <div
                className="max-h-[32rem] overflow-auto rounded-md border bg-white p-4 text-black"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                The preview appears once generation completes.
              </p>
            )}
          </TabsContent>

          <TabsContent value="summary">
            {result?.summary ? (
              <p className="text-sm">{result.summary}</p>
            ) : (
              <p className="text-muted-foreground text-sm">
                The summary appears once adaptation finishes.
              </p>
            )}
          </TabsContent>

          <TabsContent value="keywords">
            {keywords ? (
              <div className="flex flex-col gap-3">
                {keywords.company_name && (
                  <p className="text-sm">
                    Company: <span className="font-medium">{keywords.company_name}</span>
                  </p>
                )}
                <KeywordGroup label="Hard skills" items={keywords.hard_skills} />
                <KeywordGroup label="Soft skills" items={keywords.soft_skills} />
                <KeywordGroup label="Technologies" items={keywords.technologies} />
                <KeywordGroup label="Responsibilities" items={keywords.responsibilities} />
                <KeywordGroup label="Company culture" items={keywords.company_culture} />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Keywords appear as soon as extraction finishes.
              </p>
            )}
          </TabsContent>

          <TabsContent value="html">
            {html ? (
              <ScrollArea className="h-[32rem] rounded-md border">
                <pre className="p-4 text-xs whitespace-pre-wrap">{html}</pre>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-sm">
                The raw HTML appears once generation completes.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
