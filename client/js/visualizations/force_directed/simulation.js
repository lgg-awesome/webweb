import * as d3 from 'd3'
import * as shapes from '../../shapes'

export class Simulation {
  constructor(settings, nodes, links, previousNodePositions={}) {
    this.settings = settings
    this.nodes = this.createNodes(nodes, previousNodePositions)
    this.links = this.createLinks(links)
    this.isFrozen = false

    this.simulation = d3.forceSimulation(this.nodes)
    this.simulation.alphaDecay = 0.001
  }

  /*
   * previousNodePositions is a dictionary where:
   * - keys are node names
   * - values are node positions
    * */
  createNodes(rawNodes, previousNodePositions) {
    let nodes = []
    for (let [i, rawNode] of Object.entries(rawNodes)) {
      const node = new shapes.Circle()
      const previousPosition = previousNodePositions[rawNode.name] || {}
      Object.entries(previousPosition).forEach(([key, value]) => node[key] = value)
      Object.entries(rawNode).forEach(([key, value]) => node[key] = value)
      nodes.push(node)
    }

    return nodes
  }

  /* nodes persist between layers (for the simulation's sake), so when the
   * network changes:
   * - reset the node metadata
   *    - save those nodes' x/y positions under their name, for later layer-coherence
   * - for all the nodes in the layer metadata, use the nodeNameToIdMap to set
   *   corresponding node's values
   * - for any node in the old network that also exists in the new one:
   *    - set that new node's x/y positions to the old one's
    * */
  get nodePositions() {
    let nodePositions = {}
    for (let node of this.nodes) {
      nodePositions[node.name] = {
        'x': node.x,
        'y': node.y,
        'fx': node.fx,
        'fy': node.fy,
        'vx': node.vx,
        'vy': node.vy,
      }
    }

    return nodePositions
  }

  createLinks(links) {
    return links.map(link => {
      return {
        'source': this.nodes[link.source],
        'target': this.nodes[link.target],
        'weight': link.weight,
      }
    })
  }

  get forces() {
    return {
      "center" : () => {
        return d3.forceCenter(0)
      },
      "gravity-x" : () => {
        return d3.forceX(0).strength(this.settings.gravity)
      },
      "gravity-y" : () => {
        return d3.forceY(0).strength(this.settings.gravity)
      },
      "charge" : () => {
        return d3.forceManyBody().strength(-this.settings.charge)
      },
      "link" : () => {
        return d3.forceLink()
          .links(this.links)
          .distance(this.settings.linkLength)
          .strength(this.settings.linkStrength)
      },
    }
  }

  get isStable() {
    return this.simulation.alpha() < .05 || this.isFrozen
  }

  update(settings) { 
    if (this.settings !== undefined) {
      this.settings = settings
    }
    let forcesToUpdate = Object.keys(this.forces)

    for (let [forceName, forceFunction] of Object.entries(this.forces)) {
      try {
        this.simulation.force(forceName, forceFunction.call(this))
      } catch(error) {
        continue
      }
    }

    this.simulation.alpha(1).restart()
  }

  freeze() {
    this.simulation.stop()
    this.isFrozen = true
    this.nodes.forEach(node => {
      node.fx = node.x
      node.fy = node.y
    })
  }

  unfreeze() {
    this.isFrozen = false
    this.nodes.forEach(node => {
      node.fx = undefined
      node.fy = undefined
    })

    this.simulation.alpha(.5).restart()
  }
}