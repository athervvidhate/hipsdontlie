// participantSelector.js
function setupParticipantSelector() {
    const selector = d3.select("#participantSelector").on("change", function () {
        selectedParticipant = +this.value;
        pauseAnimation();
        currentTimeIndex = 0;
        d3.select("#play-button").html('<i class="fas fa-play"></i> Play');
        d3.select("#time-slider").property("value", 0);
        d3.select("#time-display").text("Time: 0s");

        updateVisualization(currentStep);
        if (currentStep !== 3) {
            d3.select(".step.is-active").select(".line-graph").remove();
            const graphContainer = d3.select(".step.is-active").select(".content")
                                   .append("div")
                                   .attr("class", "line-graph")
                                   .style("margin", "20px auto");
            const condition = (currentStep === 2 ? "ECR" : "ECN");
            renderLineGraph(condition, graphContainer);
        }
    });
    for (let i = 1; i <= 28; i++) {
        selector.append("option").attr("value", i).text(`Participant ${i}`);
    }
}
