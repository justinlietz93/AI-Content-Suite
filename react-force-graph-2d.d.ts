declare module 'react-force-graph-2d' {
  import type { ComponentType } from 'react';

  export type NodeObject<NodeType = any> = NodeType & { [key: string]: any };
  export type LinkObject<NodeType = any, LinkType = any> = LinkType & {
    source: NodeObject<NodeType> | string | number;
    target: NodeObject<NodeType> | string | number;
  };
  export interface GraphData<NodeType = any, LinkType = any> {
    nodes: NodeObject<NodeType>[];
    links: LinkObject<NodeType, LinkType>[];
  }
  export interface ForceGraphMethods<NodeType = any, LinkType = any> {
    d3Force: (...args: any[]) => any;
    zoomToFit: (ms?: number, padding?: number) => void;
    centerAt: (x: number, y: number, ms?: number) => void;
  }

  const ForceGraph2D: ComponentType<any>;
  export default ForceGraph2D;
}
