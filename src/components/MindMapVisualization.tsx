import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

interface MindMapVisualizationProps {
  data: MindMapNode;
}

const MindMapVisualization = ({ data }: MindMapVisualizationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 800;
    const height = 600;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Create tree layout
    const treeLayout = d3.tree<MindMapNode>().size([height - 100, width - 200]);

    const root = d3.hierarchy(data);
    const treeData = treeLayout(root);

    // Create links
    svg
      .selectAll(".link")
      .data(treeData.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--primary))")
      .attr("stroke-width", 2)
      .attr("d", d3.linkHorizontal<any, any>()
        .x(d => d.y + 100)
        .y(d => d.x + 50)
      );

    // Create nodes
    const nodes = svg
      .selectAll(".node")
      .data(treeData.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y + 100},${d.x + 50})`);

    // Add circles to nodes
    nodes
      .append("circle")
      .attr("r", 8)
      .attr("fill", "hsl(var(--primary))")
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 2);

    // Add text labels
    nodes
      .append("text")
      .attr("dy", -15)
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--foreground))")
      .attr("font-size", "12px")
      .text(d => d.data.name);

  }, [data]);

  return (
    <div className="w-full overflow-x-auto bg-card rounded-lg border border-border p-4">
      <svg ref={svgRef} className="mx-auto" />
    </div>
  );
};

export default MindMapVisualization;
