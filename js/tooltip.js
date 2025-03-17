// tooltip.js
function createTooltip() {
    return d3.select("body").append("div")
        .attr("id", "tooltip")
        .classed("tooltip", true)
        .classed("hidden", true)
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("z-index", 1000)
        .style("display", "none");
}


function updateTooltip(condition, dataPoint) {
    if (!dataPoint) return;
    
    const tooltipContent = `
        <div class="tooltip-title" style="color: white;">Participant ${selectedParticipant}</div>
        <div class="tooltip-stat"><span class="tooltip-label">Condition:</span><span>${condition}</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">Time:</span><span>${dataPoint.time.toFixed(0)}s</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPx:</span><span>${dataPoint.copX.toFixed(3)}m</span></div>
        <div class="tooltip-stat"><span class="tooltip-label">COPy:</span><span>${dataPoint.copY.toFixed(3)}m</span></div>`;
    
    tooltip.html(tooltipContent)
           .classed("hidden", false)
           .classed("visible", true)
           .style("opacity", 1)
           .style("display", "block");
    
    console.log("Tooltip updated with:", {
        participant: selectedParticipant,
        condition: condition,
        time: dataPoint.time,
        copX: dataPoint.copX,
        copY: dataPoint.copY
    });
}

function moveTooltip(event) {
    if (!tooltipVisible) return;
    
    tooltip.style("left", `${event.pageX + 15}px`)
           .style("top", `${event.pageY - 10}px`)
           .style("opacity", 1)
           .style("display", "block");
}

function showTooltip(event) {
    tooltipVisible = true;
    
    tooltip.classed("hidden", false)
           .classed("visible", true)
           .style("opacity", 1)
           .style("display", "block")
           .style("position", "absolute")
           .style("z-index", 1000);
    
    const condition = currentStep === 1 ? "ECN" : currentStep === 2 ? "ECR" : currentStep === 3 ? "VRN" : currentStep === 4 ? "VRM" : "ECN";
    const participantData = swayData[condition][selectedParticipant];
    
    if (participantData && participantData.length > 0) {
        const fps = 30;
        const currentTime = currentTimeIndex / fps;
        const dataPoint = findDataPointByTime(participantData, currentTime);
        
        if (dataPoint) {
            updateTooltip(condition, dataPoint);
        }
    }
    
    moveTooltip(event);
}

function hideTooltip() {
    tooltipVisible = false;
    tooltip
        .classed("hidden", true)
        .classed("visible", false)
        .style("opacity", 0)
        .style("display", "none");
}