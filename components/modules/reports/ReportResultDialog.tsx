'use client';

import { useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Minus, Download, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import type { ReportResult, ReportSection } from '@/lib/services/report.service';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#6366f1'];

interface ReportResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportResult | null;
}

export function ReportResultDialog({ open, onOpenChange, report }: ReportResultDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!contentRef.current || !report) return;
    setExporting(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas-pro').then((m) => m.default),
        import('jspdf'),
      ]);

      const MARGIN = 10; // mm
      const PAGE_W = 210;
      const PAGE_H = 297;
      const CONTENT_W = PAGE_W - MARGIN * 2; // 190mm
      const CONTENT_H = PAGE_H - MARGIN * 2; // 277mm

      // Build an offscreen clone at a fixed px width that matches A4 aspect ratio
      // 190mm at ~96dpi ≈ 720px
      const PDF_PX_WIDTH = 720;

      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.width = `${PDF_PX_WIDTH}px`;
      wrapper.style.background = '#ffffff';
      wrapper.style.padding = '24px';
      wrapper.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      document.body.appendChild(wrapper);

      // Add title header
      const header = document.createElement('div');
      header.style.marginBottom = '20px';
      header.innerHTML = `
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 6px 0; color: #111;">${report.title}</h1>
        <p style="font-size: 12px; color: #666; margin: 0;">${report.description} &mdash; Generated ${new Date(report.generatedAt).toLocaleString()}</p>
        <hr style="margin-top: 12px; border: none; border-top: 1px solid #e5e7eb;" />
      `;
      wrapper.appendChild(header);

      // Clone the actual content
      const contentClone = contentRef.current.cloneNode(true) as HTMLElement;
      contentClone.style.width = '100%';
      contentClone.style.background = '#ffffff';
      // Ensure all grid layouts are visible at this width
      const grids = contentClone.querySelectorAll('.grid');
      grids.forEach((grid) => {
        const el = grid as HTMLElement;
        // Force stats to 3-col and charts to 2-col
        if (el.classList.contains('grid-cols-2') && el.classList.contains('sm:grid-cols-3')) {
          el.style.display = 'grid';
          el.style.gridTemplateColumns = 'repeat(3, 1fr)';
          el.style.gap = '12px';
        }
        if (el.classList.contains('md:grid-cols-2')) {
          el.style.display = 'grid';
          el.style.gridTemplateColumns = 'repeat(2, 1fr)';
          el.style.gap = '16px';
        }
      });
      wrapper.appendChild(contentClone);

      // Wait for recharts SVGs to re-render in the clone
      await new Promise((r) => setTimeout(r, 500));

      // Collect all top-level section elements (direct children of the content wrapper)
      const sections = Array.from(contentClone.children) as HTMLElement[];

      // For each section, also expand any nested items (chart grid children)
      const renderableBlocks: HTMLElement[] = [];
      for (const section of sections) {
        // If it's the chart grid, add each chart individually
        if (section.classList.contains('grid') && section.classList.contains('md:grid-cols-2')) {
          const children = Array.from(section.children) as HTMLElement[];
          // Render the whole grid as one block if small enough, otherwise individually
          renderableBlocks.push(section);
        } else {
          renderableBlocks.push(section);
        }
      }

      // Capture each block as a canvas
      const blockImages: { dataUrl: string; width: number; height: number }[] = [];

      // First capture the header
      const headerCanvas = await html2canvas(header, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: PDF_PX_WIDTH,
      });
      blockImages.push({
        dataUrl: headerCanvas.toDataURL('image/png'),
        width: headerCanvas.width,
        height: headerCanvas.height,
      });

      for (const block of renderableBlocks) {
        const canvas = await html2canvas(block, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: PDF_PX_WIDTH - 48, // account for wrapper padding
        });
        blockImages.push({
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      }

      // Remove offscreen clone
      document.body.removeChild(wrapper);

      // Build PDF section by section, avoiding cuts
      const pdf = new jsPDF('p', 'mm', 'a4');
      let cursorY = MARGIN;

      for (const img of blockImages) {
        const imgMmHeight = (img.height / img.width) * CONTENT_W;

        // If this block doesn't fit on the current page, start a new page
        // (unless it's the very first block or the block is taller than a full page)
        if (cursorY + imgMmHeight > PAGE_H - MARGIN && cursorY > MARGIN + 1) {
          pdf.addPage();
          cursorY = MARGIN;
        }

        // If block is taller than one page, we need to slice it
        if (imgMmHeight > CONTENT_H) {
          // Slice approach for oversized blocks
          let blockOffset = 0;
          while (blockOffset < imgMmHeight) {
            if (blockOffset > 0) {
              pdf.addPage();
              cursorY = MARGIN;
            }
            const remainingOnPage = PAGE_H - MARGIN - cursorY;
            const sliceH = Math.min(remainingOnPage, imgMmHeight - blockOffset);

            // Create slice canvas
            const srcY = (blockOffset / imgMmHeight) * img.height;
            const srcH = (sliceH / imgMmHeight) * img.height;
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = img.width;
            sliceCanvas.height = srcH;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              const tempImg = new Image();
              tempImg.src = img.dataUrl;
              await new Promise<void>((resolve) => {
                tempImg.onload = () => {
                  ctx.drawImage(tempImg, 0, srcY, img.width, srcH, 0, 0, img.width, srcH);
                  resolve();
                };
              });
            }
            pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', MARGIN, cursorY, CONTENT_W, sliceH);
            cursorY += sliceH;
            blockOffset += sliceH;
          }
        } else {
          pdf.addImage(img.dataUrl, 'PNG', MARGIN, cursorY, CONTENT_W, imgMmHeight);
          cursorY += imgMmHeight + 4; // 4mm gap between sections
        }
      }

      const fileName = `${report.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setExporting(false);
    }
  }, [report]);

  if (!report) return null;

  // Separate sections by type for layout ordering
  const statsSections = report.sections.filter((s) => s.type === 'stats');
  const chartSections = report.sections.filter((s) => s.type === 'chart');
  const tableSections = report.sections.filter((s) => s.type === 'table');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl w-[95vw] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>{report.title}</DialogTitle>
              <DialogDescription>
                {report.description} — Generated {new Date(report.generatedAt).toLocaleString()}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={exporting}
              className="shrink-0 mt-0.5"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              {exporting ? 'Exporting...' : 'Download PDF'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div ref={contentRef} className="space-y-6 pb-4">
            {/* Stats first */}
            {statsSections.map((section, i) => (
              <StatsSectionView key={`stats-${i}`} section={section} />
            ))}

            {/* Charts in 2-col grid */}
            {chartSections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chartSections.map((section, i) => (
                  <ChartSectionView key={`chart-${i}`} section={section} />
                ))}
              </div>
            )}

            {/* Tables last */}
            {tableSections.map((section, i) => (
              <TableSectionView key={`table-${i}`} section={section} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatsSectionView({ section }: { section: ReportSection }) {
  if (!section.stats) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{section.title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {section.stats.map((stat, i) => (
          <div key={i} className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              {stat.trend && <TrendIcon trend={stat.trend} />}
            </div>
            <div className="text-lg font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function truncateLabel(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '...' : str;
}

function ChartSectionView({ section }: { section: ReportSection }) {
  if (!section.chartData || section.chartData.length === 0) return null;

  const chartType = section.chartType || 'bar';

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">{section.title}</h3>
      <div className="h-[300px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={section.chartData}
                cx="50%"
                cy="45%"
                innerRadius={45}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
              >
                {section.chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => truncateLabel(value, 18)}
              />
            </PieChart>
          ) : chartType === 'line' ? (
            <LineChart data={section.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" width={50} />
              <Tooltip />
              {(section.chartKeys || [{ dataKey: 'value', color: '#3b82f6', label: 'Value' }]).map(
                (key) => (
                  <Line
                    key={key.dataKey}
                    type="monotone"
                    dataKey={key.dataKey}
                    stroke={key.color}
                    name={key.label}
                    strokeWidth={2}
                  />
                )
              )}
            </LineChart>
          ) : (
            <BarChart data={section.chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={65}
                tickFormatter={(val: string) => truncateLabel(val, 14)}
              />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" width={50} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              {(section.chartKeys || [{ dataKey: 'value', color: '#3b82f6', label: 'Value' }]).map(
                (key) => (
                  <Bar
                    key={key.dataKey}
                    dataKey={key.dataKey}
                    fill={key.color}
                    name={key.label}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                )
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TableSectionView({ section }: { section: ReportSection }) {
  if (!section.columns || !section.rows) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{section.title}</h3>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {section.columns.map((col, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.length === 0 ? (
                <tr>
                  <td colSpan={section.columns.length} className="px-3 py-4 text-center text-muted-foreground">
                    No data available
                  </td>
                </tr>
              ) : (
                section.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return <ArrowUp className="h-3 w-3 text-green-500" />;
  if (trend === 'down') return <ArrowDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}
