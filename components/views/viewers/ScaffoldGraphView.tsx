import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type GraphData, type LinkObject, type NodeObject } from 'react-force-graph-2d';
import type { ScaffoldPlan, ScaffoldTreeItem } from '../../../types';

export type GraphNodeType =
    | 'project'
    | 'layer'
    | 'file'
    | 'task'
    | 'phase'
    | 'subtask'
    | 'validate'
    | 'constraint';

interface GraphNodePayload {
    id: string;
    label: string;
    type: GraphNodeType;
    detail?: string;
    status?: string;
    layer?: string;
}

interface GraphLinkPayload {
    relation: string;
    color: string;
}

type GraphNode = NodeObject<GraphNodePayload>;
type GraphLink = LinkObject<GraphNodePayload, GraphLinkPayload>;

type ScaffoldGraphData = GraphData<GraphNode, GraphLink>;

const NODE_META: Record<GraphNodeType, { label: string; color: string; description: string }> = {
    project: {
        label: 'Project',
        color: '#38bdf8',
        description: 'High-level solution scope and constraints',
    },
    layer: {
        label: 'Architecture Layer',
        color: '#f97316',
        description: 'Clean architecture layer that groups generated files',
    },
    file: {
        label: 'File',
        color: '#a855f7',
        description: 'Generated source file with an associated prompt',
    },
    task: {
        label: 'Goal',
        color: '#22c55e',
        description: 'Primary delivery goal within the scaffold plan',
    },
    phase: {
        label: 'Phase',
        color: '#eab308',
        description: 'Milestone grouping the concrete build steps',
    },
    subtask: {
        label: 'Build Step',
        color: '#38bdf8',
        description: 'Executable implementation task',
    },
    validate: {
        label: 'Validation',
        color: '#f87171',
        description: 'Quality or constraint checks applied to build steps',
    },
    constraint: {
        label: 'Constraint',
        color: '#fbbf24',
        description: 'Guardrail that keeps the scaffold within project limits',
    },
};

const RELATION_COLORS: Record<string, string> = {
    'enforces layer': '#f97316',
    'contains file': '#a855f7',
    'depends on': '#f43f5e',
    'drives goal': '#22c55e',
    'expands into phase': '#eab308',
    'delivers output': '#38bdf8',
    'validation step': '#f87171',
    constraint: '#fbbf24',
};

const formatDetail = (detail?: string) => detail?.split('\n').filter(Boolean) ?? [];

const buildDetailFromTreeItem = (file?: ScaffoldTreeItem) => {
    if (!file) {
        return 'File inferred from dependency graph';
    }

    return [
        `Layer: ${file.layer}`,
        `Purpose: ${file.purpose}`,
    ].join('\n');
};

const sanitizeId = (value: string) => value.replace(/\s+/g, '-').toLowerCase();

const buildGraphData = (plan: ScaffoldPlan): ScaffoldGraphData => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeLookup = new Map<string, GraphNode>();
    const linkKeys = new Set<string>();
    const treeByPath = new Map<string, ScaffoldTreeItem>();

    plan.tree.forEach((item) => {
        treeByPath.set(item.path, item);
    });

    const registerNode = (payload: GraphNodePayload): GraphNode => {
        const existing = nodeLookup.get(payload.id);
        if (existing) {
            if (payload.detail && (!existing.detail || existing.detail === 'File inferred from dependency graph')) {
                existing.detail = payload.detail;
            }
            existing.label = payload.label || existing.label;
            existing.layer = payload.layer ?? existing.layer;
            return existing;
        }

        const node = { ...payload } as GraphNode;
        nodeLookup.set(payload.id, node);
        nodes.push(node);
        return node;
    };

    const registerLink = (payload: GraphLinkPayload & { source: string; target: string }) => {
        const key = `${payload.source}->${payload.target}::${payload.relation}`;
        if (linkKeys.has(key)) {
            return;
        }
        linkKeys.add(key);
        links.push({ source: payload.source, target: payload.target, relation: payload.relation, color: payload.color } as GraphLink);
    };

    const ensureLayerNode = (layer: string) =>
        registerNode({
            id: `layer:${sanitizeId(layer)}`,
            label: layer,
            type: 'layer',
            detail: `Clean architecture layer: ${layer}`,
        });

    const ensureFileNode = (path: string) => {
        const id = `file:${path}`;
        const file = treeByPath.get(path);
        return registerNode({
            id,
            label: path.split('/').pop() ?? path,
            type: 'file',
            detail: buildDetailFromTreeItem(file),
            layer: file?.layer,
        });
    };

    const projectId = `project:${sanitizeId(plan.project.name)}`;
    registerNode({
        id: projectId,
        label: plan.project.name,
        type: 'project',
        detail: [
            `Language: ${plan.project.language}`,
            `Template: ${plan.project.template}`,
            `Package manager: ${plan.project.packageManager}`,
            `License: ${plan.project.license}`,
        ].join('\n'),
    });

    if (plan.constraints) {
        const constraintId = `constraint:${sanitizeId(plan.project.name)}`;
        registerNode({
            id: constraintId,
            label: 'Constraints',
            type: 'constraint',
            detail: [
                `Max LOC per file: ${plan.constraints.max_loc_per_file}`,
                `Enforce layering: ${plan.constraints.enforce_layering ? 'yes' : 'no'}`,
                `Repository pattern: ${plan.constraints.repository_pattern ? 'required' : 'optional'}`,
                plan.constraints.framework_free_layers.length
                    ? `Framework-free layers: ${plan.constraints.framework_free_layers.join(', ')}`
                    : undefined,
            ]
                .filter(Boolean)
                .join('\n'),
        });
        registerLink({ source: projectId, target: constraintId, relation: 'constraint', color: RELATION_COLORS.constraint });
    }

    plan.layers.forEach((layer) => {
        const layerNode = ensureLayerNode(layer);
        registerLink({
            source: projectId,
            target: layerNode.id as string,
            relation: 'enforces layer',
            color: RELATION_COLORS['enforces layer'],
        });
    });

    plan.tree.forEach((file) => {
        const layerNode = ensureLayerNode(file.layer);
        const fileNode = ensureFileNode(file.path);
        registerLink({
            source: layerNode.id as string,
            target: fileNode.id as string,
            relation: 'contains file',
            color: RELATION_COLORS['contains file'],
        });
    });

    plan.dependencies.forEach((dependency) => {
        const fromNode = ensureFileNode(dependency.from);
        dependency.to.forEach((targetPath) => {
            const targetNode = ensureFileNode(targetPath);
            registerLink({
                source: fromNode.id as string,
                target: targetNode.id as string,
                relation: 'depends on',
                color: RELATION_COLORS['depends on'],
            });
        });
    });

    plan.tasks.forEach((task, taskIndex) => {
        const taskId = `task:${taskIndex}`;
        registerNode({
            id: taskId,
            label: task.goal,
            type: 'task',
            detail: `Phases: ${task.phases.length}`,
        });
        registerLink({
            source: projectId,
            target: taskId,
            relation: 'drives goal',
            color: RELATION_COLORS['drives goal'],
        });

        task.phases.forEach((phase, phaseIndex) => {
            const phaseId = `phase:${taskIndex}:${phaseIndex}`;
            registerNode({
                id: phaseId,
                label: phase.name,
                type: 'phase',
                detail: `Steps: ${phase.tasks.length}`,
            });
            registerLink({
                source: taskId,
                target: phaseId,
                relation: 'expands into phase',
                color: RELATION_COLORS['expands into phase'],
            });

            phase.tasks.forEach((subtask, subtaskIndex) => {
                const subtaskId = `subtask:${taskIndex}:${phaseIndex}:${subtaskIndex}`;
                registerNode({
                    id: subtaskId,
                    label: subtask.name,
                    type: 'subtask',
                    detail: subtask.outputs.length ? `Outputs: ${subtask.outputs.join(', ')}` : undefined,
                });
                registerLink({
                    source: phaseId,
                    target: subtaskId,
                    relation: 'delivers output',
                    color: RELATION_COLORS['delivers output'],
                });

                if (subtask.validate) {
                    const validateId = `validate:${taskIndex}:${phaseIndex}:${subtaskIndex}`;
                    registerNode({
                        id: validateId,
                        label: 'Validate',
                        type: 'validate',
                        status: subtask.validate.status,
                        detail: subtask.validate.checks.length
                            ? `Checks: ${subtask.validate.checks.join(', ')}`
                            : undefined,
                    });
                    registerLink({
                        source: subtaskId,
                        target: validateId,
                        relation: 'validation step',
                        color: RELATION_COLORS['validation step'],
                    });
                }
            });
        });
    });

    return { nodes, links };
};

const useContainerSize = (containerRef: React.RefObject<HTMLDivElement>) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const element = containerRef.current;
        if (!element) {
            return;
        }

        const updateSize = () => {
            const rect = element.getBoundingClientRect();
            setDimensions({ width: rect.width, height: rect.height });
        };

        updateSize();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(() => updateSize());
            observer.observe(element);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [containerRef]);

    return dimensions;
};

interface ScaffoldGraphViewProps {
    plan: ScaffoldPlan;
}

export const ScaffoldGraphView: React.FC<ScaffoldGraphViewProps> = ({ plan }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
    const { width, height } = useContainerSize(containerRef);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);

    const graphData = useMemo(() => buildGraphData(plan), [plan]);

    const nodeIndex = useMemo(() => {
        const lookup = new Map<string, GraphNode>();
        graphData.nodes.forEach((node) => {
            if (node.id !== undefined) {
                lookup.set(String(node.id), node as GraphNode);
            }
        });
        return lookup;
    }, [graphData.nodes]);

    useEffect(() => {
        if (!graphRef.current) {
            return;
        }
        graphRef.current.d3ReheatSimulation();
        const timeout = window.setTimeout(() => {
            graphRef.current?.zoomToFit(400, 40);
        }, 450);
        return () => window.clearTimeout(timeout);
    }, [graphData]);

    const renderNode = useCallback(
        (nodeObject: NodeObject<GraphNodePayload>, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const node = nodeObject as GraphNode;
            const meta = NODE_META[node.type] ?? NODE_META.file;
            const isSelected = selectedNode?.id === node.id;
            const isHovered = hoveredNode?.id === node.id;
            const baseRadius = 6 + (node.type === 'project' ? 4 : node.type === 'task' ? 2 : node.type === 'phase' ? 1 : 0);
            const radius = baseRadius * (isSelected ? 1.4 : isHovered ? 1.2 : 1);
            const x = node.x ?? 0;
            const y = node.y ?? 0;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = meta.color;
            ctx.fill();

            ctx.lineWidth = isSelected ? 2.5 : 1.3;
            ctx.strokeStyle = isSelected ? '#fef08a' : isHovered ? '#f8fafc' : '#0f172a';
            ctx.stroke();

            const label = node.label ?? '';
            if (label) {
                const fontSize = Math.max(10, 12 / globalScale);
                ctx.font = `${fontSize}px Inter, system-ui`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f8fafc';
                ctx.fillText(label, x + radius + 4, y);
            }
        },
        [hoveredNode, selectedNode]
    );

    const paintPointer = useCallback((nodeObject: NodeObject<GraphNodePayload>, color: string, ctx: CanvasRenderingContext2D) => {
        const node = nodeObject as GraphNode;
        const baseRadius = 6 + (node.type === 'project' ? 4 : node.type === 'task' ? 2 : node.type === 'phase' ? 1 : 0);
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();
    }, []);

    const handleDownload = useCallback(() => {
        const canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) {
            return;
        }
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${sanitizeId(plan.project.name)}-scaffold-graph.png`;
        link.click();
    }, [plan.project.name]);

    const handleFocus = useCallback(() => {
        graphRef.current?.zoomToFit(400, 40);
    }, []);

    const resolveNodeLabel = useCallback(
        (nodeRef: GraphLink['source']) => {
            if (!nodeRef) {
                return '';
            }
            if (typeof nodeRef === 'object') {
                return (nodeRef as GraphNode).label ?? '';
            }
            return nodeIndex.get(String(nodeRef))?.label ?? String(nodeRef);
        },
        [nodeIndex]
    );

    return (
        <div className="relative w-full h-[60vh] rounded-lg border border-border-color bg-background shadow-inner" ref={containerRef}>
            {width > 0 && height > 0 && (
                <ForceGraph2D
                    ref={graphRef as React.MutableRefObject<ForceGraphMethods<any, any> | undefined>}
                    width={width}
                    height={height}
                    backgroundColor="#0b1120"
                    graphData={graphData}
                    nodeId="id"
                    nodeLabel={(node) => {
                        const typed = node as GraphNode;
                        const detail = typed.detail ? `\n${typed.detail}` : '';
                        return `${typed.label ?? ''}${detail}`;
                    }}
                    nodeCanvasObject={renderNode}
                    nodePointerAreaPaint={paintPointer}
                    linkColor={(link) => (link as GraphLink).color ?? '#64748b'}
                    linkLabel={(link) => (link as GraphLink).relation}
                    linkDirectionalArrowLength={4}
                    linkWidth={() => 1.4}
                    linkDirectionalParticles={0}
                    autoPauseRedraw={false}
                    d3VelocityDecay={0.15}
                    onNodeHover={(node) => setHoveredNode((node as GraphNode) ?? null)}
                    onNodeClick={(node) => setSelectedNode(node as GraphNode)}
                    onBackgroundClick={() => setSelectedNode(null)}
                    onLinkHover={(link) => setHoveredLink((link as GraphLink) ?? null)}
                    enableNodeDrag={true}
                    showPointerCursor={(obj) => Boolean(obj)}
                />
            )}

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
                <div className="flex w-full justify-between items-start gap-3">
                    <div className="pointer-events-auto max-w-sm rounded-lg border border-border-color bg-background/95 p-4 shadow-lg">
                        {selectedNode ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="inline-block h-3 w-3 rounded-full"
                                        style={{ backgroundColor: NODE_META[selectedNode.type]?.color ?? '#94a3b8' }}
                                    ></span>
                                    <h3 className="text-sm font-semibold text-sky-200">{selectedNode.label}</h3>
                                </div>
                                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{NODE_META[selectedNode.type]?.label}</p>
                                {selectedNode.status && (
                                    <p className="mt-1 text-xs text-emerald-300">Status: {selectedNode.status}</p>
                                )}
                                <ul className="mt-2 space-y-1 text-xs text-slate-200">
                                    {formatDetail(selectedNode.detail).map((line) => (
                                        <li key={line} className="leading-relaxed">
                                            {line}
                                        </li>
                                    ))}
                                </ul>
                                {!selectedNode.detail && (
                                    <p className="mt-2 text-xs text-slate-400">No additional metadata for this node.</p>
                                )}
                            </>
                        ) : (
                            <div className="text-xs text-slate-400">
                                <p className="font-medium text-slate-200">Scaffold graph</p>
                                <p>Click a node to inspect its metadata. Use the controls on the right to refocus or export the graph.</p>
                            </div>
                        )}
                    </div>

                    <div className="pointer-events-auto flex gap-2">
                        <button
                            type="button"
                            onClick={handleFocus}
                            className="rounded-md border border-slate-600 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                        >
                            Re-center
                        </button>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="rounded-md border border-sky-500 bg-sky-600/80 px-3 py-1.5 text-xs font-semibold text-slate-50 transition hover:bg-sky-500"
                        >
                            Download PNG
                        </button>
                    </div>
                </div>

                <div className="pointer-events-auto flex flex-wrap gap-3">
                    <div className="rounded-lg border border-border-color bg-background/90 p-3 shadow">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Legend</p>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-200">
                            {Object.entries(NODE_META).map(([type, meta]) => (
                                <div key={type} className="flex items-center gap-2">
                                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }}></span>
                                    <div>
                                        <p className="font-medium text-slate-100">{meta.label}</p>
                                        <p className="text-[10px] text-slate-400">{meta.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {hoveredLink && (
                        <div className="rounded-lg border border-border-color bg-background/90 p-3 shadow">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Relationship</p>
                            <p className="mt-1 text-xs text-slate-200">{hoveredLink.relation}</p>
                            <p className="text-[11px] text-slate-400">
                                {resolveNodeLabel(hoveredLink.source)} → {resolveNodeLabel(hoveredLink.target)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScaffoldGraphView;
