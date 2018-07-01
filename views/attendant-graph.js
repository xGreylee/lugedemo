function graphApp() {
    // global variables
    const svgElem = document.getElementById('canvas')
    let width = svgElem.clientWidth;
    let height = svgElem.clientHeight;
    let centerX = width * 0.5;
    let centerY = height * 0.5;

    let simulationStarted = false;
    let started = false;
    let simulation = null;

    // d3 selections and plugins
    const svg = d3.select('#canvas');
    // const scaleColor = d3.scaleOrdinal(d3.schemeCategory20);
    const forceCollide = d3.forceCollide(d => d.r + 3);

    return { 
        init,
        updateData,
        get started() {
            return started;
        }
    }

    function init(data) {
        const nodes = prepareData(data);
        simulation = initSimulation(nodes);
        defineNodeSelection(nodes, simulation);

        heartbeatInterval(simulation);
        updateOnResize(svg, simulation);

        started = true;
    }

    function updateData(data) {
        const oldData = svg.selectAll('.node').data()
        const newData = prepareData(data).slice(oldData.length)
        if (newData.length) {
            const newRadius = newData[0].oRadius
            oldData.forEach(node => node.r = node.oRadius = newRadius)
            newData.forEach(node => {
                node.x = centerX
                node.y = centerY
            })
            const nodes = oldData.concat(newData);

            simulation.nodes(nodes);
            defineNodeSelection(nodes, simulation);
            simulation.alpha(1).restart();
        }
    }

    function prepareData(rawData) {
        // use pack to calculate radius of the circle
        const pack = d3.pack()
            .size([width * 1, height * 1])
            .padding(1.5)


        const root = d3.hierarchy({ children: rawData })
            .sum(d => d.uid)

        // we use pack() to automatically calculate radius conveniently only
        // and get only the leaves
        // root
        return pack(root).leaves().map(node => {
            const data = node.data;
            return {
                x: centerX + (node.x - centerX) * 3, // magnify start position to have transition to center movement
                y: centerY + (node.y - centerY) * 3,
                r: 0, // for tweening
                oRadius: node.r, // original radius
                iRadius: node.r + 2, // image radius, 2 for some approximation problem
                id: data.uid,
                name: data.name,
                avatar: data.avatar,
            };
        });
    }

    function initSimulation(data) {
        // use the force
        const simulation = d3.forceSimulation()
            .force('charge', d3.forceManyBody().strength(400))
            .force('collide', forceCollide)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('centrifugal', forceCentrifugal(0.1, centerX, centerY))
        
        simulationStarted = true;
        simulation.nodes(data).on('tick', ticked);

        return simulation;

        function ticked() {
            // update the circle and image position each tick, to provide a bounded area for the nodes
            svg.selectAll('.node').select('circle')
                .attr("cx", function(d) { return d.x = Math.max(d.r, Math.min(width - d.r, d.x)); })
                .attr("cy", function(d) { return d.y = Math.max(d.r, Math.min(height - d.r, d.y)); })
                .attr('r', d => d.r)
            
            svg.selectAll('.node').select('image')
                // there exists diff for d.r and d.iRadius
                .attr('x', d => d.x - d.r - (d.iRadius - d.r))
                .attr('y', d => d.y - d.r - (d.iRadius - d.r))
        }
        
        // make the node rotate around the input center coordinate
        function forceCentrifugal(degree, cx, cy) {
            let nodes

            function force(alpha) {
                if (alpha < 0.1) {
                    return
                }
                nodes.forEach(function (node) {
                    const [cfx, cfy] = rotate(cx, cy, node.x, node.y, degree)
                    node.x += cfx
                    node.y += cfy
                })
            }
            
            force.initialize = function (_) {
                nodes = _
            }

            return force
        }

        // thanks https://stackoverflow.com/questions/17410809/how-to-calculate-rotation-in-2d-in-javascript
        function rotate(cx, cy, x, y, angle) {
            const radians = (Math.PI / 180) * angle,
                cos = Math.cos(radians),
                sin = Math.sin(radians),
                nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
                ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
            return [nx - x, ny - y];
        }

    }

    function defineNodeSelection(data, simulation) {
        const nodeUpdate = svg.selectAll('.node')
            .data(data, d => d.id)
            
        const nodeEnter = nodeUpdate.enter().append('g')
                .attr('class', 'node')
            .call(d3.drag()
                .on('start', (d) => {
                    if (!d3.event.active) simulation.alphaTarget(0.1).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (d) => {
                    d.fx = d3.event.x;
                    d.fy = d3.event.y;
                })
                .on('end', (d) => {
                    if (!d3.event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }))

        applyTooltip(nodeEnter);

        nodeEnter.append('circle')
                .attr('id', d => d.id)
                .attr('r', 0)
                .style('fill-opacity', 0)
                .style("stroke", d => `rgb(${str2rgb(d.name)})`)
                .style("stroke-width", 2)
                .style("stroke-location", 'inside')
                .transition().duration(2000).ease(d3.easeExpInOut)
                .tween('circleIn', (d) => {
                    const i = d3.interpolateNumber(0, d.oRadius);
                    return (t) => {
                        d.r = i(t);
                        simulation.force('collide', forceCollide);
                    }
                })

        nodeEnter.append('clipPath')
                .attr('id', d => `clip-${d.id}`)
            .append('use')
                .attr('xlink:href', d => `#${d.id}`)

        // display image as circle icon
        nodeEnter.append('image')
            .classed('node-icon', true)
            .attr('clip-path', d => `url(#clip-${d.id})`)
            .attr('xlink:href', d => d.avatar)

        const nodeEnterUpdate = nodeEnter.merge(nodeUpdate);
        
        // update the image size whenever data change
        nodeEnterUpdate.select('image')
            .attr('x', d => d.x - d.iRadius )
            .attr('y', d => d.y - d.iRadius )
            .attr('height', d => d.iRadius * 2)
            .attr('width', d => d.iRadius * 2)

        nodeUpdate.exit().remove();
    }

    function str2rgb(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = [];
        for (var i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour.push(value);
        }
        return colour;
    }

    // a tiny heartbeat effect, repel or attract the node as time changes
    function heartbeatInterval(simulation) {
        let count = 0
        d3.interval(() => {
            if (!simulationStarted) {
                return
            }
            let ste = count
            simulation.force('charge').strength(ste)
            count--
            if (count === 0 || count === -5) {
                count = -count
            }
            simulation.alpha(0.5).restart();
        }, 500)
    }

    function updateOnResize(svg, simulation) {
        // update size-related forces
        d3.select(window).on('resize', resizeHandler);
        d3.select(document).on('fullscreenchange', resizeHandler)

        function resizeHandler() {
            width = +svg.node().getBoundingClientRect().width;
            height = +svg.node().getBoundingClientRect().height;
            centerX = width / 2
            centerY = height / 2
            updateForces();
        }

        function updateForces() {
            simulation.force('center')
                .x(width / 2)
                .y(height / 2);

            // updates ignored until this is run
            // restarts the simulation (important if simulation has already slowed down)
            simulation.alpha(1).restart();
        }
    }

    function applyTooltip(target) {
        const tip = d3.tip().attr('class', 'd3-tip')
            .html(function(d) { return `<span class="attendant-name">${d.name}</span>`; });

        svg.call(tip);

        target.on('mouseover', function () {
                simulation.stop()
                simulationStarted = false;
                tip.show.apply(this, arguments)
            })
            .on('mouseleave', function () {
                simulation.restart()
                simulationStarted = true;
                tip.hide.apply(this, arguments)
            });     
    }
}
