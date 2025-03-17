// scroller.js
function handleStepEnter(response) {
    currentStep = response.index + 1;
    d3.selectAll(".step").classed("is-active", false);
    d3.select(response.element).classed("is-active", true);

    pauseAnimation();
    currentTimeIndex = 0;
    d3.select("#play-button").html('<i class="fas fa-play"></i> Play');
    d3.select("#time-slider").property("value", 0);
    d3.select("#time-display").text("Time: 0s");

    figure.transition()
        .duration(300)
        .attr("transform", "translate(0, 0)");

    updateVisualization(currentStep);

    const currentSectionId = d3.select(response.element).attr("id");
    if (["control", "condition1", "condition2", "condition3"].includes(currentSectionId)) {
        d3.select("#animation-controls").style("display", "flex");
    } else {
        d3.select("#animation-controls").style("display", "none");
    }
    

    if (d3.select(response.element).attr("id") !== "permutation-test") {
        d3.select(response.element).select(".line-graph").remove();
        const graphContainer = d3.select(response.element)
            .select(".content")
            .append("div")
            .attr("class", "line-graph")
            .style("margin", "20px auto");

            const conditionMap = { 
                1: "ECN", 
                2: "ECR", 
                3: "VRN", 
                4: "VRM" 
            };
            const condition = conditionMap[currentStep] || "ECN";
            renderLineGraph(condition, graphContainer);
            
    }

    if (currentStep === 3) {
        const container = d3.select("#permutation-test-container");

        if (container.select("#viz-container").empty()) {
            container.append("div")
                .attr("id", "viz-container");
        }

        if (container.select("#redo-permutation").empty()) {
            container.append("button")
                .attr("id", "redo-permutation")
                .style("display", "block")
                .style("margin", "20px auto")
                .style("padding", "8px 15px")
                .style("background", "#3498db")
                .style("color", "white")
                .style("border", "none")
                .style("border-radius", "4px")
                .style("cursor", "pointer")
                .text("Run New Permutation Test")
                .on("click", function() {
                    container.select("#viz-container").selectAll("*").remove();
                    runPermutationTest();
                });
        }

        if (container.select("#viz-container svg").empty()) {
            runPermutationTest();
        }
    }
}

function handleStepExit(response) {}
