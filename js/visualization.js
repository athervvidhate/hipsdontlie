// visualization.js
function setupVisualization() {
    const container = d3.select("#visualization");
    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const boxSize = 300;
    const boxYOffset = -22;

    g.append("rect")
        .attr("class", "boundary-box")
        .attr("x", -boxSize / 2)
        .attr("y", -boxSize / 2 + boxYOffset)
        .attr("width", boxSize)
        .attr("height", boxSize)
        .attr("rx", 5)
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");

    figure = g.append("g")
        .attr("class", "human-figure")
        .attr("transform", "translate(0, 0)")
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    // Figure body parts
    figure.append('circle').attr('cx', 0).attr('cy', -120).attr('r', 25).attr('fill', '#3498db');
    figure.append('rect').attr('x', -15).attr('y', -95).attr('width', 30).attr('height', 100).attr('fill', '#3498db');
    figure.append('line').attr('x1', -15).attr('y1', -70).attr('x2', -40).attr('y2', -30).attr('stroke', '#3498db').attr('stroke-width', 10);
    figure.append('line').attr('x1', 15).attr('y1', -70).attr('x2', 40).attr('y2', -30).attr('stroke', '#3498db').attr('stroke-width', 10);
    figure.append('line').attr('x1', -10).attr('y1', 5).attr('x2', -20).attr('y2', 100).attr('stroke', '#3498db').attr('stroke-width', 15);
    figure.append('line').attr('x1', 10).attr('y1', 5).attr('x2', 20).attr('y2', 100).attr('stroke', '#3498db').attr('stroke-width', 15);
}


function updateVisualization(step) {
    const conditionMap = { 
        1: "ECN", 
        2: "ECR", 
        3: "VRN", 
        4: "VRM" 
    };
    const condition = conditionMap[step] || "ECN";
    
    if (!swayData[condition][selectedParticipant]) return;
    
    currentTimeIndex = 0;
    
    figure.transition()
        .duration(300)
        .attr("transform", "translate(0, 0)");
    
    const participantData = swayData[condition][selectedParticipant];
    if (participantData && participantData.length > 0) {
        const maxSeconds = 60;
        const fps = 30;
        d3.select("#time-slider")
            .property("max", maxSeconds * fps)
            .property("value", 0);
    }
}
