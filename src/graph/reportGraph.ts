import { END, START, StateGraph } from "@langchain/langgraph";
import { analystNode } from "./nodes/analystNode.js";
import { buildWriterInput } from "./nodes/buildWriterInput.js";
import { formatOutput } from "./nodes/formatOutput.js";
import { intentNode } from "./nodes/intentNode.js";
import { parseUserRequest } from "./nodes/parseUserRequest.js";
import { plannerNode } from "./nodes/plannerNode.js";
import { retrieverNode } from "./nodes/retrieverNode.js";
import { reviewerNode } from "./nodes/reviewerNode.js";
import { writerNode } from "./nodes/writerNode.js";
import { ReportGraphState } from "./state.js";

export const reportGraph = new StateGraph(ReportGraphState)
  .addNode("parse_user_request", parseUserRequest)
  .addNode("intent_node", intentNode)
  .addNode("planner_node", plannerNode)
  .addNode("retriever_node", retrieverNode)
  .addNode("analyst_node", analystNode)
  .addNode("build_writer_input", buildWriterInput)
  .addNode("writer_node", writerNode)
  .addNode("reviewer_node", reviewerNode)
  .addNode("format_output", formatOutput)
  .addEdge(START, "parse_user_request")
  .addEdge("parse_user_request", "intent_node")
  .addEdge("intent_node", "planner_node")
  .addEdge("planner_node", "retriever_node")
  .addEdge("retriever_node", "analyst_node")
  .addEdge("analyst_node", "build_writer_input")
  .addEdge("build_writer_input", "writer_node")
  .addEdge("writer_node", "reviewer_node")
  .addEdge("reviewer_node", "format_output")
  .addEdge("format_output", END)
  .compile();
