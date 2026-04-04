import { useRef, useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';
import { getGraph } from '../api';
import { LoadingCenter, ErrorMsg } from '../components/ui';
import type { GraphNode, GraphEdge } from '../types';
import { getRiskColor } from '../types';

const EDGE_COLORS: Record<string, string> = {
  owns:         'rgba(0,212,255,.5)',
  directs:      'rgba(168,85,247,.5)',
  affiliated:   'rgba(245,158,11,.45)',
  participated: 'rgba(74,222,128,.4)',
  default:      'rgba(148,163,184,.25)',
};

export default function Graph() {
  const svgRef   = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();
  const [riskMin, setRiskMin] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['graph', riskMin],
    queryFn: () => getGraph(riskMin),
  });

  const buildGraph = useCallback(() => {
    if (!data || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const rect = svgRef.current.getBoundingClientRect();
    const W = rect.width  || 900;
    const H = rect.height || 580;

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    svg.append('defs').append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 -4 8 8')
      .attr('refX', 16).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', 'rgba(148,163,184,.4)');

    const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
    const idSet = new Set(nodes.map((n) => n.id));
    const edges: GraphEdge[] = data.edges.filter(
      (e) => idSet.has(e.source as string) && idSet.has(e.target as string),
    );

    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id((d) => d.id).distance(110).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(28));

    const link = g.append('g').selectAll('line')
      .data(edges).join('line')
      .attr('stroke', (d) => EDGE_COLORS[d.type] ?? EDGE_COLORS.default)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');

    const linkLabel = g.append('g').selectAll('text')
      .data(edges).join('text')
      .attr('font-size', 8).attr('font-family', 'var(--font-mono)')
      .attr('fill', 'rgba(148,163,184,.5)').attr('text-anchor', 'middle')
      .text((d) => d.type);

    const node = g.append('g').selectAll<SVGGElement, GraphNode>('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('click', (_, d) => {
        if (d.type === 'contract') {
          const entityId = d.id.split('-')[1];
          navigate(`/contracts/${entityId}`);
        }
      })
      .on('mouseenter', (e, d) => {
        const box = svgRef.current!.getBoundingClientRect();
        setTooltip({ x: e.clientX - box.left, y: e.clientY - box.top, node: d });
      })
      .on('mouseleave', () => setTooltip(null));

    node.append('circle')
      .attr('r', (d) => d.type === 'contract' ? 12 : d.type === 'company' ? 16 : 11)
      .attr('fill', (d) => getRiskColor(d.risk) + '22')
      .attr('stroke', (d) => getRiskColor(d.risk))
      .attr('stroke-width', (d) => d.risk >= 70 ? 2.5 : 1.5);

    node.append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('font-size', (d) => d.type === 'company' ? 8 : 7)
      .attr('fill', 'var(--text-1)').attr('pointer-events', 'none')
      .text((d) => d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => (d.type === 'contract' ? 12 : d.type === 'company' ? 16 : 11) + 10)
      .attr('font-size', 7).attr('fill', 'var(--text-3)').attr('pointer-events', 'none')
      .text((d) => d.type === 'contract' ? '📄' : d.type === 'company' ? '🏢' : '👤');

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      linkLabel
        .attr('x', (d) => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
        .attr('y', (d) => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [data, navigate]);

  useEffect(() => {
    const cleanup = buildGraph();
    return () => { cleanup?.(); };
  }, [buildGraph]);

  if (isLoading) return <LoadingCenter />;
  if (error) return <ErrorMsg message="Ошибка загрузки графа" />;

  const nodeCount = data?.nodes.length ?? 0;
  const edgeCount = data?.edges.length ?? 0;

  return (
    <div className="page-inner" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>Мин. риск:</span>
        <input type="range" min={0} max={90} step={10} value={riskMin}
          onChange={(e) => setRiskMin(Number(e.target.value))}
          style={{ accentColor: 'var(--cyan)', width: 140 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', minWidth: 24 }}>{riskMin}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginLeft: 12 }}>
          {nodeCount} узлов · {edgeCount} связей
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          {[
            { color: EDGE_COLORS.owns,       label: 'владелец' },
            { color: EDGE_COLORS.directs,    label: 'директор' },
            { color: EDGE_COLORS.affiliated, label: 'аффилиат' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
              <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%', minHeight: 520 }} />

        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x + 14, top: tooltip.y - 10,
            background: 'rgba(7,16,26,.95)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '8px 12px', fontSize: 11,
            fontFamily: 'var(--font-mono)', pointerEvents: 'none', zIndex: 10, minWidth: 160,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>{tooltip.node.name}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 10, marginBottom: 3 }}>
              {tooltip.node.type === 'contract' ? 'Контракт' : tooltip.node.type === 'company' ? 'Компания' : 'Персона'}
              {' · '}
              <span style={{ color: getRiskColor(tooltip.node.risk) }}>риск {tooltip.node.risk}</span>
            </div>
            {tooltip.node.type === 'contract' && (
              <div style={{ color: 'var(--cyan)', fontSize: 9 }}>Нажмите чтобы открыть</div>
            )}
          </div>
        )}

        {nodeCount === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Нет данных для отображения при текущем фильтре риска
          </div>
        )}
      </div>
    </div>
  );
}
