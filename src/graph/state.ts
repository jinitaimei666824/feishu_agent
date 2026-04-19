import { Annotation } from "@langchain/langgraph";
import type {
  RetrievalContext,
  TaskPlan,
  UserRequest,
  WriterInput,
  WriterOutput,
} from "../schemas/index.js";

export const ReportGraphState = Annotation.Root({
  userRequest: Annotation<UserRequest | null>({
    reducer: (_, right) => right,
    default: () => null,
  }),
  retrievalContext: Annotation<RetrievalContext | null>({
    reducer: (_, right) => right,
    default: () => null,
  }),
  taskPlan: Annotation<TaskPlan | null>({
    reducer: (_, right) => right,
    default: () => null,
  }),
  writerInput: Annotation<WriterInput | null>({
    reducer: (_, right) => right,
    default: () => null,
  }),
  writerOutput: Annotation<WriterOutput | null>({
    reducer: (_, right) => right,
    default: () => null,
  }),
  taskIntent: Annotation<string | null>({
    reducer: (_, right) => right,
    default: () => null,
  }),
  followUpQuestions: Annotation<string[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  reviewNotes: Annotation<string[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  debugTrace: Annotation<string[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
});

export type ReportGraphStateType = typeof ReportGraphState.State;
