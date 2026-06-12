import { StateGraph, START, END } from '@langchain/langgraph'
import { ChatGraphState } from './state.js'
import { guardNode } from './guard.js'
import { routerNode, guardRoute, agentRoute, ROUTE_NAMES } from './router.js'
import { refuseNode, makeAgentNode, formatNode, productDetailNode } from './nodes.js'

function buildGraph() {
  const workflow = new StateGraph(ChatGraphState)
    .addNode('guard', guardNode)
    .addNode('router', routerNode)
    .addNode('refuse', refuseNode)
    .addNode('format', formatNode)

  for (const route of ROUTE_NAMES) {
    const handler =
      route === 'product_detail' ? productDetailNode : makeAgentNode(route)
    workflow.addNode(route, handler)
  }

  workflow.addEdge(START, 'guard')
  workflow.addConditionalEdges('guard', guardRoute, {
    allow: 'router',
    refuse: 'refuse',
  })
  workflow.addConditionalEdges('router', agentRoute, {
    retrieval: 'retrieval',
    product_detail: 'product_detail',
    comparison: 'comparison',
    payment: 'payment',
    order_summary: 'order_summary',
    order_update: 'order_update',
    checkout: 'checkout',
    policies: 'policies',
    general: 'general',
  })

  workflow.addEdge('refuse', 'format')
  for (const route of ROUTE_NAMES) {
    workflow.addEdge(route, 'format')
  }
  workflow.addEdge('format', END)

  return workflow
}

let compiledGraph = null

export function getCompiledGraph() {
  if (!compiledGraph) {
    compiledGraph = buildGraph().compile()
  }
  return compiledGraph
}
