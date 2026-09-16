import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Proves Vite and tsc resolve core's `./foo.js` relative specifiers to
// their `.ts` source across the @core alias - the single riskiest
// assumption behind sharing one src/core between the CLI, the worker
// and this app (see the repo's plan). applyPostProcessing pulls in
// cvStructure.ts, which pulls in cheerio, so calling it for real here
// (not just importing it) exercises the full chain: the alias, cross-
// module .js->.ts resolution inside core, and cheerio actually running
// in the browser - at both dev-serve time and in a production build,
// not only under tsc.
import { applyPostProcessing } from '@core/pipeline/postProcess';

// Deliberately missing the required <link rel="stylesheet"
// href="shared.css">, so the check below is expected to report a
// warning rather than an empty array - proving the warning path (never
// a thrown exception) works from inside a real browser too.
const SAMPLE_HTML =
  '<div class="content"><p>Miguel Rivero López</p><p>Old Title</p><p>contact</p></div>';

const scaffoldCheck = applyPostProcessing(SAMPLE_HTML, {
  jobTitle: 'senior-frontend-developer',
  candidateName: 'Miguel Rivero López',
});
// Paragraph order is name, title, contact - the title is the second one.
const rewrittenTitle =
  [...scaffoldCheck.html.matchAll(/<p>([^<]*)<\/p>/g)].map((m) => m[1])[1] ?? '(not found)';

function App() {
  return (
    <TooltipProvider>
      <div className="flex min-h-svh items-center justify-center p-8">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>CV Tailor</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-muted-foreground text-sm">
              Title rewrite: <span className="text-foreground font-medium">{rewrittenTitle}</span>
            </p>
            <p className="text-muted-foreground text-sm">
              cheerio + core ran in the browser, {scaffoldCheck.structureWarnings.length} structure
              warning(s) reported
            </p>
            <Button className="mt-2">It's alive</Button>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
